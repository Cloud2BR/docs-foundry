#!/usr/bin/env bash
set -euo pipefail

log() {
  printf "[setup] %s\n" "$1"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

detect_os() {
  local kernel
  kernel="$(uname -s 2>/dev/null || echo unknown)"

  case "$kernel" in
    Darwin)
      echo "macos"
      ;;
    Linux)
      echo "linux"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      echo "windows"
      ;;
    *)
      if [[ "${OS:-}" == "Windows_NT" ]]; then
        echo "windows"
      else
        echo "unknown"
      fi
      ;;
  esac
}

print_docker_hint() {
  local os_name="$1"

  case "$os_name" in
    macos)
      log "Install Docker Desktop: https://docs.docker.com/desktop/setup/install/mac-install/"
      ;;
    linux)
      log "Install Docker Engine: https://docs.docker.com/engine/install/"
      ;;
    windows)
      log "Install Docker Desktop: https://docs.docker.com/desktop/setup/install/windows-install/"
      ;;
    *)
      log "Install Docker from https://docs.docker.com/get-started/get-docker/"
      ;;
  esac
}

main() {
  local os_name
  os_name="$(detect_os)"

  log "Detected OS: ${os_name}"

  if ! has_cmd docker; then
    log "Docker CLI not found. Container-only mode requires Docker."
    print_docker_hint "$os_name"
    exit 1
  fi

  log "Docker CLI is available."
  log "Container-only prerequisites are ready."
}

main "$@"
