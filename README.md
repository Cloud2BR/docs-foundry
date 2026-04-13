# Docs Foundry

USA / Costa Rica

[![GitHub](https://img.shields.io/badge/--181717?logo=github&logoColor=ffffff)](https://github.com/) [Cloud2BR](https://github.com/Cloud2BR)

Last updated: 2026-02-25

----------

> DocFoundry is an open-source **Electron** desktop app for writing and previewing Markdown documentation with a live split-pane editor, local folder tree, safe local saves, container-only development for contributors, and installable binaries for macOS, Windows, and Linux.


<details>
<summary>Table of contents</summary>

- [What's included](#whats-included)
- [Repository tree](#project-structure)
- [Roadmap](#roadmap)
- [Mode 1: Container-only development](#mode-1-container-only-development)
- [Mode 2: End-user desktop app install](#mode-2-end-user-desktop-app-install)
- [GitHub Pages](#github-pages)
- [Pipelines included](#pipelines-included)
- [Quality & Testing](#quality--testing)

</details>

## What's included

> DocFoundry ships multi-tab editing, split-pane live preview, a command palette, workspace-wide search, in-file find and replace, a document outline, file operations (create, rename, delete), auto-save, HTML export, zen mode, resizable panes, a keyboard shortcuts overlay, a status bar (word count, reading time, cursor position), breadcrumbs, and full Markdown rendering (headings, bold/italic, lists, task lists, tables, code blocks, blockquotes, images, links, horizontal rules, strikethrough, highlight, footnotes). The app includes unsaved-change protection on close, a file watcher for external changes, native menus with keyboard accelerators, and a secure architecture (contextIsolation, no nodeIntegration, validated file paths).

For the full changelog and per-version details, see [Releases](https://github.com/Cloud2BR/docs-foundry/releases).

> [!NOTE]
> Desktop releases are published when you push a `v*` tag or when you manually run `.github/workflows/release-desktop.yml` with a `tag_name` input.

<details>
<summary>Expand repository tree</summary>

```text
DocFoundry/
├── src/
│   ├── main.js               # Electron main process (IPC, menu, file watcher)
│   ├── preload.js            # Secure IPC bridge (contextBridge)
│   ├── lib/
│   │   └── workspace-path.js # Secure path validation
│   └── renderer/
│       ├── index.html        # Desktop app shell (welcome + workspace)
│       ├── styles.css        # Full UI styling
│       ├── renderer.js       # Tabs, palette, search, outline, editor logic
│       └── markdown.js       # Shared Markdown→HTML parser (UMD)
├── build/
│   ├── icon.svg              # App icon source
│   └── generate-icons.sh     # SVG to PNG/ICO/ICNS converter
├── docs/
│   ├── .nojekyll
│   ├── index.html            # GitHub Pages overview page
│   ├── downloads.html        # Download/install guide backed by GitHub Releases
│   └── roadmap.html          # Public roadmap view on GitHub Pages
├── tests/
│   ├── smoke.test.mjs        # Structure, security, and feature-surface tests
│   ├── markdown.test.mjs     # Markdown parser tests
│   └── workspace-path.test.mjs # Path validation tests
├── scripts/
│   └── setup.sh              # OS detection and Docker validation
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── workflows/
│       ├── deploy-pages.yml
│       ├── release-desktop.yml
│       ├── auto-fill-pr.yml
│       ├── update-md-date.yml
│       ├── update_date.py
│       ├── use-visitor-counter.yml
│       └── cleanup-pages-history.yml
├── Dockerfile.dev            # Container dev image (node:20-bookworm)
├── Makefile                  # setup, dev, lint, format, test, package targets
├── vitest.config.mjs         # Vitest configuration
├── eslint.config.mjs         # ESLint flat config (v9+)
├── .prettierrc               # Prettier configuration
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
└── README.md
```

</details>

## Roadmap

Live roadmap page: [Docs Foundry Roadmap](https://cloud2br.github.io/docs-foundry/roadmap.html)

## Mode 1: Container-only development

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

## Mode 2: End-user desktop app install

> This mode is for users who just want to install and run DocFoundry.

- macOS outputs: `.dmg` (recommended), `.zip` (advanced/manual fallback)
- Windows outputs: `NSIS installer`, `.zip`
- Linux outputs: `AppImage`, `.deb`, `.tar.gz`

Build artifacts go to `release/`.

| Platform | Release files | Recommended install path | First-run notes | Build command |
|---|---|---|---|---|
| macOS | `.dmg`, `.zip` | Download the `.dmg` from GitHub Releases and drag `DocFoundry.app` into `Applications`. Use the `.zip` only as a fallback. | The app is unsigned, so Gatekeeper may block the ZIP build. If macOS says the app is damaged, run `xattr -cr /Applications/DocFoundry.app` after moving it to `Applications`, or run `xattr -cr /path/to/DocFoundry.app` on the extracted app bundle before opening it. | `make package-mac` |
| Windows | `NSIS installer`, `.zip` | Use the NSIS installer for the normal install flow. Use the ZIP when you want a manual or portable-style extraction. | Windows SmartScreen may show a warning because the installer is not code-signed. Click **More info → Run anyway** to continue. | `make package-win` |
| Linux | `AppImage`, `.deb`, `.tar.gz` | Use the package format that matches your environment: `AppImage` for portable use, `.deb` for Debian/Ubuntu installs, or `.tar.gz` for manual extraction. | `AppImage` usually needs `chmod +x` before running. For `.deb`, install with `sudo apt install ./DocFoundry.deb` or the generated filename in `release/`. Linux packaging is intended to run from the container workflow. | `make package-linux` |

For a local multi-platform packaging pass from a compatible host environment, use `make package`.

## GitHub Pages

This repo includes a Pages workflow in `.github/workflows/deploy-pages.yml` and publishes `docs/index.html`.

1. Push repository to GitHub.
2. Open `Settings > Pages`.
3. Set source to `GitHub Actions`.
4. Push to `main`.
5. Wait for `Deploy GitHub Pages` workflow completion.

## Pipelines included

- `.github/workflows/deploy-pages.yml`: deploys GitHub Pages.
- `.github/workflows/release-desktop.yml`: builds desktop binaries on macOS, Windows, Linux and publishes a tagged GitHub Release on `v*` tags or manual dispatch with `tag_name`.
- `.github/workflows/update-md-date.yml`: updates README date automatically.
- `.github/workflows/use-visitor-counter.yml`: updates README visitor badge.
- `.github/workflows/cleanup-pages-history.yml`: cleans old Pages workflow runs.

## Quality & Testing

> Run code quality checks and tests inside the container:

```
make lint       # ESLint
make format     # Prettier
make test       # Vitest
```

<!-- START BADGE -->
<div align="center">
  <img src="https://img.shields.io/badge/Total%20views-3-limegreen" alt="Total views">
  <p>Refresh Date: 2026-04-13</p>
</div>
<!-- END BADGE -->
