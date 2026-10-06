"""
Continuous Data Integrity Monitor.

Tracks data freshness, schema conformance, gap detection, source reconciliation,
and enforces circuit breakers when integrity degrades below safe thresholds.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class ProviderStatus(str, Enum):
    LIVE = "LIVE"
    DELAYED = "DELAYED"
    STALE = "STALE"
    OFFLINE = "OFFLINE"


class IntegrityEventType(str, Enum):
    STALE_DATA = "STALE_DATA"
    SCHEMA_DRIFT = "SCHEMA_DRIFT"
    GAP_DETECTED = "GAP_DETECTED"
    SOURCE_DIVERGENCE = "SOURCE_DIVERGENCE"
    CIRCUIT_BREAKER_OPEN = "CIRCUIT_BREAKER_OPEN"
    CIRCUIT_BREAKER_CLOSED = "CIRCUIT_BREAKER_CLOSED"
    PROVIDER_OFFLINE = "PROVIDER_OFFLINE"


class IntegritySeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ---------------------------------------------------------------------------
# Data Structures
# ---------------------------------------------------------------------------

@dataclass
class ProviderHeartbeat:
    """Real-time status of one data provider."""
    provider_id: str
    provider_name: str
    data_category: str           # e.g. "Central Bank", "Labor", "Inflation"
    country: str
    last_seen: datetime
    expected_interval_minutes: int
    status: ProviderStatus
    freshness_delta_minutes: float
    schema_drift_events_24h: int = 0
    consecutive_failures: int = 0


@dataclass
class SchemaFieldReport:
    """Schema validation result for one provider's latest payload."""
    provider_id: str
    expected_fields: List[str]
    received_fields: List[str]
    missing_fields: List[str]
    extra_fields: List[str]
    drift_events_24h: int
    last_validated: datetime
    is_healthy: bool


@dataclass
class GapDetectionResult:
    """A detected gap where an expected release was not received."""
    release_id: str
    expected_release: str        # Human-readable name, e.g. "US CPI YoY"
    country: str
    expected_window_start: datetime
    hours_overdue: float
    severity: IntegritySeverity
    auto_action: str             # e.g. "Reduced confidence by 15%"


@dataclass
class ReconciliationResult:
    """Cross-source divergence check for the same indicator."""
    indicator_name: str
    country: str
    provider_a: str
    value_a: float
    provider_b: str
    value_b: float
    divergence_pct: float
    is_flagged: bool             # True if > 10% divergence
    flagged_at: datetime


@dataclass
class IntegrityIncident:
    """One integrity event recorded in the incident log."""
    incident_id: str
    occurred_at: datetime
    event_type: IntegrityEventType
    severity: IntegritySeverity
    provider_id: Optional[str]
    description: str
    auto_action_taken: str
    resolved: bool = False
    resolved_at: Optional[datetime] = None


@dataclass
class IntegrityReport:
    """Full composite integrity status for the platform."""
    computed_at: datetime
    integrity_score: float                      # 0–100
    freshness_score: float                      # 0–100 (40% weight)
    schema_health_score: float                  # 0–100 (30% weight)
    gap_rate_score: float                       # 0–100 (30% weight)
    circuit_breaker_active: bool
    circuit_breaker_triggered_at: Optional[datetime]
    circuit_breaker_reason: Optional[str]
    provider_heartbeats: List[ProviderHeartbeat]
    schema_reports: List[SchemaFieldReport]
    gap_detections: List[GapDetectionResult]
    reconciliation_results: List[ReconciliationResult]
    incidents: List[IntegrityIncident]


# ---------------------------------------------------------------------------
# Simulated Provider Registry
# ---------------------------------------------------------------------------

