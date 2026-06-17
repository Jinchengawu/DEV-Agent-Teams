#!/usr/bin/env python3
"""Repair a Claude Code session polluted by an image message on a non-vision model.

Usage:
  python3 scripts/repair-claude-session.py [session_id]

Default session_id: 3ed7c851-1f0a-49ae-b921-662241270c62

IMPORTANT: Quit the Claude Code terminal (Ctrl+C) before running this script.
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

SESSION_ID = "3ed7c851-1f0a-49ae-b921-662241270c62"
PROJECT_KEY = "-Users-zhuizhui------work----AI-DEV-Agent-Teams"
# Last good leaf before Image #22 (system turn after peer-awareness summary)
ROLLBACK_LEAF = "cbaf089d-ca3e-4c4d-93a4-f3c97a96acbd"
ROLLBACK_PROMPT = (
    "Peer awareness 已生效并完成验证。"
    "（已移除 Image #22 以修复 mimo-v2.5-pro 不支持图片的问题）"
)

def session_path(session_id: str) -> Path:
    return Path.home() / ".claude" / "projects" / PROJECT_KEY / f"{session_id}.jsonl"


def is_image22_entry(entry: dict) -> bool:
    if entry.get("type") != "user":
        return False
    content = entry.get("message", {}).get("content", "")
    if isinstance(content, str):
        return "[Image #22]" in content or "image-cache" in content and "/22.png" in content
    if isinstance(content, list):
        text = " ".join(
            c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"
        )
        has_image_block = any(
            isinstance(c, dict) and c.get("type") == "image" for c in content
        )
        return "[Image #22]" in text or (has_image_block and "22.png" in json.dumps(content))
    return False


def is_image22_followup(entry: dict) -> bool:
    if entry.get("type") != "user":
        return False
    content = entry.get("message", {}).get("content", "")
    if isinstance(content, list):
        text = " ".join(
            c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"
        )
        return "image-cache" in text and "/22.png" in text
    return isinstance(content, str) and "/22.png" in content


def should_drop_after_contamination(entry: dict, seen_contamination: bool) -> bool:
    if not seen_contamination:
        return False
    t = entry.get("type")
    if t == "last-prompt":
        return True
    if entry.get("error") == "model_not_found":
        return True
    if t == "assistant" and entry.get("message", {}).get("model") == "<synthetic>":
        return True
    if t == "user":
        return True
    if t == "attachment":
        return True
    if t == "system" and entry.get("subtype") == "turn_duration":
        return True
    return False


def repair(session_id: str, dry_run: bool = False) -> None:
    path = session_path(session_id)
    if not path.exists():
        raise SystemExit(f"Session file not found: {path}")

    lines = path.read_text(encoding="utf-8").splitlines()
    kept: list[str] = []
    seen_contamination = False
    dropped = 0

    for line in lines:
        if not line.strip():
            continue
        entry = json.loads(line)

        if is_image22_entry(entry) or is_image22_followup(entry):
            seen_contamination = True
            dropped += 1
            continue

        if should_drop_after_contamination(entry, seen_contamination):
            dropped += 1
            continue

        if entry.get("type") == "last-prompt":
            continue

        kept.append(line)

    last_prompt = {
        "type": "last-prompt",
        "lastPrompt": ROLLBACK_PROMPT,
        "leafUuid": ROLLBACK_LEAF,
        "sessionId": session_id,
    }
    kept.append(json.dumps(last_prompt, ensure_ascii=False))

    print(f"Session: {session_id}")
    print(f"Original lines: {len(lines)}")
    print(f"Dropped lines:  {dropped}")
    print(f"Kept lines:     {len(kept)}")
    print(f"Rollback leaf:  {ROLLBACK_LEAF}")

    if dry_run:
        print("\n[dry-run] No files modified.")
        return

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = path.with_suffix(f".jsonl.bak.{ts}")
    shutil.copy2(path, backup)
    path.write_text("\n".join(kept) + "\n", encoding="utf-8")
    print(f"\nBackup:  {backup}")
    print(f"Repaired: {path}")
    print("\nNext: claude --resume", session_id, "--dangerously-skip-permissions")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry = "--dry-run" in sys.argv
    sid = args[0] if args else SESSION_ID
    repair(sid, dry_run=dry)
