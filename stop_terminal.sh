#!/usr/bin/env bash
# ==============================================================================
# Fortune Anukposi Quantitative Macro Terminal - Application Stopper
# ==============================================================================

PORT=8080
echo "[INFO] Terminating Macro Terminal processes..."

if command -v pm2 >/dev/null 2>&1; then
    pm2 stop macro-terminal 2>/dev/null || true
    pm2 delete macro-terminal 2>/dev/null || true
fi

PIDS=$(lsof -ti :${PORT} 2>/dev/null || fuser ${PORT}/tcp 2>/dev/null || true)
if [ -n "${PIDS}" ]; then
    kill -15 ${PIDS} 2>/dev/null || true
    sleep 1
    kill -9 ${PIDS} 2>/dev/null || true
    echo "[SUCCESS] Macro Terminal server stopped."
else
    echo "[INFO] No direct server active on port ${PORT}."
fi
