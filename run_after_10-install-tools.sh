#!/bin/bash
set -e

echo "=== Ensuring mise tools are installed ==="

eval "$(~/.local/bin/mise activate bash)"

# Trust the chezmoi-copied config files
~/.local/bin/mise trust ~/mise.toml 2>/dev/null || true
~/.local/bin/mise trust ~/mise.local.toml 2>/dev/null || true

# Suppress npm deprecation warnings from transitive deps (e.g. pi-coding-agent)
export NPM_CONFIG_LOGLEVEL=error

# Install all tools (mise auto-merges mise.toml + mise.local.toml)
~/.local/bin/mise install

echo "=== Tools installed ==="
