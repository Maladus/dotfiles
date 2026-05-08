#!/bin/bash
set -e

# Install Mise
curl https://mise.run | sh
eval "$(~/.local/bin/mise activate bash)"

# Install Chezmoi via Mise
mise use --global chezmoi@2.70.3

# Install Node + Pi only in container environments
if [ -f /.dockerenv ] || grep -qa 'podman\|docker' /proc/1/cgroup 2>/dev/null; then
    ~/.local/bin/mise use --global node@lts
    ~/.local/bin/mise use --global npm:@earendil-works/pi-coding-agent
fi

# Apply dotfiles from current repo mmm
~/.local/bin/mise exec -- chezmoi -S . -v apply