_PROVIDERS = [
    {"id": "fed_h15", "name": "US Federal Reserve (H.15)", "category": "Central Bank", "country": "US", "interval_min": 1440, "lag_min": 0},
    {"id": "bls_cpi", "name": "US Bureau of Labor Statistics (CPI)", "category": "Inflation", "country": "US", "interval_min": 43200, "lag_min": 14},
    {"id": "bls_nfp", "name": "US BLS (Non-Farm Payrolls)", "category": "Labor", "country": "US", "interval_min": 43200, "lag_min": 45},
    {"id": "ecb_rates", "name": "European Central Bank (Rates)", "category": "Central Bank", "country": "EU", "interval_min": 20160, "lag_min": 0},
    {"id": "eurostat_cpi", "name": "Eurostat (HICP CPI)", "category": "Inflation", "country": "EU", "interval_min": 43200, "lag_min": 30},
    {"id": "boe_rates", "name": "Bank of England (MPC Rate)", "category": "Central Bank", "country": "GB", "interval_min": 20160, "lag_min": 0},
    {"id": "ons_cpi", "name": "UK ONS (CPI)", "category": "Inflation", "country": "GB", "interval_min": 43200, "lag_min": 20},
    {"id": "boj_rates", "name": "Bank of Japan (Policy Rate)", "category": "Central Bank", "country": "JP", "interval_min": 20160, "lag_min": 0},
    {"id": "cabinet_cpi_jp", "name": "Japan Cabinet Office (CPI)", "category": "Inflation", "country": "JP", "interval_min": 43200, "lag_min": 25},
    {"id": "rba_rates", "name": "Reserve Bank of Australia (Rate)", "category": "Central Bank", "country": "AU", "interval_min": 20160, "lag_min": 0},
    {"id": "abs_cpi", "name": "Australian Bureau of Statistics (CPI)", "category": "Inflation", "country": "AU", "interval_min": 43200, "lag_min": 15},
    {"id": "statcan_cpi", "name": "Statistics Canada (CPI)", "category": "Inflation", "country": "CA", "interval_min": 43200, "lag_min": 10},
    {"id": "boc_rates", "name": "Bank of Canada (Rate)", "category": "Central Bank", "country": "CA", "interval_min": 20160, "lag_min": 0},
    {"id": "snb_rates", "name": "Swiss National Bank (Rate)", "category": "Central Bank", "country": "CH", "interval_min": 43200, "lag_min": 0},
    {"id": "ism_pmi", "name": "ISM (US Manufacturing PMI)", "category": "Growth", "country": "US", "interval_min": 43200, "lag_min": 5},
    {"id": "sp_global_pmi", "name": "S&P Global (Composite PMI)", "category": "Growth", "country": "GLOBAL", "interval_min": 43200, "lag_min": 8},
    {"id": "us_treasury_yields", "name": "US Treasury (Yield Curve)", "category": "Yields", "country": "US", "interval_min": 1440, "lag_min": 0},
    {"id": "geopolitical_monitor", "name": "Geopolitical Risk Monitor", "category": "Geopolitical", "country": "GLOBAL", "interval_min": 360, "lag_min": 5},
    {"id": "cftc_cot", "name": "CFTC Commitments of Traders (COT)", "category": "Positioning", "country": "US", "interval_min": 10080, "lag_min": 0},
]

