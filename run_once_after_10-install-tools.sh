#!/bin/bash
set -e

echo "=== Installing tools via mise ==="

eval "$(~/.local/bin/mise activate bash)"

# Trust the chezmoi-copied config files
~/.local/bin/mise trust ~/mise.toml 2>/dev/null || true
~/.local/bin/mise trust ~/mise.local.toml 2>/dev/null || true

# Install all tools (mise auto-merges mise.toml + mise.local.toml)
~/.local/bin/mise install

echo "=== Tools installed ==="
