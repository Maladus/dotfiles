#!/bin/bash
set -e

echo "=== Ensuring tmux plugin manager (TPM) is installed ==="

TPM_DIR="$HOME/.tmux/plugins/tpm"

if [ -d "$TPM_DIR" ]; then
    echo "TPM already installed at $TPM_DIR"
else
    git clone https://github.com/tmux-plugins/tpm "$TPM_DIR"
    echo "TPM cloned to $TPM_DIR"
fi

echo ""
echo "Next steps:"
echo "  1. Start (or restart) tmux so it loads the new .tmux.conf and TPM"
echo "  2. Press 'prefix + I' (capital i) to install plugins"
echo ""
