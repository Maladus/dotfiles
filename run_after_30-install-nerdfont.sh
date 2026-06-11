#!/bin/bash
set -e

# Install JetBrains Mono Nerd Font (https://www.nerdfonts.com/)
# Idempotent: skips if already installed. Downloads from latest GitHub release.

FONT_NAME="JetBrainsMono Nerd Font"
FONT_DIR="$HOME/.local/share/fonts/JetBrainsMono Nerd Font"
FONTS_ZIP="/tmp/JetBrainsMono.zip"

if [ -d "$FONT_DIR" ] && [ -n "$(ls -A "$FONT_DIR" 2>/dev/null)" ]; then
    echo "JetBrainsMono Nerd Font already installed at $FONT_DIR"
    exit 0
fi

echo "=== Installing JetBrainsMono Nerd Font ==="

mkdir -p "$HOME/.local/share/fonts"

# Get the latest release URL from GitHub API
RELEASE_URL=$(curl -fsSL https://api.github.com/repos/ryanoasis/nerd-fonts/releases/latest \
    | grep -oE '"browser_download_url":\s*"[^"]*JetBrainsMono\.zip"' \
    | head -1 \
    | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$RELEASE_URL" ]; then
    echo "ERROR: could not determine latest JetBrainsMono Nerd Font release URL"
    echo "Falling back to a known-good version (v3.2.1)..."
    RELEASE_URL="https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/JetBrainsMono.zip"
fi

echo "Downloading from: $RELEASE_URL"
curl -fsSL -o "$FONTS_ZIP" "$RELEASE_URL"

# Unzip into the font directory
mkdir -p "$FONT_DIR"
unzip -o -q "$FONTS_ZIP" -d "$FONT_DIR"
rm "$FONTS_ZIP"

# Refresh the font cache
if command -v fc-cache >/dev/null 2>&1; then
    fc-cache -f
    echo "Font cache refreshed."
else
    echo "fc-cache not found — font may not be picked up by applications."
    echo "Install fontconfig (e.g. 'apt install fontconfig') and re-run."
fi

echo ""
echo "=== JetBrainsMono Nerd Font installed. ==="
echo "To use it, set your terminal font to: $FONT_NAME"
