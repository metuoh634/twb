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
			reject(err);
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
