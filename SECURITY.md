# Security Policy

USA / Costa Rica

[![GitHub](https://img.shields.io/badge/--181717?logo=github&logoColor=ffffff)](https://github.com/) [Cloud2BR](https://github.com/Cloud2BR)

Last updated: 2026-04-10

----------

## Reporting a vulnerability

If you discover a security vulnerability in Docs Foundry, please report it responsibly:

1. **Do not** open a public issue.
2. Email the owner or use the GitHub Security Advisories feature on this repository.
3. Include a detailed description, steps to reproduce, and potential impact.

## Response timeline

- Acknowledgment within 48 hours.
- Initial assessment within 7 days.
- Fix or mitigation plan within 30 days for confirmed vulnerabilities.

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Security practices

- Context isolation and disabled Node integration in the renderer process.
- File access restricted to the currently opened workspace folder.
- Dependencies audited with `npm audit` regularly.
- Electron version kept up to date with security patches.

<!-- START BADGE -->
<div align="center">
  <img src="https://img.shields.io/badge/Total%20views-240-limegreen" alt="Total views">
  <p>Refresh Date: 2026-04-26</p>
</div>
<!-- END BADGE -->