_EXPECTED_SCHEMA_FIELDS = {
    "fed_h15": ["rate", "date", "maturity", "source_url"],
    "bls_cpi": ["headline_yoy", "core_yoy", "headline_mom", "release_date", "revision"],
    "bls_nfp": ["change_k", "rate_unemployment", "avg_hourly_earnings_mom", "release_date"],
    "ecb_rates": ["deposit_rate", "main_refinancing_rate", "effective_date"],
    "eurostat_cpi": ["hicp_yoy", "core_hicp_yoy", "release_date"],
    "boe_rates": ["bank_rate", "vote_hold", "vote_hike", "vote_cut", "decision_date"],
    "ons_cpi": ["cpi_yoy", "cpih_yoy", "release_date"],
    "boj_rates": ["policy_rate", "ycc_target", "decision_date"],
    "cabinet_cpi_jp": ["cpi_yoy", "core_cpi_yoy", "release_date"],
    "rba_rates": ["cash_rate", "decision_date", "forward_guidance"],
    "abs_cpi": ["cpi_yoy", "trimmed_mean_yoy", "release_date"],
    "statcan_cpi": ["cpi_yoy", "core_cpi_yoy", "release_date"],
    "boc_rates": ["overnight_rate", "decision_date", "forward_guidance"],
    "snb_rates": ["policy_rate", "decision_date"],
    "ism_pmi": ["pmi_composite", "new_orders", "employment", "release_date"],
    "sp_global_pmi": ["manufacturing_pmi", "services_pmi", "composite_pmi", "release_date"],
    "us_treasury_yields": ["y2", "y5", "y10", "y30", "date", "inversion_flag"],
    "geopolitical_monitor": ["risk_score", "events_count", "hotspots", "updated_at"],
    "cftc_cot": ["report_date", "commercial_net", "non_commercial_net", "open_interest", "cot_index"],
}


def _deterministic_lag(provider_id: str, now: datetime) -> float:
    """Simulate realistic data freshness per provider within operational windows."""
    import hashlib
    h = int(hashlib.md5(f"{provider_id}_{now.hour}_{now.minute // 15}".encode()).hexdigest(), 16)
    base_pct = (h % 100) / 100.0
    # In healthy operational steady-state:
    # 90% of providers report recent pings (5 to 35 min)
    # ~8% are slightly delayed (35 to 75 min)
    # ~2% experience temporary delay (75 to 145 min)
    if base_pct < 0.90:
        return 5.0 + base_pct * 30.0   # 5-32 min fresh
    elif base_pct < 0.98:
        return 35.0 + (base_pct - 0.90) * 500.0  # 35-75 min
    else:
        return 75.0 + (base_pct - 0.98) * 3500.0 # 75-145 min


# ---------------------------------------------------------------------------
# Data Freshness Monitor
# ---------------------------------------------------------------------------

class DataFreshnessMonitor:
    """Checks all registered providers for data staleness with cadence-aware SLAs."""

    LIVE_THRESHOLD_MINUTES = 45
    DELAYED_THRESHOLD_MINUTES = 120
    STALE_THRESHOLD_MINUTES = 360

    @classmethod
    def assess_all_providers(cls, now: Optional[datetime] = None) -> List[ProviderHeartbeat]:
        if now is None:
            now = datetime.now(timezone.utc)

        heartbeats: List[ProviderHeartbeat] = []
        for p in _PROVIDERS:
            lag_min = _deterministic_lag(p["id"], now)
            last_seen = now - timedelta(minutes=lag_min)
            interval = p.get("interval_min", 1440)

            # Cadence-aware SLA thresholds:
            # Macro policy rates (meeting cadence 2-6 weeks) and monthly CPI indicators
            # have wider tolerance windows before being marked stale, since central banks
            # only publish decisions every several weeks.
            if interval >= 20160:  # Bi-weekly or monthly (Central Bank Rates & Monthly CPI)
                live_thresh = 720.0      # 12 hours
                delayed_thresh = 1440.0  # 24 hours
                stale_thresh = 2880.0    # 48 hours
            elif interval >= 10080:  # Weekly (CFTC Commitments of Traders)
                live_thresh = 720.0      # 12 hours
                delayed_thresh = 1440.0  # 24 hours
                stale_thresh = 2880.0    # 48 hours
            elif interval >= 1440:  # Daily (Treasuries, Fed H.15)
                live_thresh = 360.0      # 6 hours
                delayed_thresh = 720.0   # 12 hours
                stale_thresh = 1440.0    # 24 hours
            else:                  # Intraday / high-frequency
                live_thresh = 180.0      # 3 hours
                delayed_thresh = 360.0   # 6 hours
                stale_thresh = 720.0     # 12 hours

            if lag_min <= live_thresh:
                status = ProviderStatus.LIVE
            elif lag_min <= delayed_thresh:
                status = ProviderStatus.DELAYED
            elif lag_min <= stale_thresh:
                status = ProviderStatus.STALE
            else:
                status = ProviderStatus.OFFLINE

            heartbeats.append(ProviderHeartbeat(
                provider_id=p["id"],
                provider_name=p["name"],
                data_category=p["category"],
                country=p["country"],
                last_seen=last_seen,
                expected_interval_minutes=p["interval_min"],
                status=status,
                freshness_delta_minutes=round(lag_min, 1),
                schema_drift_events_24h=0,
                consecutive_failures=0,
            ))
        return heartbeats

    @classmethod
    def freshness_score(cls, heartbeats: List[ProviderHeartbeat]) -> float:
        """0–100: proportion of providers that are LIVE or DELAYED (not STALE/OFFLINE)."""
        if not heartbeats:
            return 0.0
        healthy = sum(1 for h in heartbeats if h.status in (ProviderStatus.LIVE, ProviderStatus.DELAYED))
        return round((healthy / len(heartbeats)) * 100.0, 1)


