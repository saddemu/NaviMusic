#!/usr/bin/env bash
# NaviMusic — start/stop helper
#
# Usage:
#   ./run.sh start     Build (if needed) and start the container in the background
#   ./run.sh stop      Stop and remove the container
#   ./run.sh restart   Stop, rebuild, and start
#   ./run.sh logs      Tail container logs (Ctrl-C to detach)
#   ./run.sh status    Show whether the container is running
#   ./run.sh rebuild   Force rebuild from scratch and start

set -euo pipefail

cd "$(dirname "$0")"

# Pick the right docker compose command
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "ERROR: docker compose not found. Install Docker Desktop or the compose plugin." >&2
  exit 1
fi

cmd="${1:-}"

case "$cmd" in
  start)
    echo "→ Starting NaviMusic on http://127.0.0.1:4580"
    $DC up -d --build --remove-orphans
    ;;

  stop)
    echo "→ Stopping NaviMusic"
    $DC down --remove-orphans
    ;;

  restart)
    echo "→ Restarting NaviMusic"
    $DC down --remove-orphans
    $DC up -d --build --remove-orphans
    ;;

  rebuild)
    echo "→ Rebuilding NaviMusic from scratch"
    $DC down --remove-orphans
    $DC build --no-cache
    $DC up -d --remove-orphans
    ;;

  logs)
    $DC logs -f --tail=100
    ;;

  status)
    $DC ps
    ;;

  *)
    cat <<EOF
NaviMusic helper

Usage: $0 <command>

  start      Build and start the container (detached)
  stop       Stop and remove the container
  restart    Stop, rebuild, and start
  rebuild    Force a clean no-cache build, then start
  logs       Tail the container's logs
  status     Show container status

The site listens on http://127.0.0.1:4580 — point your reverse proxy there.
EOF
    exit 1
    ;;
esac
