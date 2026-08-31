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
export const position = { x: 2585, y: 1956 };	//プレイヤー位置
export let currentFrame = 0; 				// 何コマ目を表示しているか(0番目からスタート)
//export const ANIMATION_SPEED = 10; 		// フレーム更新の速さ（値が小さいほど速い）
export let FRAME_DURATION = 0.1;			// アニメーションの更新間隔（秒単位：例 0.1秒ごとに1コマ進める）
export let frameTimer = 0;					// コマ切り替え用の経過時間カウンター
export const MOVE_SPEED = 200; // 1秒あたりの移動ピクセル数
export const SPRITE_WIDTH = 70;
export const SPRITE_HEIGHT = 95;

// マウスクリックで指定した「目的地」（ワールド座標）、null のときは目的地なし＝マウスでは移動していない状態
export let moveTarget = null;
// 目的地にどれだけ近づいたら「到着」とみなすか（px）
const MOVE_TARGET_THRESHOLD = 4;

// game.js側から呼び出して、クリックした場所を目的地として登録する関数
export function setMoveTarget(x, y)
{
	moveTarget = { x, y };
}




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

//キーボードのw/a/s/dが押されているかどうか
function isKeyMoving(key = input.keysPress)
{
	return (key.w || key.a || key.s || key.d);
}

//移動しているかどうか
export function isMoving(key = input.keysPress)
{
	return isKeyMoving(key) || moveTarget !== null;
}

//キーの移動量取得
export function getMovement(key = input.keysPress)
{
	// キーボード入力があれば、そちらを優先する（マウス移動は中断する）
	if (isKeyMoving(key))
	{
		moveTarget = null;

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

	// マウスの目的地に向かって移動する
	if (moveTarget)
	{
		// プレイヤーの中心座標から目的地までの距離を計算する
		const centerX = position.x + SPRITE_WIDTH / 2;
		const centerY = position.y + SPRITE_HEIGHT / 2;
		const dx = moveTarget.x - centerX;
		const dy = moveTarget.y - centerY;
		const dist = Math.hypot(dx, dy);

		// 十分近づいたら到着とみなし、目的地をクリアする
		if (dist < MOVE_TARGET_THRESHOLD)
		{
			moveTarget = null;
			return { x: 0, y: 0 };
		}

		// 目的地の方向を向いた「長さ1のベクトル」を返す
		return { x: dx / dist, y: dy / dist };
	}


	return { x: 0, y: 0 };
}

//位置移動
export function updatePosition(delta)
{
	if (isMoving())
	{
		//移動量取得
		let move = getMovement();

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

	//key.w などの「キーの状態」ではなく、実際の移動方向ベクトルで8方向を判定する、キーボードでもマウスクリック移動でも同じ処理で向きが決まる
	const move = getMovement();

	// 動いていない場合は、直前の向きをそのまま維持する
	if (move.x !== 0 || move.y !== 0)
	{
		// 移動ベクトルの向いている角度を求める（画面はyが下向きなので、0=右、90°=下、180°=左、-90°=上）
		const angle = Math.atan2(move.y, move.x);

		// 角度を45度(=PI/4)刻みに丸めて、8方向のうちどれに一番近いかを求める（0〜7の整数）
		const octant = Math.round(angle / (Math.PI / 4)) & 7;

		// 求めた8方向の番号を、実際のスプライトの向き(d)と反転(f)に変換する
		switch (octant)
		{
			case 0: d = 'side'; f = true; break;			// 右
			case 1: d = 'forside'; f = true; break;		// 右下（左下を反転）
			case 2: d = 'forward'; f = false; break;		// 下
			case 3: d = 'forside'; f = false; break;		// 左下
			case 4: d = 'side'; f = false; break;			// 左
			case 5: d = 'backside'; f = false; break;		// 左上
			case 6: d = 'backward'; f = false; break;		// 上
			case 7: d = 'backside'; f = true; break;		// 右上（左上を反転）
		}
	}

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