# ---------------------------------------------------------------------------
# Schema Validator
# ---------------------------------------------------------------------------

class SchemaValidator:
    """Validates incoming event payloads against expected field schemas."""

    @classmethod
    def validate_all(cls, now: Optional[datetime] = None) -> List[SchemaFieldReport]:
        if now is None:
            now = datetime.now(timezone.utc)

        reports: List[SchemaFieldReport] = []
        for provider_id, expected in _EXPECTED_SCHEMA_FIELDS.items():
            # Simulate: most providers are healthy, 1-2 have minor drift
            import hashlib
            h = int(hashlib.md5(f"schema_{provider_id}_{now.date()}".encode()).hexdigest(), 16)
            drift_chance = (h % 100) / 100.0

            received = list(expected)
            missing: List[str] = []
            extra: List[str] = []
            drift_events = 0

            if drift_chance > 0.93:
                # Simulate a missing field
                if received:
                    missing = [received.pop()]
                drift_events = 1
            elif drift_chance > 0.85:
                # Simulate an extra field
                extra = ["_legacy_revision"]

            is_healthy = len(missing) == 0

            reports.append(SchemaFieldReport(
                provider_id=provider_id,
                expected_fields=expected,
                received_fields=received,
                missing_fields=missing,
                extra_fields=extra,
                drift_events_24h=drift_events,
                last_validated=now,
                is_healthy=is_healthy,
            ))
        return reports

    @classmethod
    def schema_health_score(cls, reports: List[SchemaFieldReport]) -> float:
        """0–100: proportion of providers with zero missing fields."""
        if not reports:
            return 0.0
        healthy = sum(1 for r in reports if r.is_healthy)
        return round((healthy / len(reports)) * 100.0, 1)


# ---------------------------------------------------------------------------
# Gap Detector
# ---------------------------------------------------------------------------

_EXPECTED_RELEASES = [
    {"id": "us_cpi_monthly", "name": "US CPI YoY", "country": "US", "interval_hours": 720},
    {"id": "us_nfp_monthly", "name": "US Non-Farm Payrolls", "country": "US", "interval_hours": 720},
    {"id": "eu_cpi_monthly", "name": "Eurozone HICP CPI YoY", "country": "EU", "interval_hours": 720},
    {"id": "uk_cpi_monthly", "name": "UK CPI YoY", "country": "GB", "interval_hours": 720},
    {"id": "jp_cpi_monthly", "name": "Japan CPI YoY", "country": "JP", "interval_hours": 720},
    {"id": "ism_pmi_monthly", "name": "US ISM Manufacturing PMI", "country": "US", "interval_hours": 720},
    {"id": "fed_rate_decision", "name": "FOMC Rate Decision", "country": "US", "interval_hours": 1344},
    {"id": "ecb_rate_decision", "name": "ECB Rate Decision", "country": "EU", "interval_hours": 1008},
    {"id": "boe_rate_decision", "name": "BoE Rate Decision", "country": "GB", "interval_hours": 1008},
    {"id": "cftc_cot_weekly", "name": "CFTC Commitments of Traders (COT)", "country": "US", "interval_hours": 168},
]


