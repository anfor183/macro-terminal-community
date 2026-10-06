"""Live Real-Time Orchestrator and Background Polling Daemon.

Coordinates live ingestion across Yahoo Finance (prices/yields), ForexFactory (economic calendar),
and RSS news wires (Fed, ECB, BoE, Yahoo Finance, MarketWatch).
Maintains live operational state, recalculates fundamental biases dynamically, and manages the background scheduler.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import AsyncSessionLocal
from backend.app.core.constants import score_to_bias
from backend.app.models.entities import Asset, Currency, CentralBank, EconomicIndicator, EconomicRelease
from backend.app.models.intelligence import NewsEvent
from backend.app.models.scoring import MacroScore, BiasSnapshot, BiasChange
from backend.app.ingestion.live_market_data import LiveMarketDataCollector
from backend.app.ingestion.live_calendar import LiveEconomicCalendarIngestor
from backend.app.ingestion.live_news_manager import LiveNewsManager, LIVE_RSS_FEEDS
from backend.app.ingestion.live_cot_data import LiveCOTManager
from backend.app.scoring.currency_model import calculate_forex_pair_score
from backend.app.scoring.cross_asset import evaluate_gold_macro_drivers, evaluate_oil_macro_drivers
from backend.app.engine.forward_test_tracker import ForwardTestTracker
from backend.app.engine.vps_governor import vps_governor

logger = logging.getLogger(__name__)


class LiveOrchestrator:
    """Master controller for continuous live data ingestion and bias recalculation."""

    def __init__(self):
        self.is_running: bool = False
        self.last_price_sync: Optional[datetime] = None
        self.last_calendar_sync: Optional[datetime] = None
        self.last_news_sync: Optional[datetime] = None
        self.last_cot_sync: Optional[datetime] = None
        self.total_price_updates: int = 0
        self.total_calendar_events: int = 0
        self.total_news_events: int = 0
        self.total_cot_updates: int = 0
        self.last_error: Optional[str] = None
        self._stop_event = asyncio.Event()

    def get_status(self) -> Dict[str, Any]:
        """Return the current operational status of the live ingestion system."""
        now = datetime.now(timezone.utc)
        return {
            "is_active": self.is_running,
            "status": "OPERATIONAL" if self.is_running else "IDLE",
            "last_price_sync": self.last_price_sync.isoformat() if self.last_price_sync else None,
            "last_calendar_sync": self.last_calendar_sync.isoformat() if self.last_calendar_sync else None,
            "last_news_sync": self.last_news_sync.isoformat() if self.last_news_sync else None,
            "last_cot_sync": self.last_cot_sync.isoformat() if self.last_cot_sync else None,
            "total_price_updates": self.total_price_updates,
            "total_calendar_events": self.total_calendar_events,
            "total_news_events": self.total_news_events,
            "total_cot_updates": self.total_cot_updates,
            "last_error": self.last_error,
            "providers_monitored": len(LIVE_RSS_FEEDS) + 3, # RSS + Yahoo Finance + ForexFactory + CFTC COT
            "cost": "100% Free / Zero Paid Subscriptions",
            "vps_governor": vps_governor.get_telemetry()["vps_governor"],
            "timestamp": now.isoformat(),
        }

    async def sync_cot_positioning(self) -> int:
        """Fetch and parse live weekly CFTC Commitments of Traders report."""
        try:
            count = await LiveCOTManager.refresh_from_cftc()
            self.total_cot_updates += count
            self.last_cot_sync = datetime.now(timezone.utc)
            return count
        except Exception as exc:
            self.last_error = f"COT sync error: {exc}"
            logger.error(self.last_error)
            return 0

    async def sync_market_prices(self, session: AsyncSession) -> int:
        """Fetch and update live asset prices."""
        try:
            count = await LiveMarketDataCollector.update_database_prices(session)
            self.total_price_updates += count
            self.last_price_sync = datetime.now(timezone.utc)

            # Update open forward test positions with latest prices
            try:
                stmt = select(Asset)
                res = await session.execute(stmt)
                all_assets = res.scalars().all()
                price_map = {a.symbol.upper(): (a.current_price or 0.0) for a in all_assets}
                ForwardTestTracker.update_prices(price_map)
            except Exception as ft_exc:
                logger.debug(f"Forward test price update skipped: {ft_exc}")

            return count
        except Exception as exc:
            self.last_error = f"Price sync error: {exc}"
            logger.error(self.last_error)
            return 0

    async def sync_economic_calendar(self, session: AsyncSession) -> Dict[str, Any]:
        """Fetch and update live economic calendar releases and surprise metrics."""
        try:
            res = await LiveEconomicCalendarIngestor.sync_calendar_releases(session)
            synced = res.get("synced_count", 0)
            self.total_calendar_events += synced
            self.last_calendar_sync = datetime.now(timezone.utc)
            return res
        except Exception as exc:
            self.last_error = f"Calendar sync error: {exc}"
            logger.error(self.last_error)
            return {"status": "ERROR", "error": str(exc)}

    async def sync_macro_news(self, session: AsyncSession) -> Dict[str, Any]:
        """Fetch and deduplicate breaking macro news from verified public RSS feeds."""
        try:
            res = await LiveNewsManager.sync_live_news(session)
            new_cnt = res.get("new_inserted", 0)
            self.total_news_events += new_cnt
            self.last_news_sync = datetime.now(timezone.utc)
            return res
        except Exception as exc:
            self.last_error = f"News sync error: {exc}"
            logger.error(self.last_error)
            return {"status": "ERROR", "error": str(exc)}

    async def recalculate_asset_biases(self, session: AsyncSession) -> int:
        """
        Recalculates currency relative values and asset scores dynamically based on:
        1. Central Bank policy rate & guidance stances
        2. Exponential time-decayed Economic Calendar surprises (CPI, NFP, GDP, PMIs)
        3. Real-time sovereign bond yield momentum (US 10Y/2Y yields)
        4. Macro-filtered news sentiment momentum
        5. Intermarket cross-asset transmission (Gold, Oil, Equities)
        """
        try:
            now = datetime.now(timezone.utc)

            # 1. Fetch Central Banks
            cb_res = await session.execute(select(CentralBank))
            cbs = {cb.currency: cb for cb in cb_res.scalars().all()}

            # 2. Fetch Currencies
            curr_res = await session.execute(select(Currency))
            currencies = {c.code: c for c in curr_res.scalars().all()}

            # 3. Process time-decayed economic calendar surprises
            rel_stmt = (
                select(EconomicRelease, EconomicIndicator)
                .join(EconomicIndicator, EconomicRelease.indicator_id == EconomicIndicator.id)
                .where(EconomicRelease.actual.isnot(None))
                .order_by(EconomicRelease.event_time.desc())
            )
            rel_res = await session.execute(rel_stmt)
            rel_rows = rel_res.all()

            currency_surprises: Dict[str, float] = {}
            for rel, ind in rel_rows:
                event_dt = rel.event_time
                if event_dt.tzinfo is None:
                    event_dt = event_dt.replace(tzinfo=timezone.utc)
                age_days = max(0.0, (now - event_dt).total_seconds() / 86400.0)
                if age_days <= 28.0:
                    half_life = ind.default_half_life_days or 14.0
                    decay = 0.5 ** (age_days / half_life)
                    if rel.surprise_zscore is not None:
                        mult = 12.0 if ind.importance in ("Critical", "High") else 6.0
                        impulse = max(-30.0, min(30.0, rel.surprise_zscore * mult)) * decay
                        currency_surprises[ind.currency] = currency_surprises.get(ind.currency, 0.0) + impulse

            # 4. Process macro news sentiment from verified feeds in the last 48 hours
            news_res = await session.execute(
                select(NewsEvent)
                .where(NewsEvent.macro_category.in_(["inflation", "monetary_policy", "labor", "growth", "yields"]))
                .order_by(NewsEvent.published_at.desc())
                .limit(40)
            )
            recent_news = news_res.scalars().all()
            currency_news_tilt: Dict[str, float] = {}
            for n in recent_news:
                pub_dt = n.published_at
                if pub_dt.tzinfo is None:
                    pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                n_age_days = max(0.0, (now - pub_dt).total_seconds() / 86400.0)
                if n_age_days <= 2.0:
                    n_decay = 0.5 ** (n_age_days / 1.0)
                    for code, curr in currencies.items():
                        if f" {code} " in f" {n.title} " or f" {curr.name.lower()} " in n.title.lower():
                            tilt = 1.0 if n.direction == "bullish" else (-1.0 if n.direction == "bearish" else 0.0)
                            currency_news_tilt[code] = currency_news_tilt.get(code, 0.0) + (tilt * n_decay)

            # 5. Compute dynamic currency scores
            stance_weights = {
                "Hawkish": 25.0,
                "Neutral": 0.0,
                "Dovish": -22.0,
                "Accommodative": -18.0,
            }
            for code, curr in currencies.items():
                cb = cbs.get(code)
                base_val = stance_weights.get(cb.guidance_stance, 0.0) if cb else curr.current_score
                carry_val = max(-20.0, min(20.0, (cb.current_rate - 3.0) * 3.5)) if cb else 0.0
                surp_val = max(-40.0, min(40.0, currency_surprises.get(code, 0.0)))
                news_val = max(-15.0, min(15.0, currency_news_tilt.get(code, 0.0)))

                synthesized = round(base_val + carry_val + surp_val + news_val, 1)
                curr.current_score = max(-100.0, min(100.0, synthesized))
                curr.updated_at = now

                # Synchronize policy & growth direction with central bank guidance and dynamic score
                if cb:
                    if cb.guidance_stance in ("Dovish", "Accommodative") or (cb.expected_next_rate and cb.expected_next_rate < cb.current_rate):
                        curr.policy_direction = "Easing"
                    elif cb.guidance_stance == "Hawkish" or (cb.expected_next_rate and cb.expected_next_rate > cb.current_rate):
                        curr.policy_direction = "Tightening"
                    elif curr.current_score > 20.0:
                        curr.policy_direction = "Tightening"
                    elif curr.current_score < -15.0:
                        curr.policy_direction = "Easing"
                    else:
                        curr.policy_direction = "Paused"
                else:
                    curr.policy_direction = "Tightening" if curr.current_score > 20.0 else ("Easing" if curr.current_score < -15.0 else "Paused")

                curr.growth_direction = "Accelerating" if curr.current_score > 5.0 else ("Slowing" if curr.current_score < -15.0 else "Stable")

            # 6. Fetch all assets and update scores & biases
            asset_res = await session.execute(select(Asset))
            assets = asset_res.scalars().all()
            updated = 0

            # Find US 10Y sovereign yield movement
            us10y_asset = next((a for a in assets if a.symbol == "US10Y"), None)
            us10y_move = us10y_asset.daily_change_pct if us10y_asset else 0.0

            for asset in assets:
                if asset.asset_class == "forex" and asset.base_currency and asset.quote_currency:
                    base_c = currencies.get(asset.base_currency)
                    quote_c = currencies.get(asset.quote_currency)
                    if base_c and quote_c:
                        # Yield differential contribution
                        if asset.quote_currency == "USD":
                            yield_diff = -max(-30.0, min(30.0, us10y_move * 5.0))
                        elif asset.base_currency == "USD":
                            yield_diff = max(-30.0, min(30.0, us10y_move * 5.0))
                        else:
                            yield_diff = 0.0

                        # Recalculate pair score
                        new_score = calculate_forex_pair_score(
                            base_currency_score=base_c.current_score,
                            quote_currency_score=quote_c.current_score,
                            yield_differential_score=yield_diff,
                        )
                        new_bias = score_to_bias(new_score)
                        confidence = round(min(95.0, max(68.0, 72.0 + abs(new_score) * 0.16)), 1)

                        # Update latest MacroScore if present
                        score_query = await session.execute(
                            select(MacroScore)
                            .where(MacroScore.asset_id == asset.id)
                            .order_by(MacroScore.timestamp.desc())
                            .limit(1)
                        )
                        macro_score = score_query.scalars().first()
                        if macro_score:
                            macro_score.tactical_score = new_score
                            macro_score.timestamp = now

                        # Update latest BiasSnapshot if present
                        bias_query = await session.execute(
                            select(BiasSnapshot)
                            .where(BiasSnapshot.asset_id == asset.id)
                            .order_by(BiasSnapshot.timestamp.desc())
                            .limit(1)
                        )
                        bias_snapshot = bias_query.scalars().first()
                        if bias_snapshot:
                            prev_bias = bias_snapshot.tactical_bias
                            prev_score = bias_snapshot.score or 0.0

                            bias_changed = (prev_bias != new_bias)
                            score_shifted = (abs(new_score - prev_score) >= 1.0)

                            if bias_changed or score_shifted:
                                if abs(yield_diff) >= 6.0:
                                    prim_driver = f"US Treasury yield transmission ({us10y_move:+.2f}%) shifts rate spread"
                                elif abs(currency_surprises.get(asset.base_currency, 0.0)) >= 6.0:
                                    prim_driver = f"Economic surprise repricing across {asset.base_currency} releases"
                                elif abs(currency_surprises.get(asset.quote_currency, 0.0)) >= 6.0:
                                    prim_driver = f"Economic surprise repricing across {asset.quote_currency} releases"
                                else:
                                    cb_b = cbs.get(asset.base_currency)
                                    cb_q = cbs.get(asset.quote_currency)
                                    b_st = cb_b.guidance_stance if cb_b else "Neutral"
                                    q_st = cb_q.guidance_stance if cb_q else "Neutral"
                                    prim_driver = f"Central bank guidance alignment: {asset.base_currency} ({b_st}) vs {asset.quote_currency} ({q_st})"

                                bc = BiasChange(
                                    asset_id=asset.id,
                                    timestamp=now,
                                    previous_bias=prev_bias,
                                    new_bias=new_bias,
                                    previous_score=prev_score,
                                    new_score=new_score,
                                    primary_driver=prim_driver,
                                    secondary_driver=f"Relative currency momentum ({base_c.code}: {base_c.current_score:+.1f}, {quote_c.code}: {quote_c.current_score:+.1f})",
                                    confidence=confidence,
                                )
                                session.add(bc)

                            bias_snapshot.score = new_score
                            bias_snapshot.tactical_bias = new_bias
                            bias_snapshot.confidence = confidence
                            bias_snapshot.timestamp = now

                        asset.updated_at = now
                        updated += 1

                elif asset.symbol == "XAUUSD":
                    usd_c = currencies.get("USD")
                    usd_sc = usd_c.current_score if usd_c else 0.0
                    gold_eval = evaluate_gold_macro_drivers(
                        usd_score=usd_sc,
                        us_real_yield_bps=182.0 + (us10y_move * 4.0),
                    )
                    g_score = gold_eval["gold_macro_score"]
                    g_bias = score_to_bias(g_score)

                    bias_query = await session.execute(
                        select(BiasSnapshot).where(BiasSnapshot.asset_id == asset.id).order_by(BiasSnapshot.timestamp.desc()).limit(1)
                    )
                    b_snap = bias_query.scalars().first()
                    if b_snap:
                        if b_snap.tactical_bias != g_bias or abs((b_snap.score or 0.0) - g_score) >= 1.0:
                            session.add(BiasChange(
                                asset_id=asset.id,
                                timestamp=now,
                                previous_bias=b_snap.tactical_bias,
                                new_bias=g_bias,
                                previous_score=b_snap.score or 0.0,
                                new_score=g_score,
                                primary_driver=gold_eval["primary_driver"],
                                secondary_driver=f"USD momentum: {usd_sc:+.1f}, 10Y yield move: {us10y_move:+.2f}%",
                                confidence=85.0,
                            ))
                        b_snap.score = g_score
                        b_snap.tactical_bias = g_bias
                        b_snap.timestamp = now
                    asset.updated_at = now
                    updated += 1

                elif asset.symbol in ("CL", "BZ"):
                    oil_eval = evaluate_oil_macro_drivers()
                    o_score = oil_eval["oil_macro_score"]
                    o_bias = score_to_bias(o_score)
                    bias_query = await session.execute(
                        select(BiasSnapshot).where(BiasSnapshot.asset_id == asset.id).order_by(BiasSnapshot.timestamp.desc()).limit(1)
                    )
                    b_snap = bias_query.scalars().first()
                    if b_snap:
                        if b_snap.tactical_bias != o_bias or abs((b_snap.score or 0.0) - o_score) >= 1.0:
                            session.add(BiasChange(
                                asset_id=asset.id,
                                timestamp=now,
                                previous_bias=b_snap.tactical_bias,
                                new_bias=o_bias,
                                previous_score=b_snap.score or 0.0,
                                new_score=o_score,
                                primary_driver=oil_eval["primary_driver"],
                                secondary_driver="Global manufacturing demand vs OPEC+ quota discipline",
                                confidence=80.0,
                            ))
                        b_snap.score = o_score
                        b_snap.tactical_bias = o_bias
                        b_snap.timestamp = now
                    asset.updated_at = now
                    updated += 1

            await session.commit()
            return updated
        except Exception as exc:
            logger.error(f"Error recalculating biases: {exc}")
            return 0

    async def run_full_sync(self) -> Dict[str, Any]:
        """Execute a complete synchronized update across all live data sources."""
        async with AsyncSessionLocal() as session:
            prices_updated = await self.sync_market_prices(session)
            cal_result = await self.sync_economic_calendar(session)
            news_result = await self.sync_macro_news(session)
            biases_recalculated = await self.recalculate_asset_biases(session)
            cot_synced = await self.sync_cot_positioning()

        return {
            "status": "COMPLETED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "prices_updated": prices_updated,
            "calendar_events_synced": cal_result.get("synced_count", 0),
            "surprises_calculated": cal_result.get("surprises_calculated", 0),
            "new_news_events": news_result.get("new_inserted", 0),
            "assets_recalculated": biases_recalculated,
            "cftc_cot_synced": cot_synced,
        }

    async def start_background_scheduler(
        self,
        price_interval_sec: int = 60,
        calendar_interval_sec: int = 600,
        news_interval_sec: int = 180,
        cot_interval_sec: int = 3600,
    ):
        """
        Continuous background polling daemon running in FastAPI lifecycle.
        Non-blocking, gracefully cancellable on app shutdown.
        """
        self.is_running = True
        self._stop_event.clear()
        logger.info(
            f"Live Ingestion Background Scheduler started. "
            f"Intervals: Prices={price_interval_sec}s, Calendar={calendar_interval_sec}s, News={news_interval_sec}s, COT={cot_interval_sec}s"
        )

        # Yield control first so FastAPI startup completes instantly
        await asyncio.sleep(1.5)
        try:
            logger.info("Executing initial live data sync in background...")
            await self.run_full_sync()
        except Exception as exc:
            logger.warning(f"Initial live sync warning: {exc}")

        last_price_run = 0.0
        last_cal_run = 0.0
        last_news_run = 0.0
        last_cot_run = 0.0

        loop = asyncio.get_event_loop()
        last_governor_check = 0.0

        while not self._stop_event.is_set():
            now_mono = loop.time()

            # Dynamic adaptive intervals governed by VPS resource engine (Active vs Eco Mode)
            eff_price_int, eff_cal_int, eff_news_int, eff_cot_int = (
                vps_governor.get_effective_polling_intervals(
                    price_interval_sec, calendar_interval_sec, news_interval_sec, cot_interval_sec
                )
            )

            try:
                # 0. Periodic VPS Governor Check (every 15s)
                if now_mono - last_governor_check >= 15.0:
                    async with AsyncSessionLocal() as session:
                        await vps_governor.periodic_check(session)
                    last_governor_check = now_mono

                # 1. Price polling
                if now_mono - last_price_run >= eff_price_int:
                    async with AsyncSessionLocal() as session:
                        await self.sync_market_prices(session)
                    last_price_run = now_mono

                # 2. Calendar polling
                if now_mono - last_cal_run >= eff_cal_int:
                    async with AsyncSessionLocal() as session:
                        await self.sync_economic_calendar(session)
                    last_cal_run = now_mono

                # 3. News polling & bias recalculation
                if now_mono - last_news_run >= eff_news_int:
                    async with AsyncSessionLocal() as session:
                        await self.sync_macro_news(session)
                        await self.recalculate_asset_biases(session)
                    last_news_run = now_mono

                # 4. Weekly CFTC Commitments of Traders polling
                if now_mono - last_cot_run >= eff_cot_int:
                    await self.sync_cot_positioning()
                    last_cot_run = now_mono

            except asyncio.CancelledError:
                break
            except Exception as exc:
                self.last_error = f"Scheduler iteration error: {exc}"
                logger.error(self.last_error)

            # Sleep 1.5 second before checking next tick, allows clean cancellation & saves CPU
            try:
                await asyncio.sleep(1.5)
            except asyncio.CancelledError:
                break

        self.is_running = False
        logger.info("Live Ingestion Background Scheduler stopped.")

    def stop_background_scheduler(self):
        """Signal background scheduler to stop."""
        self._stop_event.set()
        self.is_running = False


# Global singleton orchestrator
live_orchestrator = LiveOrchestrator()
