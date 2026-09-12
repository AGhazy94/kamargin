#!/usr/bin/env python3
"""Block recursive grep/find in Bash; point at rg or serena instead."""
import json
import os
import re
import shutil
import sys

try:
    payload = json.load(sys.stdin)
except (json.JSONDecodeError, ValueError):
    sys.exit(0)

if payload.get("tool_name") != "Bash":
    sys.exit(0)

# Never leave a machine without ripgrep unable to search at all.
SEARCH_PATH = os.pathsep.join(
    filter(None, [os.environ.get("PATH", ""), "/opt/homebrew/bin", "/usr/local/bin"])
)
if not shutil.which("rg", path=SEARCH_PATH):
    sys.exit(0)

command = payload.get("tool_input", {}).get("command", "")

# Quoted spans are data, not a command: a commit message that merely mentions the pattern
# must not be blocked. Costs a false negative on `sh -c "..."`; worth it. Heredoc bodies are
# data for the same reason — `git commit -F - <<EOF` carrying the pattern is prose, not a
# search. Known hole: nested quoting desynchronising the pairing on a long command.
HEREDOC = re.compile(r"<<-?\s*(['\"]?)(\w+)\1.*?^\s*\2\s*$", re.S | re.M)
UNQUOTED = HEREDOC.sub(" ", command)
UNQUOTED = re.sub(r"'[^']*'|\"[^\"]*\"", " ", UNQUOTED)

# A piped `| grep foo` is fine; a recursive directory walk is what rg replaces.
# [a-z]* so egrep/fgrep/zgrep do not slip past. The leading class also keeps `git log --grep=`
# out: there the match would have to start at `-`, not at whitespace.
GREP_CMD = re.compile(r"(?:^|[|&;(]|\s)[a-z]*grep\b")
# The flag may sit anywhere in the invocation, not just first: `grep -n pat -r src` is the
# form that slipped through until 2026-08-21. Bounded to one pipeline segment.
RECURSIVE_FLAG = re.compile(r"(?:^|\s)(?:-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)(?=\s|$)")


def is_recursive_grep(cmd):
    for segment in re.split(r"[|;&]", cmd):
        if GREP_CMD.search(segment) and RECURSIVE_FLAG.search(segment):
            return True
    return False
# The path is optional: `find -name x` walks `.` and is the form most often typed.
FIND_BY_NAME = re.compile(r"(?:^|[|&;(]|\s)find\b[^|;&]*?\s-(?:i?name|path|regex)\b")

def rewrite_grep(cmd):
    """Best-effort `grep -r ...` -> `rg ...`; None when the shape is unfamiliar."""
    m = re.search(r"(?:^|[|&;(]\s*)[a-z]*grep\s+((?:-\S+\s+)*)(.+)$", cmd)
    if not m:
        return None
    kept = []
    for f in m.group(1).split():
        if f.startswith("--include="):
            kept.append("-g " + f.split("=", 1)[1])
            continue
        if f == "--recursive" or f.startswith("--"):
            continue
        body = f.lstrip("-").replace("r", "").replace("R", "")
        if body:
            kept.append("-" + body)
    if not any(f.startswith("-") and "n" in f.lstrip("-") for f in kept):
        kept.insert(0, "-n")
    return " ".join(["rg", *kept, m.group(2).strip()])


def rewrite_find(cmd):
    """Best-effort `find <path> -name|-path <glob>` -> `rg --files -g <glob> [path]`."""
    m = re.search(r"(?:^|[|&;(]\s*)find\s+(?!-)(\S+)?\s*-(?:i?name|path)\s+(\S+)", cmd)
    if not m:
        return None
    path = m.group(1) or "."
    return "rg --files -g %s%s" % (m.group(2), "" if path == "." else " " + path)


def fix(suggestion):
    return " Run this instead:\n  " + suggestion if suggestion else ""


if is_recursive_grep(UNQUOTED):
    sys.stderr.write(
        "Blocked: recursive grep.%s\n"
        "Text -> rg (gitignore-aware, no --include glob-quoting trap in zsh). Code symbol -> "
        "serena/LSP: find_symbol, find_referencing_symbols, find_declaration (load via "
        "ToolSearch select:mcp__serena__find_symbol,mcp__serena__find_referencing_symbols). "
        "A piped `... | grep foo` is fine; quote the pattern if you meant it as data. "
        "See .claude/rules/session-defaults.md\n" % fix(rewrite_grep(command))
    )
    sys.exit(2)

if FIND_BY_NAME.search(UNQUOTED):
    sys.stderr.write(
        "Blocked: `find` by -name/-path/-regex.%s\n"
        "Use `rg --files -g <glob>` or the Glob tool. `find -type d` is fine. "
        "See .claude/rules/session-defaults.md\n" % fix(rewrite_find(command))
    )
    sys.exit(2)

sys.exit(0)
