IMAGE_NAME ?= docfoundry-dev
CONTAINER_CMD = docker run --rm -it -v "$(PWD):/workspace" -w /workspace $(IMAGE_NAME)

.PHONY: help setup setup-deps container-build container-shell install dev lint format test package package-linux package-mac package-win clean

help:
	@echo "Targets:"
	@echo "  make setup            - Detect OS, verify Docker, and install deps in container"
	@echo "  make setup-deps       - Install project dependencies in container only"
	@echo "  make container-build  - Build the developer container image"
	@echo "  make container-shell  - Open an interactive shell in the dev container"
	@echo "  make install          - Install npm dependencies in container"
	@echo "  make dev              - Run app locally on host (requires Node + GUI)"
	@echo "  make lint             - Run ESLint in container"
	@echo "  make format           - Run Prettier in container"
	@echo "  make test             - Run Vitest tests in container"
	@echo "  make package          - Build installable artifacts for current host OS"
	@echo "  make package-linux    - Build Linux artifacts in container"
	@echo "  make package-mac      - Build macOS artifacts on macOS host"
	@echo "  make package-win      - Build Windows artifacts (best in Windows CI)"
	@echo "  make clean            - Remove build outputs"

setup:
	bash scripts/setup.sh
	$(MAKE) setup-deps

setup-deps:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "[setup] Docker is required for container-only setup."; \
		exit 1; \
	fi
	@echo "[setup] Docker detected, installing dependencies in container..."
	$(MAKE) install

container-build:
	docker build -f Dockerfile.dev -t $(IMAGE_NAME) .

container-shell: container-build
	$(CONTAINER_CMD) bash

install: container-build
	$(CONTAINER_CMD) npm install

dev:
	npm run dev

lint: container-build
	$(CONTAINER_CMD) npm run lint

format: container-build
	$(CONTAINER_CMD) npm run format

test: container-build
	$(CONTAINER_CMD) npm test

package:
	npm run dist

package-linux: container-build
	$(CONTAINER_CMD) npm install
	$(CONTAINER_CMD) npm run dist:linux

package-mac:
	npm install
	npm run dist:mac

package-win:
	npm install
	npm run dist:win

clean:
	rm -rf node_modules dist release out
