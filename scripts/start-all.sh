#!/bin/bash

# DEV-Agent-Teams local service starter.
#
# Starts the services that the current Team Coordination Layer actually uses:
# - Hermes HTTP Agent instances on 8002-8007
# - Gateway on 8400
# - Dashboard on 3000

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.codex-run/logs"
CODEX_NODE_BIN="${CODEX_NODE_BIN:-$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin}"
PNPM_BIN="${PNPM_BIN:-/usr/local/bin/pnpm}"

cd "$ROOT"
mkdir -p "$LOG_DIR"

if [ -x "$CODEX_NODE_BIN/node" ]; then
  export PATH="$CODEX_NODE_BIN:$PATH"
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  echo "Loaded .env"
fi

MODEL_PROVIDER="${MODEL_PROVIDER:-deepseek}"
MODEL_NAME="${MODEL_NAME:-deepseek-v4-pro}"
MODEL_BASE_URL="${MODEL_BASE_URL:-https://api.deepseek.com/v1}"
MODEL_SPEND_GUARD="${MODEL_SPEND_GUARD:-1}"
API_KEY="${API_KEY:-}"
GATEWAY_PORT="${GATEWAY_PORT:-8400}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
export MODEL_SPEND_GUARD

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required" >&2
  exit 1
fi

if [ ! -x "$PNPM_BIN" ] && ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required" >&2
  exit 1
fi
if [ ! -x "$PNPM_BIN" ]; then
  PNPM_BIN="$(command -v pnpm)"
fi

if ! command -v hermes >/dev/null 2>&1; then
  echo "Hermes is required" >&2
  exit 1
fi

node_runtime_summary() {
  echo "Node: $(node --version) ($(command -v node))"
  echo "pnpm: $("$PNPM_BIN" --version) ($PNPM_BIN)"
}

verify_native_module() {
  local package_dir="$1"
  local module_name="$2"
  local label="$3"

  if [ ! -d "$package_dir/node_modules" ]; then
    echo "Missing dependencies for $label: $package_dir/node_modules" >&2
    echo "Run pnpm install from $ROOT, then retry ./dev-agent start" >&2
    exit 1
  fi

  if ! (cd "$package_dir" && node -e "require(process.argv[1])" "$module_name") >/dev/null 2>&1; then
    echo "Native module check failed for $label: $module_name" >&2
    echo "Active runtime: $(node --version) ($(command -v node))" >&2
    echo "This usually means node_modules was built with a different Node ABI." >&2
    echo "Use the bundled runtime via CODEX_NODE_BIN or rebuild dependencies with pnpm install." >&2
    exit 1
  fi
}

