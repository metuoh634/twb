import * as utils2 from '../shared/utils2.js';
import { canvas, ctx } from './engine.js';

// マップ設定
export const MAP_WIDTH = 6800;
export const MAP_HEIGHT = 4500;

export let path = '/assets/MAP/カウル.png';
export let img = null;

//初期化
export async function init()
{
	img = await utils2.loadImage(path);
}

//画面更新
export function update(delta)
{
	// 1. フレームの最初にキャンバス全体をクリア
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// キャンバスの画面サイズに合わせて切り取る幅・高さを決定
	const sourceWidth = canvas.width;
	const sourceHeight = canvas.height;

	// マップ画像の中央を基準にした切り出し開始位置(x, y)を計算
	const sourceX = (img.width - sourceWidth) / 2;
	const sourceY = (img.height - sourceHeight) / 2;

	//マップ描画
	ctx.drawImage(
		img,
		sourceX, sourceY, sourceWidth, sourceHeight, // 元画像の中央部分を切り抜き
		0, 0, canvas.width, canvas.height            // 画面全体に1:1の等倍サイズで描画
	);
}