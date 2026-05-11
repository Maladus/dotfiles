#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Devcontainer bootstrap from $REPO_DIR ==="

# 1. Install mise
if [[ ! -x ~/.local/bin/mise ]]; then
    curl https://mise.run | sh
fi

~/.local/bin/mise trust "$REPO_DIR"
eval "$(~/.local/bin/mise activate bash)"

# 2. Install chezmoi globally via mise (don't read repo mise.toml yet)
~/.local/bin/mise use -g chezmoi

# 3. Apply dotfiles — chezmoi copies files and runs run_once_after_* scripts
chezmoi apply -S "$REPO_DIR"