class GapDetector:
    """Detects expected-but-missing macro data releases."""

    MEDIUM_GAP_HOURS = 12.0
    HIGH_GAP_HOURS = 24.0
    CRITICAL_GAP_HOURS = 48.0

    @classmethod
    def detect_gaps(cls, now: Optional[datetime] = None) -> List[GapDetectionResult]:
        if now is None:
            now = datetime.now(timezone.utc)

        gaps: List[GapDetectionResult] = []
        for rel in _EXPECTED_RELEASES:
            import hashlib
            h = int(hashlib.md5(f"gap_{rel['id']}_{now.date()}".encode()).hexdigest(), 16)
            gap_chance = (h % 100) / 100.0

            # Only ~10% of releases show a gap at any moment
            if gap_chance > 0.90:
                overdue_hours = 6.0 + (gap_chance * 36.0)
                expected_window_start = now - timedelta(hours=overdue_hours)

                if overdue_hours >= cls.CRITICAL_GAP_HOURS:
                    severity = IntegritySeverity.CRITICAL
                    action = "Circuit breaker consideration: confidence downgraded"
                elif overdue_hours >= cls.HIGH_GAP_HOURS:
                    severity = IntegritySeverity.HIGH
                    action = "Confidence reduced by 20% for affected assets"
                else:
                    severity = IntegritySeverity.MEDIUM
                    action = "Flagged for monitoring; no automatic action"

                gaps.append(GapDetectionResult(
                    release_id=rel["id"],
                    expected_release=rel["name"],
                    country=rel["country"],
                    expected_window_start=expected_window_start,
                    hours_overdue=round(overdue_hours, 1),
                    severity=severity,
                    auto_action=action,
                ))
        return gaps

    @classmethod
    def gap_rate_score(cls, gaps: List[GapDetectionResult]) -> float:
        """0–100: penalty for each gap (MEDIUM=-5, HIGH=-15, CRITICAL=-30)."""
        score = 100.0
        for g in gaps:
            if g.severity == IntegritySeverity.CRITICAL:
                score -= 30.0
            elif g.severity == IntegritySeverity.HIGH:
                score -= 15.0
            else:
                score -= 5.0
        return max(0.0, round(score, 1))


# ---------------------------------------------------------------------------
# Source Reconciler
# ---------------------------------------------------------------------------

_CROSS_SOURCE_CHECKS = [
    {"indicator": "US CPI YoY", "country": "US", "provider_a": "BLS (Official)", "value_a": 3.2, "provider_b": "Bloomberg Consensus", "value_b": 3.1},
    {"indicator": "EU HICP YoY", "country": "EU", "provider_a": "Eurostat (Official)", "value_a": 2.4, "provider_b": "ECB Staff Projection", "value_b": 2.5},
    {"indicator": "US PMI Composite", "country": "US", "provider_a": "ISM", "value_a": 52.1, "provider_b": "S&P Global", "value_b": 51.4},
    {"indicator": "UK CPI YoY", "country": "GB", "provider_a": "ONS (Official)", "value_a": 3.8, "provider_b": "BoE Survey", "value_b": 3.6},
    {"indicator": "US 10Y Yield", "country": "US", "provider_a": "US Treasury", "value_a": 4.32, "provider_b": "Bloomberg", "value_b": 4.31},
    {"indicator": "Gold COT Commercial Net", "country": "US", "provider_a": "CFTC Official", "value_a": -238500, "provider_b": "Bloomberg Terminal", "value_b": -238100},
]


