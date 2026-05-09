#!/bin/bash
set -e

# Install Mise
curl https://mise.run | sh
eval "$(~/.local/bin/mise activate bash)"

# Install tools declared in mise.toml (chezmoi, node, pi, etc.)
~/.local/bin/mise install

# Apply dotfiles from current repo
~/.local/bin/mise exec -- chezmoi -S . -v apply
