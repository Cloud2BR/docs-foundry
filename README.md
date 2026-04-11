# Docs Foundry

USA / Costa Rica

[![GitHub](https://img.shields.io/badge/--181717?logo=github&logoColor=ffffff)](https://github.com/) [Cloud2BR](https://github.com/Cloud2BR)

Last updated: 2026-02-25

----------

> DocFoundry is an open-source **Electron** desktop app for writing and previewing Markdown documentation with a live split-pane editor, local folder tree, safe local saves, container-only development for contributors, and installable binaries for macOS, Windows, and Linux.

## Current scope in v0.0.1

- Open a local documentation folder and browse files in a sidebar tree
- **Multi-tab editing** — open many files at once with dirty-state indicators
- Split-pane Markdown editor with live preview
- **Command palette** (Ctrl/Cmd+P) — fuzzy quick-open any file
- **Workspace-wide search** (Ctrl/Cmd+Shift+F) — grep across all files with grouped results
- **In-file find & replace** (Ctrl/Cmd+F / Ctrl/Cmd+H) — match count navigation
- **Document outline** — heading tree synced to the current file
- **File operations** — create, rename, and delete files and folders from the sidebar
- **Auto-save** with 2-second debounce (toggle from status bar)
- **Export to standalone HTML** (Ctrl/Cmd+Shift+E) with embedded styles
- **Zen mode** (Ctrl/Cmd+Shift+Z) — distraction-free full-screen editing
- **Resizable panes** — drag sidebar and editor/preview splits
- **Keyboard shortcuts overlay** (Ctrl/Cmd+/) — full shortcut reference
- **Status bar** — word count, reading time, cursor position, auto-save toggle
- **Breadcrumbs** — file path bar above the editor
- Markdown preview: headings, bold/italic, lists (ordered, unordered, task), tables, code blocks, blockquotes, images, links, horizontal rules, ~~strikethrough~~, ==highlight==, footnotes
- Unsaved-change protection on app close (save / discard / cancel)
- File watcher detects external changes and refreshes the tree
- Native app menu with keyboard accelerators
- Secure architecture: contextIsolation, no nodeIntegration, validated file paths

## Near-term capabilities to add next

- Git change indicators and diff view
- Broken-link checks and link autocomplete
- Export to PDF
- Scroll sync between editor and preview
- Drag-and-drop file and image support
- Mermaid diagram rendering
- Spell check

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

- macOS outputs: `.dmg` (recommended), `.zip` (advanced/manual fallback)
- Windows outputs: `NSIS installer`, `.zip`
- Linux outputs: `AppImage`, `.deb`, `.tar.gz`

Build artifacts go to `release/`.

#### macOS — "damaged and can't be opened" (Gatekeeper)

DocFoundry is unsigned (no Apple Developer certificate). Use the `.dmg` first when downloading from GitHub Releases. macOS quarantines apps downloaded from the internet. If you open the `.zip` build and macOS blocks it, run this once after downloading:

```bash
xattr -cr /Applications/DocFoundry.app
```

Or if you extracted from the ZIP before moving to Applications:

```bash
xattr -cr /path/to/DocFoundry.app
```

Then double-click the app normally.

#### Windows — SmartScreen warning

Click **More info → Run anyway** on the SmartScreen prompt. This appears because the installer is not signed with a code-signing certificate.

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
│   ├── main.js              # Electron main process (IPC, menu, file watcher)
│   ├── preload.js           # Secure IPC bridge (contextBridge)
│   ├── lib/
│   │   └── workspace-path.js # Secure path validation
│   └── renderer/
│       ├── index.html       # Desktop app shell (welcome + workspace)
│       ├── styles.css       # Full UI styling
│       ├── renderer.js      # Tabs, palette, search, outline, editor logic
│       └── markdown.js      # Shared Markdown→HTML parser (UMD)
├── build/
│   ├── icon.svg             # App icon source
│   └── generate-icons.sh   # SVG → PNG/ICO/ICNS converter
├── tests/
│   ├── smoke.test.mjs       # Structure, security & feature-surface tests
│   ├── markdown.test.mjs    # Markdown parser tests
│   └── workspace-path.test.mjs # Path validation tests
├── docs/
│   └── index.html           # GitHub Pages landing & download page
├── scripts/
│   └── setup.sh             # OS detection & Docker validation
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
  <p>Refresh Date: 2026-04-11</p>
</div>
<!-- END BADGE -->