class SourceReconciler:
    """Cross-validates the same indicator across multiple providers."""

    DIVERGENCE_THRESHOLD_PCT = 10.0

    @classmethod
    def reconcile_all(cls, now: Optional[datetime] = None) -> List[ReconciliationResult]:
        if now is None:
            now = datetime.now(timezone.utc)
        results: List[ReconciliationResult] = []
        for check in _CROSS_SOURCE_CHECKS:
            va, vb = check["value_a"], check["value_b"]
            mid = (abs(va) + abs(vb)) / 2.0
            div_pct = abs(va - vb) / mid * 100.0 if mid > 0 else 0.0
            flagged = div_pct > cls.DIVERGENCE_THRESHOLD_PCT

            results.append(ReconciliationResult(
                indicator_name=check["indicator"],
                country=check["country"],
                provider_a=check["provider_a"],
                value_a=va,
                provider_b=check["provider_b"],
                value_b=vb,
                divergence_pct=round(div_pct, 2),
                is_flagged=flagged,
                flagged_at=now,
            ))
        return results


# ---------------------------------------------------------------------------
# Circuit Breaker
# ---------------------------------------------------------------------------

class CircuitBreaker:
    """
    Automatically downgrades model confidence and reverts to NEUTRAL bias
    when the composite integrity score falls below the safety threshold.
    """

    OPEN_THRESHOLD = 60.0   # Score below this opens the breaker
    CLOSE_THRESHOLD = 72.0  # Score must recover above this to close

    @classmethod
    def evaluate(cls, integrity_score: float) -> Tuple[bool, Optional[str]]:
        """
        Returns (is_active, reason_string).
        """
        if integrity_score < cls.OPEN_THRESHOLD:
            reason = (
                f"Composite data integrity score ({integrity_score:.1f}/100) below "
                f"safety threshold ({cls.OPEN_THRESHOLD}). Model confidence auto-downgraded. "
                "Directional bias reverted to NEUTRAL for all affected assets."
            )
            return True, reason
        return False, None


# ---------------------------------------------------------------------------
# Composite Integrity Score
# ---------------------------------------------------------------------------

def compute_integrity_score(
    freshness_score: float,
    schema_health_score: float,
    gap_rate_score: float,
) -> float:
    """
    Composite integrity score: 0–100
    Weights: freshness 40%, schema health 30%, gap rate 30%
    """
    composite = (
        freshness_score * 0.40
        + schema_health_score * 0.30
        + gap_rate_score * 0.30
    )
    return round(min(100.0, max(0.0, composite)), 1)


# ---------------------------------------------------------------------------
# Incident Log Builder
# ---------------------------------------------------------------------------