port_listening() {
  lsof -tiTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_port() {
  local port="$1"
  local label="$2"
  local attempt

  for attempt in $(seq 1 40); do
    if port_listening "$port"; then
      echo "  OK $label is listening on :$port"
      return 0
    fi
    sleep 0.5
  done

  echo "  FAIL $label did not listen on :$port" >&2
  return 1
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempt

  for attempt in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "  OK $label is ready: $url"
      return 0
    fi
    sleep 1
  done

  echo "  FAIL $label did not become ready: $url" >&2
  return 1
}

run_detached() {
  local session="$1"
  local command="$2"

  if command -v screen >/dev/null 2>&1; then
    screen -S "$session" -X quit >/dev/null 2>&1 || true
    screen -dmS "$session" bash -lc "$command"
  else
    nohup bash -lc "$command" >/dev/null 2>&1 &
  fi
}

ensure_hermes_config() {
  local home_dir="$1"
  local port="$2"

  mkdir -p "$home_dir"
  if [ -f "$home_dir/config.yaml" ]; then
    return
  fi

  cat > "$home_dir/config.yaml" <<EOF
model:
  default: $MODEL_NAME
  provider: $MODEL_PROVIDER
  base_url: $MODEL_BASE_URL

platforms:
  api_server:
    enabled: true
    extra:
      host: "127.0.0.1"
      port: $port
      model_name: "hermes-agent"

agent:
  max_turns: 3
  gateway_timeout: 1800

toolsets: []

delegation:
  model: $MODEL_NAME
  provider: $MODEL_PROVIDER
  base_url: $MODEL_BASE_URL
  api_key: $API_KEY
  orchestrator_enabled: true
  max_concurrent_children: 3
  max_spawn_depth: 1
  child_timeout_seconds: 600
  max_iterations: 50
EOF
}

start_hermes() {
  local id="$1"
  local port="$2"
  local home_dir="$3"
  local label="$4"
  local log_file="$LOG_DIR/hermes-$id.log"

  ensure_hermes_config "$home_dir" "$port"

  if port_listening "$port"; then
    echo "Hermes $label already running on :$port"
    return
  fi

  echo "Starting Hermes $label on :$port"
  run_detached "hermes-$id" "HERMES_HOME='$home_dir' hermes gateway run 2>&1 | tee -a '$log_file'"
  wait_for_port "$port" "Hermes $label"
}

resolve_hermes_port() {
  local configured="$1"
  local default_port="$2"
  local legacy_port="$3"

  if [ -z "$configured" ] || [ "$configured" = "$legacy_port" ]; then
    echo "$default_port"
  else
    echo "$configured"
  fi
}

start_node_service() {
  local session="$1"
  local port="$2"
  local dir="$3"
  local command="$4"
  local label="$5"
  local log_file="$6"

  if port_listening "$port"; then
    echo "$label already running on :$port"
    return
  fi

  echo "Starting $label on :$port"
  run_detached "$session" "cd '$dir' && env PATH='$PATH' $command 2>&1 | tee -a '$log_file'"
  wait_for_port "$port" "$label"
}

echo "Starting DEV-Agent-Teams services"
echo "Model: $MODEL_PROVIDER / $MODEL_NAME"
if [ "$MODEL_SPEND_GUARD" = "1" ] && [ "${ALLOW_LIVE_MODEL:-0}" != "1" ]; then
  echo "Model spend guard: ON (live model calls blocked; use Codex backfill)"
else
  echo "Model spend guard: OFF"
fi
node_runtime_summary

verify_native_module "$ROOT/packages/core" "better-sqlite3" "Core session/document store"
verify_native_module "$ROOT/packages/dashboard" "better-sqlite3" "Dashboard kanban/document APIs"

start_hermes "frontend" "$(resolve_hermes_port "${FRONTEND_AGENT_PORT:-}" 8002 8201)" "$HOME/.hermes-frontend" "Frontend Agent"
start_hermes "backend" "$(resolve_hermes_port "${BACKEND_AGENT_PORT:-}" 8003 8202)" "$HOME/.hermes-backend" "Backend Agent"
start_hermes "testing" "$(resolve_hermes_port "${TESTING_AGENT_PORT:-}" 8004 8203)" "$HOME/.hermes-testing" "Testing Agent"
start_hermes "devops" "$(resolve_hermes_port "${DEVOPS_AGENT_PORT:-}" 8005 8204)" "$HOME/.hermes-devops" "DevOps Agent"
start_hermes "pm" "$(resolve_hermes_port "${PM_AGENT_PORT:-}" 8006 8205)" "$HOME/.hermes-pm" "PM Agent"
start_hermes "project-admin" "$(resolve_hermes_port "${PROJECT_ADMIN_AGENT_PORT:-}" 8007 8206)" "$HOME/.hermes-project-admin" "Project Admin Agent"

start_node_service \
  "dev-agent-gateway" \
  "$GATEWAY_PORT" \
  "$ROOT/packages/gateway" \
  "GATEWAY_PORT=$GATEWAY_PORT MODEL_SPEND_GUARD=$MODEL_SPEND_GUARD ALLOW_LIVE_MODEL=${ALLOW_LIVE_MODEL:-0} '$PNPM_BIN' dev" \
  "Gateway" \
  "$LOG_DIR/gateway-screen.log"

start_node_service \
  "dev-agent-dashboard" \
  "$DASHBOARD_PORT" \
  "$ROOT/packages/dashboard" \
  "PORT=$DASHBOARD_PORT '$PNPM_BIN' dev" \
  "Dashboard" \
  "$LOG_DIR/dashboard-screen.log"

echo ""
echo "Verifying HTTP readiness"
wait_for_http "http://127.0.0.1:$GATEWAY_PORT/health" "Gateway health"
wait_for_http "http://127.0.0.1:$GATEWAY_PORT/agent-health" "Gateway agent health"
wait_for_http "http://127.0.0.1:$DASHBOARD_PORT/api/health" "Dashboard health"

echo ""
echo "Services are ready:"
echo "  Gateway:   http://127.0.0.1:$GATEWAY_PORT"
echo "  Dashboard: http://127.0.0.1:$DASHBOARD_PORT"
