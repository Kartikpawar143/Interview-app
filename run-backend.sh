#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Error: $PYTHON_BIN is not installed. Install Python 3 first." >&2
  exit 1
fi

if [[ ! -x "$VENV_DIR/bin/python" || ! -f "$VENV_DIR/bin/activate" ]]; then
  if [[ -e "$VENV_DIR" ]]; then
    echo "Removing incomplete backend virtual environment..."
    rm -rf -- "$VENV_DIR"
  fi
  echo "Creating backend virtual environment..."
  if ! "$PYTHON_BIN" -m venv "$VENV_DIR" || [[ ! -x "$VENV_DIR/bin/python" || ! -f "$VENV_DIR/bin/activate" ]]; then
    echo "Could not create a complete virtual environment. On Ubuntu/Debian, install the missing support with:" >&2
    echo "  sudo apt update && sudo apt install -y python3-venv python3-pip" >&2
    echo "Then run this script again." >&2
    exit 1
  fi
fi

source "$VENV_DIR/bin/activate"
python -m pip install -r "$BACKEND_DIR/requirements.txt"
cd "$BACKEND_DIR"
exec uvicorn app.main:app --port "${BACKEND_PORT:-8000}" --reload