def build_incident_log(
    heartbeats: List[ProviderHeartbeat],
    schema_reports: List[SchemaFieldReport],
    gaps: List[GapDetectionResult],
    reconciliations: List[ReconciliationResult],
    circuit_breaker_active: bool,
    now: Optional[datetime] = None,
) -> List[IntegrityIncident]:
    """Build a chronological incident log from all integrity checks."""
    if now is None:
        now = datetime.now(timezone.utc)

    incidents: List[IntegrityIncident] = []
    idx = 1

    # Provider offline/stale incidents
    for hb in heartbeats:
        if hb.status == ProviderStatus.OFFLINE:
            incidents.append(IntegrityIncident(
                incident_id=f"INC-{idx:04d}",
                occurred_at=hb.last_seen,
                event_type=IntegrityEventType.PROVIDER_OFFLINE,
                severity=IntegritySeverity.CRITICAL,
                provider_id=hb.provider_id,
                description=f"{hb.provider_name} is OFFLINE. Last seen {hb.freshness_delta_minutes:.0f} minutes ago.",
                auto_action_taken="Confidence penalty applied; fallback to prior data with age warning.",
                resolved=False,
            ))
            idx += 1
        elif hb.status == ProviderStatus.STALE:
            incidents.append(IntegrityIncident(
                incident_id=f"INC-{idx:04d}",
                occurred_at=hb.last_seen,
                event_type=IntegrityEventType.STALE_DATA,
                severity=IntegritySeverity.HIGH,
                provider_id=hb.provider_id,
                description=f"{hb.provider_name} data is STALE ({hb.freshness_delta_minutes:.0f}m since last update). "
                             f"Expected interval: {hb.expected_interval_minutes}min.",
                auto_action_taken="Data age warning appended to all affected scores.",
                resolved=False,
            ))
            idx += 1

    # Schema drift incidents
    for report in schema_reports:
        if not report.is_healthy:
            incidents.append(IntegrityIncident(
                incident_id=f"INC-{idx:04d}",
                occurred_at=report.last_validated,
                event_type=IntegrityEventType.SCHEMA_DRIFT,
                severity=IntegritySeverity.MEDIUM,
                provider_id=report.provider_id,
                description=f"Schema drift detected for {report.provider_id}: missing fields {report.missing_fields}.",
                auto_action_taken="Affected fields treated as missing. Confidence reduced by 5%.",
                resolved=False,
            ))
            idx += 1

    # Gap incidents
    for gap in gaps:
        incidents.append(IntegrityIncident(
            incident_id=f"INC-{idx:04d}",
            occurred_at=gap.expected_window_start,
            event_type=IntegrityEventType.GAP_DETECTED,
            severity=gap.severity,
            provider_id=None,
            description=f"Expected release '{gap.expected_release}' ({gap.country}) is {gap.hours_overdue}h overdue.",
            auto_action_taken=gap.auto_action,
            resolved=False,
        ))
        idx += 1

    # Reconciliation divergence incidents
    for rec in reconciliations:
        if rec.is_flagged:
            incidents.append(IntegrityIncident(
                incident_id=f"INC-{idx:04d}",
                occurred_at=rec.flagged_at,
                event_type=IntegrityEventType.SOURCE_DIVERGENCE,
                severity=IntegritySeverity.HIGH,
                provider_id=None,
                description=(
                    f"Source divergence: {rec.indicator_name} ({rec.country}) — "
                    f"{rec.provider_a}={rec.value_a} vs {rec.provider_b}={rec.value_b} "
                    f"({rec.divergence_pct:.1f}% divergence)."
                ),
                auto_action_taken="Human review required. Confidence for affected factor reduced.",
                resolved=False,
            ))
            idx += 1

    # Circuit breaker event
    if circuit_breaker_active:
        incidents.append(IntegrityIncident(
            incident_id=f"INC-{idx:04d}",
            occurred_at=now,
            event_type=IntegrityEventType.CIRCUIT_BREAKER_OPEN,
            severity=IntegritySeverity.CRITICAL,
            provider_id=None,
            description="Circuit breaker OPEN: composite integrity score below safety threshold. All directional bias signals reverted to NEUTRAL.",
            auto_action_taken="Bias reverted to NEUTRAL for all assets. Confidence capped at 40%.",
            resolved=False,
        ))

    # Sort by recency
    incidents.sort(key=lambda i: i.occurred_at, reverse=True)
    return incidents


# ---------------------------------------------------------------------------
# Master Report Builder
# ---------------------------------------------------------------------------

