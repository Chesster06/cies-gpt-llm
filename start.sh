#!/usr/bin/env bash
echo "========================================================"
echo "          STARTING CIES FULLSTACK ECOSYSTEM             "
echo "========================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$SCRIPT_DIR/model-llm/weights/model.safetensors" ] && [ -f "$SCRIPT_DIR/model-llm/weights/model.safetensors.part001" ]; then
    echo "[*] Reassembling model.safetensors from 31 split parts..."
    cat "$SCRIPT_DIR"/model-llm/weights/model.safetensors.part* > "$SCRIPT_DIR/model-llm/weights/model.safetensors"
    echo "[OK] Model weights assembled successfully."
    echo ""
fi

echo "[1/3] Starting CIESGPT Model Server (Port 8081)..."
cd "$SCRIPT_DIR/model-llm" && CIES_MODEL_PORT=8081 python server.py &
MODEL_PID=$!

sleep 3

echo "[2/3] Starting Go Backend API (Port 8080)..."
cd "$SCRIPT_DIR/backend" && go run ./cmd/server &
BACKEND_PID=$!

sleep 2

echo "[3/3] Starting Frontend Web Interface (Port 8082)..."
cd "$SCRIPT_DIR/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================================"
echo " Services running in background:"
echo " - Backend Go API  : http://localhost:8080"
echo " - CIESGPT Engine  : http://localhost:8081"
echo " - Frontend Web UI : http://localhost:8082"
echo " Press Ctrl+C to terminate all services."
echo "========================================================"

trap "kill $MODEL_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
