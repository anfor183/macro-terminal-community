"""VPS-Friendly Resource Governor and Autonomous Optimization Engine.

Monitors host and process memory/CPU usage, manages adaptive polling backoff (Active vs Eco Mode),
performs periodic memory reclamation (gc.collect + libc malloc_trim), and executes SQLite WAL
maintenance and checkpointing to keep resource consumption minimal on VPS instances.
"""

import os
import gc
import sys
import time
import logging
import ctypes
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
import psutil
from sqlalchemy import text

from backend.app.core.config import settings

logger = logging.getLogger("VPSGovernor")


class VPSGovernor:
    """Master resource governor ensuring minimal footprint on shared/constrained VPS hosts."""

    def __init__(
        self,
        idle_timeout_seconds: int = 900,  # 15 min without user activity -> Eco Mode
        max_rss_mb: float = 350.0,        # Target max memory RSS
        gc_interval_seconds: int = 600,   # Run periodic deep GC every 10 min
        wal_checkpoint_interval: int = 3600, # Checkpoint SQLite WAL every 1 hr
    ):
        self.idle_timeout_seconds = idle_timeout_seconds
        self.max_rss_mb = max_rss_mb
        self.gc_interval_seconds = gc_interval_seconds
        self.wal_checkpoint_interval = wal_checkpoint_interval

        self.mode: str = "ACTIVE"  # "ACTIVE" | "ECO_MODE"
        self.last_user_activity: float = time.time()
        self.last_gc_run: float = time.time()
        self.last_wal_checkpoint: float = time.time()
        self.last_prune_run: float = time.time()

        self.total_gc_runs: int = 0
        self.total_wal_checkpoints: int = 0
        self.total_eco_transitions: int = 0
        self.total_wakeups: int = 0
        self.start_time: float = time.time()

        # Cached process reference
        self.process = psutil.Process(os.getpid())

        # Check for libc malloc_trim on Linux
        self._has_malloc_trim = False
        try:
            if sys.platform.startswith("linux"):
                self._libc = ctypes.CDLL("libc.so.6")
                if hasattr(self._libc, "malloc_trim"):
                    self._has_malloc_trim = True
        except Exception as e:
            logger.debug(f"malloc_trim not available: {e}")

    def record_user_activity(self):
        """Called whenever an incoming HTTP API request is handled."""
        self.last_user_activity = time.time()
        if self.mode == "ECO_MODE":
            self.mode = "ACTIVE"
            self.total_wakeups += 1
            logger.info("🟢 [VPS Governor] User activity detected — Exited ECO_MODE to ACTIVE mode.")

    def set_mode(self, mode: str):
        """Explicitly override operational mode."""
        if mode in ("ACTIVE", "ECO_MODE"):
            old = self.mode
            self.mode = mode
            if old != mode:
                logger.info(f"🔄 [VPS Governor] Operational mode changed from {old} to {mode}.")

    def get_effective_polling_intervals(
        self,
        base_prices: int = 60,
        base_calendar: int = 180,
        base_news: int = 180,
        base_cot: int = 3600,
    ) -> Tuple[int, int, int, int]:
        """
        Return adaptive polling intervals in seconds.
        In Eco Mode, background polling is scaled back drastically to conserve CPU and network.
        If host CPU is critically high (>85%), intervals are also stretched.
        """
        try:
            cpu_pct = psutil.cpu_percent(interval=None)
        except Exception:
            cpu_pct = 0.0

        cpu_penalty = 1.5 if cpu_pct > 85.0 else 1.0

        if self.mode == "ECO_MODE":
            # Eco mode: Relaxed background refresh
            return (
                int(300 * cpu_penalty),   # 5 min
                int(900 * cpu_penalty),   # 15 min
                int(900 * cpu_penalty),   # 15 min
                int(7200 * cpu_penalty),  # 2 hours
            )
        else:
            # Active mode: Responsive refresh
            return (
                int(base_prices * cpu_penalty),
                int(base_calendar * cpu_penalty),
                int(base_news * cpu_penalty),
                int(base_cot * cpu_penalty),
            )

    def run_memory_reclamation(self) -> Dict[str, Any]:
        """Force garbage collection and release unmapped memory to the OS kernel."""
        rss_before = self.process.memory_info().rss / (1024 * 1024)
        
        # Python 3-generation cyclic GC
        collected = gc.collect(2)
        
        # Release unallocated glibc arena pages back to OS
        trimmed = False
        if self._has_malloc_trim:
            try:
                trimmed = bool(self._libc.malloc_trim(0))
            except Exception:
                pass

        rss_after = self.process.memory_info().rss / (1024 * 1024)
        reclaimed_mb = max(0.0, rss_before - rss_after)
        self.last_gc_run = time.time()
        self.total_gc_runs += 1

        logger.info(
            f"🧹 [VPS Governor] Memory Reclaimed: {reclaimed_mb:.2f} MB "
            f"(RSS before: {rss_before:.1f}MB, after: {rss_after:.1f}MB, Objects freed: {collected}, malloc_trim: {trimmed})"
        )

        return {
            "reclaimed_mb": round(reclaimed_mb, 2),
            "rss_before_mb": round(rss_before, 2),
            "rss_after_mb": round(rss_after, 2),
            "objects_collected": collected,
            "malloc_trim_success": trimmed,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def run_sqlite_maintenance(self, session) -> Dict[str, Any]:
        """Perform SQLite WAL checkpoint, size optimization, and historical data pruning."""
        try:
            # Checkpoint WAL file back into main DB and truncate log
            await session.execute(text("PRAGMA wal_checkpoint(TRUNCATE);"))
            await session.execute(text("PRAGMA optimize;"))
            self.last_wal_checkpoint = time.time()
            self.total_wal_checkpoints += 1
            logger.info("📦 [VPS Governor] SQLite WAL checkpointed and truncated.")

            # Prune raw news older than 30 days to bound database disk size
            pruned_news = 0
            try:
                res = await session.execute(
                    text("DELETE FROM news_events WHERE published_at < datetime('now', '-30 days');")
                )
                pruned_news = res.rowcount if hasattr(res, "rowcount") else 0
                await session.commit()
            except Exception as e:
                logger.debug(f"News pruning skipped: {e}")

            return {
                "wal_checkpoint": "SUCCESS",
                "pruned_news_events": pruned_news,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            logger.warning(f"[VPS Governor] SQLite maintenance warning: {exc}")
            return {"wal_checkpoint": "ERROR", "error": str(exc)}

    async def periodic_check(self, session) -> None:
        """Called every tick in the background orchestrator to apply governor policies."""
        now = time.time()

        # 1. Idle Detection: Transition to ECO_MODE if no user requests in idle_timeout_seconds
        idle_time = now - self.last_user_activity
        if self.mode == "ACTIVE" and idle_time >= self.idle_timeout_seconds:
            self.mode = "ECO_MODE"
            self.total_eco_transitions += 1
            logger.info(
                f"🌙 [VPS Governor] No client activity for {int(idle_time/60)} mins. "
                "Switched to ECO_MODE (throttled polling, reduced CPU/RAM usage)."
            )

        # 2. Memory Watchdog: If RSS exceeds max_rss_mb, trigger immediate cleanup
        try:
            rss_mb = self.process.memory_info().rss / (1024 * 1024)
            if rss_mb > self.max_rss_mb or (now - self.last_gc_run > self.gc_interval_seconds):
                self.run_memory_reclamation()
        except Exception:
            pass

        # 3. WAL Maintenance: Run every wal_checkpoint_interval
        if now - self.last_wal_checkpoint >= self.wal_checkpoint_interval:
            await self.run_sqlite_maintenance(session)

    def get_telemetry(self) -> Dict[str, Any]:
        """Return real-time VPS resource metrics, database size, and governor status."""
        now = time.time()
        uptime = int(now - self.start_time)
        idle_seconds = int(now - self.last_user_activity)

        # Process Metrics
        try:
            mem_info = self.process.memory_info()
            rss_mb = round(mem_info.rss / (1024 * 1024), 2)
            vms_mb = round(mem_info.vms / (1024 * 1024), 2)
            proc_cpu = round(self.process.cpu_percent(interval=None), 1)
        except Exception:
            rss_mb, vms_mb, proc_cpu = 0.0, 0.0, 0.0

        # Host System Metrics
        try:
            sys_mem = psutil.virtual_memory()
            total_ram_mb = round(sys_mem.total / (1024 * 1024), 1)
            used_ram_mb = round(sys_mem.used / (1024 * 1024), 1)
            avail_ram_mb = round(sys_mem.available / (1024 * 1024), 1)
            ram_pct = sys_mem.percent
            host_cpu_pct = psutil.cpu_percent(interval=None)
            disk = psutil.disk_usage("/")
            disk_free_gb = round(disk.free / (1024 * 1024 * 1024), 1)
            disk_pct = disk.percent
        except Exception:
            total_ram_mb, used_ram_mb, avail_ram_mb, ram_pct = 0.0, 0.0, 0.0, 0.0
            host_cpu_pct, disk_free_gb, disk_pct = 0.0, 0.0, 0.0

        # SQLite Database File Metrics
        db_file_bytes = 0
        wal_file_bytes = 0
        try:
            if "sqlite" in settings.DATABASE_URL:
                raw_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")
                abs_db_path = os.path.abspath(raw_path)
                if os.path.exists(abs_db_path):
                    db_file_bytes = os.path.getsize(abs_db_path)
                wal_path = f"{abs_db_path}-wal"
                if os.path.exists(wal_path):
                    wal_file_bytes = os.path.getsize(wal_path)
        except Exception:
            pass

        return {
            "status": "HEALTHY",
            "vps_governor": {
                "mode": self.mode,
                "idle_seconds": idle_seconds,
                "idle_timeout_seconds": self.idle_timeout_seconds,
                "max_rss_target_mb": self.max_rss_mb,
                "total_gc_runs": self.total_gc_runs,
                "total_wal_checkpoints": self.total_wal_checkpoints,
                "total_eco_transitions": self.total_eco_transitions,
                "total_wakeups": self.total_wakeups,
                "uptime_seconds": uptime,
                "malloc_trim_supported": self._has_malloc_trim,
            },
            "process_resources": {
                "rss_mb": rss_mb,
                "vms_mb": vms_mb,
                "cpu_percent": proc_cpu,
                "pid": os.getpid(),
            },
            "host_resources": {
                "total_ram_mb": total_ram_mb,
                "used_ram_mb": used_ram_mb,
                "available_ram_mb": avail_ram_mb,
                "ram_usage_percent": ram_pct,
                "host_cpu_percent": host_cpu_pct,
                "disk_free_gb": disk_free_gb,
                "disk_usage_percent": disk_pct,
            },
            "database_storage": {
                "db_size_mb": round(db_file_bytes / (1024 * 1024), 2),
                "wal_size_mb": round(wal_file_bytes / (1024 * 1024), 2),
                "storage_type": "SQLite WAL Optimized",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Global singleton instance
vps_governor = VPSGovernor()