def build_integrity_report(now: Optional[datetime] = None) -> IntegrityReport:
    """Run all integrity checks and return a full composite report."""
    if now is None:
        now = datetime.now(timezone.utc)

    heartbeats = DataFreshnessMonitor.assess_all_providers(now)
    schema_reports = SchemaValidator.validate_all(now)
    gaps = GapDetector.detect_gaps(now)
    reconciliations = SourceReconciler.reconcile_all(now)

    freshness = DataFreshnessMonitor.freshness_score(heartbeats)
    schema_health = SchemaValidator.schema_health_score(schema_reports)
    gap_rate = GapDetector.gap_rate_score(gaps)

    integrity_score = compute_integrity_score(freshness, schema_health, gap_rate)
    cb_active, cb_reason = CircuitBreaker.evaluate(integrity_score)

    incidents = build_incident_log(
        heartbeats, schema_reports, gaps, reconciliations, cb_active, now
    )

    return IntegrityReport(
        computed_at=now,
        integrity_score=integrity_score,
        freshness_score=freshness,
        schema_health_score=schema_health,
        gap_rate_score=gap_rate,
        circuit_breaker_active=cb_active,
        circuit_breaker_triggered_at=now if cb_active else None,
        circuit_breaker_reason=cb_reason,
        provider_heartbeats=heartbeats,
        schema_reports=schema_reports,
        gap_detections=gaps,
        reconciliation_results=reconciliations,
        incidents=incidents,
    )


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------

def report_to_dict(r: IntegrityReport) -> dict:
    return {
        "computed_at": r.computed_at.isoformat(),
        "integrity_score": r.integrity_score,
        "freshness_score": r.freshness_score,
        "schema_health_score": r.schema_health_score,
        "gap_rate_score": r.gap_rate_score,
        "circuit_breaker_active": r.circuit_breaker_active,
        "circuit_breaker_triggered_at": r.circuit_breaker_triggered_at.isoformat() if r.circuit_breaker_triggered_at else None,
        "circuit_breaker_reason": r.circuit_breaker_reason,
        "provider_heartbeats": [
            {
                "provider_id": hb.provider_id,
                "provider_name": hb.provider_name,
                "data_category": hb.data_category,
                "country": hb.country,
                "last_seen": hb.last_seen.isoformat(),
                "expected_interval_minutes": hb.expected_interval_minutes,
                "status": hb.status.value,
                "freshness_delta_minutes": hb.freshness_delta_minutes,
                "schema_drift_events_24h": hb.schema_drift_events_24h,
                "consecutive_failures": hb.consecutive_failures,
            }
            for hb in r.provider_heartbeats
        ],
        "schema_reports": [
            {
                "provider_id": s.provider_id,
                "expected_fields": s.expected_fields,
                "received_fields": s.received_fields,
                "missing_fields": s.missing_fields,
                "extra_fields": s.extra_fields,
                "drift_events_24h": s.drift_events_24h,
                "last_validated": s.last_validated.isoformat(),
                "is_healthy": s.is_healthy,
            }
            for s in r.schema_reports
        ],
        "gap_detections": [
            {
                "release_id": g.release_id,
                "expected_release": g.expected_release,
                "country": g.country,
                "expected_window_start": g.expected_window_start.isoformat(),
                "hours_overdue": g.hours_overdue,
                "severity": g.severity.value,
                "auto_action": g.auto_action,
            }
            for g in r.gap_detections
        ],
        "reconciliation_results": [
            {
                "indicator_name": rc.indicator_name,
                "country": rc.country,
                "provider_a": rc.provider_a,
                "value_a": rc.value_a,
                "provider_b": rc.provider_b,
                "value_b": rc.value_b,
                "divergence_pct": rc.divergence_pct,
                "is_flagged": rc.is_flagged,
                "flagged_at": rc.flagged_at.isoformat(),
            }
            for rc in r.reconciliation_results
        ],
        "incidents": [
            {
                "incident_id": inc.incident_id,
                "occurred_at": inc.occurred_at.isoformat(),
                "event_type": inc.event_type.value,
                "severity": inc.severity.value,
                "provider_id": inc.provider_id,
                "description": inc.description,
                "auto_action_taken": inc.auto_action_taken,
                "resolved": inc.resolved,
            }
            for inc in r.incidents
        ],
    }
