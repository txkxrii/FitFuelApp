#!/bin/zsh
cd "$(dirname "$0")"
echo "FitFuel preview draait op http://localhost:4173"
echo "Laat dit venster open zolang je de app gebruikt."
python3 -m http.server 4173 --bind 127.0.0.1
