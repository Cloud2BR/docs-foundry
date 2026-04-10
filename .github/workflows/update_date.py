from datetime import datetime, timezone
from pathlib import Path

README = Path("README.md")


def update_last_updated(text: str) -> str:
    date_value = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = text.splitlines()
    replaced = False

    for idx, line in enumerate(lines):
        if line.startswith("Last updated:"):
            lines[idx] = f"Last updated: {date_value}"
            replaced = True
            break

    if not replaced:
        lines.insert(0, f"Last updated: {date_value}")

    return "\n".join(lines) + "\n"


def main() -> None:
    current = README.read_text(encoding="utf-8")
    updated = update_last_updated(current)
    README.write_text(updated, encoding="utf-8")


if __name__ == "__main__":
    main()
