"""Unit tests for VPS-Friendly Resource Governor and Autonomous Optimization Engine."""

import pytest
from backend.app.engine.vps_governor import VPSGovernor


def test_vps_governor_initial_state():
    gov = VPSGovernor(idle_timeout_seconds=60, max_rss_mb=200.0)
    assert gov.mode == "ACTIVE"
    assert gov.total_gc_runs == 0
    assert gov.total_wal_checkpoints == 0


def test_vps_governor_activity_transitions():
    gov = VPSGovernor(idle_timeout_seconds=0.1)
    gov.set_mode("ECO_MODE")
    assert gov.mode == "ECO_MODE"

    # User activity transitions from ECO_MODE to ACTIVE
    gov.record_user_activity()
    assert gov.mode == "ACTIVE"
    assert gov.total_wakeups == 1


def test_vps_governor_effective_intervals():
    gov = VPSGovernor()
    gov.set_mode("ACTIVE")
    p, c, n, cot = gov.get_effective_polling_intervals(60, 180, 180, 3600)
    assert p in (60, 90)
    assert c in (180, 270)
    assert n in (180, 270)
    assert cot in (3600, 5400)

    # In ECO_MODE, intervals are significantly relaxed to conserve CPU & memory
    gov.set_mode("ECO_MODE")
    ep, ec, en, ecot = gov.get_effective_polling_intervals(60, 180, 180, 3600)
    assert ep >= 300
    assert ec >= 900
    assert en >= 900
    assert ecot >= 7200


def test_vps_governor_memory_reclamation():
    gov = VPSGovernor()
    res = gov.run_memory_reclamation()
    assert "rss_after_mb" in res
    assert "reclaimed_mb" in res
    assert "objects_collected" in res
    assert gov.total_gc_runs == 1


def test_vps_governor_telemetry():
    gov = VPSGovernor()
    t = gov.get_telemetry()
    assert t["status"] == "HEALTHY"
    assert "vps_governor" in t
    assert "process_resources" in t
    assert "host_resources" in t
    assert "database_storage" in t
    assert t["process_resources"]["rss_mb"] > 0
    assert t["host_resources"]["total_ram_mb"] > 0
