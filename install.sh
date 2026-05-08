#!/bin/bash
set -e

# Install Mise
curl https://mise.run | sh
eval "$(~/.local/bin/mise activate bash)"

# Install Chezmoi via Mise
mise use --global chezmoi@2.70.3

# Re-activate so chezmoi is now on $PATH
eval "$(~/.local/bin/mise activate bash)"

# Apply dotfiles from current repo mmm
~/.local/bin/mise exec -- chezmoi -S . -v apply

