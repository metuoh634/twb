//ctx.drawImage関数
//img	CanvasImageSource	描画する画像
//sx	number	元画像の切り抜き開始位置（X座標 / Source X）
//sy	number	元画像の切り抜き開始位置（Y座標 / Source Y）
//sw	number	元画像から切り抜く幅（Source Width）
//sh	number	元画像から切り抜く高さ（Source Height）
//dx	number	Canvas上の描画開始位置（X座標 / Destination X）
//dy	number	Canvas上の描画開始位置（Y座標 / Destination Y）
//dw	number	Canvas上に描画する幅（Destination Width）
//dh	number	Canvas上に描画する高さ（Destination Height）

//画像イメージ同期処理
export function loadImage(src)
{
	return new Promise((resolve, reject) =>
	{
		const img = new Image();
		img.onload = () =>
		{
			resolve(img);
		}
		img.onerror = (err) =>
		{
			reject(new Error(`画像の読み込みに失敗しました: ${src}`));
		}
		img.src = src;
	});
};

// 角度から「使用する画像」と「反転フラグ」を決定する関数
export function getDirection(angle)
{
	const a = angle;
	let direction = 'forward';
	let flip = false;

	// 8方向の判定 (45度ずつ分割)
	if (a >= 22.5 && a < 67.5) { direction = 'forside'; flip = true; }			// 右下（左下を反転）
	else if (a >= 67.5 && a < 112.5) direction = 'forward';						// 下
	else if (a >= 112.5 && a < 157.5) direction = 'forside';					// 左下
	else if (a >= 157.5 && a < 202.5) direction = 'side';						// 左
	else if (a >= 202.5 && a < 247.5) direction = 'backside';					// 左上
	else if (a >= 247.5 && a < 292.5) direction = 'backward';					// 上
	else if (a >= 292.5 && a < 337.5) { direction = 'backside'; flip = true; }	// 右上（左上を反転）
	else if (a >= 337.5 || a < 22.5) { direction = 'side'; flip = true; }		// 右（左を反転）
	else direction = "forward";

	return { direction: direction, flip: flip };
}


// 汎用の楕円（円）描画関数
// ctx      : 描画先のCanvasコンテキスト
// color    : 塗りつぶす色（例 'rgba(0,0,0,0.35)'）
// x, y     : 楕円の中心となる基準座標
// width    : 横方向の半径（拡大縮小前の基準サイズ）
// height   : 縦方向の半径（拡大縮小前の基準サイズ）
// scaleX   : width に掛ける倍率（1で等倍、0.5なら半分の幅）
// scaleY   : height に掛ける倍率（1で等倍、0.5なら半分の高さ）
export function drawCircle(ctx, color, x, y, width, height)
{
	// 倍率を掛けて、実際に描画する半径を求める
	const radiusX = width;// * scaleX;
	const radiusY = height;// * scaleY;

	// 描画状態（塗りつぶし色など）を一時的に保存する
	ctx.save();

	ctx.fillStyle = color;

	ctx.beginPath();
	// 楕円を描く（回転なし、0〜2π=1周分をすべて描く）
	ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
	ctx.fill();

	// 保存しておいた描画状態に戻す（他の描画に影響を与えないように）
	ctx.restore();
}