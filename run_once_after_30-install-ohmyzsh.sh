#!/bin/bash
set -e

ZSH_DIR="$HOME/.oh-my-zsh"

if [[ -d "$ZSH_DIR/.git" ]]; then
    echo "=== Oh My Zsh already installed at $ZSH_DIR — skipping clone ==="
    exit 0
fi

if [[ -e "$ZSH_DIR" ]]; then
    echo "WARNING: $ZSH_DIR exists but is not a git repo — leaving it untouched."
    echo "Remove it manually if you want a fresh install."
    exit 0
fi

echo "=== Cloning Oh My Zsh into $ZSH_DIR ==="
git clone --depth=1 https://github.com/ohmyzsh/ohmyzsh.git "$ZSH_DIR"

echo "=== Oh My Zsh installed ==="
