#!/bin/bash
set -e

# Install Mise
curl https://mise.run | sh

# Trust configs BEFORE activating shell hooks (prevents parse errors)
~/.local/bin/mise trust ./mise.toml

# Pre-trust the target path so post-chezmoi shells don't error
~/.local/bin/mise trust ~/mise.toml 2>/dev/null || true

eval "$(~/.local/bin/mise activate bash)"

# Install tools declared in mise.toml
~/.local/bin/mise install

# Apply dotfiles from current repo
~/.local/bin/mise exec -- chezmoi -S . -v apply
