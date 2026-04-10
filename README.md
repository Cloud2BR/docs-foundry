# Docs Foundry

USA / Costa Rica

[![GitHub](https://img.shields.io/badge/--181717?logo=github&logoColor=ffffff)](https://github.com/) [Cloud2BR](https://github.com/Cloud2BR)

Last updated: 2026-02-25

----------

> DocFoundry is an open-source documentation workspace with two delivery modes: container-only development for contributors, and installable desktop binaries for end users.

## Two operating modes

### Mode 1: Container-only development

> This mode is for maintainers and contributors who do not want local Node.js or npm installation.

1. Install Docker Desktop or Docker Engine.
2. Run:

   make setup

3. Open a dev shell:

   make container-shell

`make setup` now does this:

- Detects the OS.
- Verifies Docker availability.
- Builds the dev image.
- Installs project dependencies only inside the container.

### Mode 2: End-user desktop app install

> This mode is for users who just want to install and run DocFoundry.

- macOS outputs: `.dmg`, `.zip`
- Windows outputs: `NSIS installer`, `.zip`
- Linux outputs: `AppImage`, `.deb`, `.tar.gz`

Build artifacts go to `release/`.

## Build binaries

### From host machine

- make package
- make package-mac
- make package-win

### Linux package build from container

- make package-linux

## GitHub Pages

This repo includes a Pages workflow in `.github/workflows/deploy-pages.yml` and publishes `docs/index.html`.

1. Push repository to GitHub.
2. Open `Settings > Pages`.
3. Set source to `GitHub Actions`.
4. Push to `main`.
5. Wait for `Deploy GitHub Pages` workflow completion.

## Pipelines included

- `.github/workflows/deploy-pages.yml`: deploys GitHub Pages.
- `.github/workflows/release-desktop.yml`: builds desktop binaries on macOS, Windows, Linux and publishes on tags.
- `.github/workflows/update-md-date.yml`: updates README date automatically.
- `.github/workflows/use-visitor-counter.yml`: updates README visitor badge.
- `.github/workflows/cleanup-pages-history.yml`: cleans old Pages workflow runs.

## Project structure

```
DocFoundry/
├── src/
│   ├── main.js              # Electron main process (IPC, auto-update, hot reload)
│   ├── preload.js           # Secure IPC bridge (contextBridge)
│   └── renderer/
│       ├── index.html       # Desktop app shell (welcome + workspace)
│       ├── styles.css        # Full UI styling
│       └── renderer.js      # File tree, editor, live Markdown preview
├── build/
│   ├── icon.svg             # App icon source
│   └── generate-icons.sh   # SVG → PNG/ICO/ICNS converter
├── tests/
│   └── smoke.test.mjs      # Vitest smoke tests
├── docs/
│   └── index.html           # GitHub Pages landing & download page
├── scripts/
│   └── setup.sh             # OS detection & Docker validation
├── .github/workflows/
│   ├── deploy-pages.yml
│   ├── release-desktop.yml
│   ├── update-md-date.yml
│   ├── update_date.py
│   ├── use-visitor-counter.yml
│   └── cleanup-pages-history.yml
├── Dockerfile.dev            # Container dev image (node:20-bookworm)
├── Makefile                  # setup, dev, lint, format, test, package targets
├── vitest.config.mjs         # Vitest configuration
├── .eslintrc.json            # ESLint configuration
├── .prettierrc               # Prettier configuration
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
└── README.md
```

## Quality & Testing

Run code quality checks and tests inside the container:

```
make lint       # ESLint
make format     # Prettier
make test       # Vitest
```

<!-- START BADGE -->
<div align="center">
  <img src="https://img.shields.io/badge/Total%20views-0-limegreen" alt="Total views">
</div>
<!-- END BADGE -->
