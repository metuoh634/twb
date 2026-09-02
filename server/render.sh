#!/bin/bash
# ビルド全体を1つのファイルにまとめることで、
# Render側の「1行コマンド欄」での改行・バックスラッシュ事故を防ぐ

set -e   # ← 途中のコマンドが1つでも失敗したら、その場でビルドを止める(原因を分かりやすくする)

echo "=== npm install ==="
npm install

echo "=== assets.zip をダウンロード ==="
curl -fL --retry 3 --retry-delay 5 "https://github.com/metuoh634/twb/releases/download/v1.0-assets/assets.zip" -o assets.zip

echo "=== zipファイルのサイズ確認 ==="
ls -lh assets.zip

echo "=== 展開前の空き容量 ==="
df -h

echo "=== 展開 ==="
unzip -o assets.zip -d ../client/

echo "=== 展開後の空き容量 ==="
df -h

echo "=== 後片付け ==="
rm assets.zip

echo "=== 展開されたファイル数 ==="
find ../client/assets -type f | wc -l