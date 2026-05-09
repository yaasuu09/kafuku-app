#!/bin/bash
cd "$(dirname "$0")"
clear
python3 local_analysis.py
echo ""
read -p "終了するにはEnterキーを押してください..."
