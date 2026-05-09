#!/bin/bash
set -e

# Install Mise
curl https://mise.run | sh
eval "$(~/.local/bin/mise activate bash)"

# Trust and install tools declared in mise.toml
~/.local/bin/mise trust ./mise.toml
~/.local/bin/mise install

# Apply dotfiles from current repo
~/.local/bin/mise exec -- chezmoi -S . -v apply

# Trust the chezmoi-applied mise.toml so shims work in new shells
~/.local/bin/mise trust ~/mise.toml
