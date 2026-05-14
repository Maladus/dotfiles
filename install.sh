#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Devcontainer bootstrap from $REPO_DIR ==="

# 1. Install mise
if [[ ! -x ~/.local/bin/mise ]]; then
    curl https://mise.run | sh
fi

~/.local/bin/mise trust "$REPO_DIR"

# 2. Install chezmoi + age globally via mise (needed before chezmoi apply for encrypted templates)
~/.local/bin/mise use -g chezmoi age

# 3. Apply dotfiles — chezmoi copies files and runs run_once_after_* scripts
~/.local/bin/mise exec -- chezmoi apply -S "$REPO_DIR"
