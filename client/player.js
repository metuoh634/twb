import { print, addLog } from '../shared/sub.js';
import * as utils2 from '../shared/utils2.js';

import * as input from './input.js';
import { canvas, ctx } from './engine.js';
import { MAP_WIDTH, MAP_HEIGHT, camera } from './world.js';

export const assets = {};
export const assetPaths =
{
	run_backside: '/assets/player/マキシミン/run/backside.png',
	run_backward: '/assets/player/マキシミン/run/backward.png',
	run_forside: '/assets/player/マキシミン/run/forside.png',
	run_forward: '/assets/player/マキシミン/run/forward.png',
	run_side: '/assets/player/マキシミン/run/side.png',

	idle_backside: '/assets/player/マキシミン/idle/backside.png',
	idle_backward: '/assets/player/マキシミン/idle/backward.png',
	idle_forside: '/assets/player/マキシミン/idle/forside.png',
	idle_forward: '/assets/player/マキシミン/idle/forward.png',
	idle_side: '/assets/player/マキシミン/idle/side.png'
};

export let isRunning = true; 				//走り/歩き
export let state = "idle";
export let direction = "forward";
export let flip = false;//false=左
export const position = { x: 50, y: 50 };	//プレイヤー位置
export let currentFrame = 0; 				// 何コマ目を表示しているか(0番目からスタート)
//export const ANIMATION_SPEED = 10; 		// フレーム更新の速さ（値が小さいほど速い）
export let FRAME_DURATION = 0.1;			// アニメーションの更新間隔（秒単位：例 0.1秒ごとに1コマ進める）
export let frameTimer = 0;					// コマ切り替え用の経過時間カウンター
export const MOVE_SPEED = 200; // 1秒あたりの移動ピクセル数
export const SPRITE_WIDTH = 70;
export const SPRITE_HEIGHT = 95;

//初期化
export async function init()
{
	//画像読み込み　ループで一気に Image オブジェクトを作る
	for (const [key, path] of Object.entries(assetPaths))
	{
		try
		{
			assets[key] = [];
			assets[key].img = await utils2.loadImage(path);
			assets[key].frameWidth = SPRITE_WIDTH;
			assets[key].frameHeight = SPRITE_HEIGHT;
			assets[key].frameCount = assets[key].img.width / assets[key].frameWidth;

		}
		catch (e)
		{
			addLog("ERROR", "プレイヤーファイル読み込みエラー：" + key + " " + e.message);
		}
	}
}

//移動しているかどうか
export function isMoving(key = input.keysPress)
{
	return (key.w || key.a || key.s || key.d);
}

//キーの移動量取得
export function getKeyMovement(key = input.keysPress)
{
	if (!isMoving())
		return { x: 0, y: 0 };

	let moveX = 0;
	let moveY = 0;

	// キー入力状態に応じて移動方向を設定
	if (key.w) moveY -= 1;
	if (key.s) moveY += 1;
	if (key.a) moveX -= 1;
	if (key.d) moveX += 1;

	// 斜め移動時に移動速度が速くならないよう正規化
	if (moveX !== 0 && moveY !== 0)
	{
		moveX *= Math.SQRT1_2; // 1 / sqrt(2)
		moveY *= Math.SQRT1_2;
	}

	return { x: moveX, y: moveY };
}

//位置移動
export function updatePosition(delta)
{
	if (isMoving())
	{
		//キー移動量取得
		let move = getKeyMovement();

		// 座標を更新
		position.x += move.x * MOVE_SPEED * delta;
		position.y += move.y * MOVE_SPEED * delta;

		// 💡変更：画面(canvas)の外ではなく、マップ全体(MAP_WIDTH/MAP_HEIGHT)の外に出ないよう制限する
		position.x = Math.max(0, Math.min(MAP_WIDTH - SPRITE_WIDTH, position.x));
		position.y = Math.max(0, Math.min(MAP_HEIGHT - SPRITE_HEIGHT, position.y));
	}
}

//キャラ(状態、方向、反転)の設定
export function updateState(key = input.keysPress)
{
	let changed = false;
	let s = state;
	let d = direction;
	let f = flip;

	//状態
	if (isMoving())
		s = isRunning ? "run" : "walk";
	else
		s = "idle";

	// 8方向の判定 (45度ずつ分割)
	if (key.s && key.d) { d = 'forside'; f = true; }			// 右下（左下を反転）
	else if (key.a && key.s) { d = 'forside'; f = false; }						// 左下
	else if (key.a && key.w) { d = 'backside'; f = false; }					// 左上
	else if (key.d && key.w) { d = 'backside'; f = true; }	// 右上（左上を反転）
	else if (key.w) { d = 'backward'; }									// 上
	else if (key.a) { d = 'side'; f = false; }						// 左
	else if (key.s) { d = 'forward'; }									// 下
	else if (key.d) { d = 'side'; f = true; }						// 右（左を反転）

	changed = (s != state || d != direction || f != flip);

	state = s;
	direction = d;
	flip = f;

	return changed;
}

//画面更新
export function update(delta)
{
	//移動処理を追加
	updatePosition(delta);

	//状態変化
	if (updateState())
	{
		currentFrame = 0;
	}

	//addLog("direction:" + olddirection + "→" + direction + " state:" + oldstate + "→" + state);

	let asset = assets[state + "_" + direction];

	//実際に経過した時間(delta)を加算する
	frameTimer += delta;

	// 設定した時間（0.1秒）を超えたらコマを進める
	if (frameTimer >= FRAME_DURATION)
	{
		// 余剰時間を保持してタイミングを滑らかに維持する
		frameTimer %= FRAME_DURATION;

		// 最後のコマまで来たら最初のコマに戻る
		currentFrame = (currentFrame + 1) % asset.frameCount;
	}

	// 描画前に一旦キャンバスをクリアする
	//ctx.clearRect(position.x, position.y, player.frameWidth, player.frameHeight);

	//ワールド座標(position)からカメラ位置を引いて「画面上の描画位置」を求める、プレイヤーが動いてもカメラが追従して常に画面中央に見える
	const screenX = position.x - camera.x;
	const screenY = position.y - camera.y;

	// スプライトシートから該当コマだけを切り出して描画する
	if (flip)
	{
		//描画状態（座標系の回転・拡大縮小・移動、透過度、塗りつぶし色など）をスタックに保存・復元するための命令
		ctx.save();
		ctx.scale(-1, 1);
		ctx.drawImage(
			asset.img,
			currentFrame * asset.frameWidth, 0, asset.frameWidth, asset.frameHeight,
			-screenX - asset.frameWidth, screenY, asset.frameWidth, asset.frameHeight // 💡変更：position→screenX/screenY
		);
		ctx.restore();
	}
	else
	{
		ctx.drawImage(
			asset.img,
			currentFrame * asset.frameWidth, 0, asset.frameWidth, asset.frameHeight,
			screenX, screenY, asset.frameWidth, asset.frameHeight // 💡変更：position→screenX/screenY
		);
	}
}