# Contributing to DocFoundry

USA / Costa Rica

[![GitHub](https://img.shields.io/badge/--181717?logo=github&logoColor=ffffff)](https://github.com/) [Cloud2BR](https://github.com/Cloud2BR)

Last updated: 2026-04-10

----------

## Container-only development

DocFoundry uses a container-first model. Do not install Node.js, npm, or project dependencies on your local machine.

### Prerequisites

- Docker Desktop or Docker Engine
- Make

### Getting started

```bash
make setup
make container-shell
```

All development, linting, testing, and packaging happens inside the container.

## Project layout

| Path | Purpose |
|------|---------|
| `src/main.js` | Electron main process |
| `src/preload.js` | Secure preload bridge |
| `src/renderer/` | Desktop app frontend |
| `docs/` | GitHub Pages site |
| `build/` | Icon assets |
| `scripts/` | Setup automation |

## Workflow

1. Fork the repository.
2. Create a branch from `main` using the naming convention below.
3. Make your changes inside the container.
4. Run lint and tests: `npm run lint && npm test`
5. Open a pull request.

## Branch naming convention

Branches follow a `<type>/<short-description>` pattern where `<short-description>` uses kebab-case.

| Prefix | Purpose | Example |
|---|---|---|
| `feat/` | New feature or capability | `feat/markdown-frontmatter` |
| `fix/` | Bug fix | `fix/sidebar-scroll-crash` |
| `docs/` | Documentation or site changes only | `docs/update-readme-badges` |
| `ci/` | CI/CD workflow changes | `ci/add-arm64-build` |
| `test/` | Tests or test infrastructure | `test/add-renderer-smoke-tests` |
| `chore/` | Maintenance, deps, tooling | `chore/upgrade-electron-35` |
| `release/` | Release preparation (version bumps, changelogs) | `release/v0.2.0` |

> **Special branches**
> - `main` — production-ready code; all releases are tagged here
> - `test-binaries` — integration branch for validating cross-platform build outputs before merging to `main`

## Code style

- ESLint and Prettier are configured in the repo.
- Run `npm run lint` to check and `npm run format` to fix formatting.

## Commit messages

Use clear, imperative commit messages:

- `feat: add MDX file support`
- `fix: resolve sidebar scroll issue`
- `docs: update CONTRIBUTING guide`

## Reporting issues

Open an issue on GitHub with reproduction steps. Include OS, app version, and any error output.

<!-- START BADGE -->
<div align="center">
  <img src="https://img.shields.io/badge/Total%20views-168-limegreen" alt="Total views">
  <p>Refresh Date: 2026-04-21</p>
</div>
<!-- END BADGE -->
