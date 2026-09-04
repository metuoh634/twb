import { print, addLog } from '../shared/sub.js';

import * as utils2 from './utils2.js';
import * as input from './input.js';
import { canvas, ctx } from './engine.js';
import { MAP_WIDTH, MAP_HEIGHT, camera } from './world.js';

export let charactorName = "maximin";
export let isSitting = false;				//立ち/座り
export let isRunning = true; 				//走り/歩き
export let state = "idle";
export let direction = "forward";
export let flip = false;//false=左
export const position = { x: 2585, y: 1956 };	//プレイヤー位置
export let currentFrame = 0; 				// 何コマ目を表示しているか(0番目からスタート)
//export const ANIMATION_SPEED = 10; 		// フレーム更新の速さ（値が小さいほど速い）
export let FRAME_DURATION = 0.07;			// アニメーションの更新間隔（秒単位：例 0.1秒ごとに1コマ進める）
export let frameTimer = 0;					// コマ切り替え用の経過時間カウンター
export const MOVE_SPEED = 200; 				// 1秒あたりの移動ピクセル数
export const MOVE_SPEED_X_RATIO = 1.66;		//横方向の体感速度を補正するための倍率、横長なほど横移動が遅く感じる
//export const MOVE_SPEED_X = 330;			// 横移動の速さ（1秒あたりのピクセル数）
//export const MOVE_SPEED_Y = 200;			// 縦移動の速さ（1秒あたりのピクセル数）
export const SPRITE_WIDTH = 70;
export const SPRITE_HEIGHT = 95;

export let moveTarget = null;// マウスクリックで指定した「目的地」（ワールド座標）、null のときは目的地なし＝マウスでは移動していない状態
const MOVE_TARGET_THRESHOLD = 4;// 目的地にどれだけ近づいたら「到着」とみなすか（px）

export const assets = {};
export const assetPaths =
{
	run_backside: '/assets/player/' + charactorName + '/run/backside.png',
	run_backward: '/assets/player/' + charactorName + '/run/backward.png',
	run_forside: '/assets/player/' + charactorName + '/run/forside.png',
	run_forward: '/assets/player/' + charactorName + '/run/forward.png',
	run_side: '/assets/player/' + charactorName + '/run/side.png',

	idle_backside: '/assets/player/' + charactorName + '/idle/backside.png',
	idle_backward: '/assets/player/' + charactorName + '/idle/backward.png',
	idle_forside: '/assets/player/' + charactorName + '/idle/forside.png',
	idle_forward: '/assets/player/' + charactorName + '/idle/forward.png',
	idle_side: '/assets/player/' + charactorName + '/idle/side.png',
};


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

//足元座標
export function getFoot(screenX, screenY)
{
	return { x: screenX + SPRITE_WIDTH / 2 + 0, y: screenY + SPRITE_HEIGHT - 14.5 };
}

//キーボードのw/a/s/dが押されているかどうか
function isKeyMoving(key = input.keysPress)
{
	return (key.w || key.a || key.s || key.d);
}

//移動しているかどうか（キーボード操作 or バーチャル十字キー or マウスの目的地移動）
export function isMoving(key = input.keysPress)
{
	const virtualMoving = (input.virtualMove.x !== 0 || input.virtualMove.y !== 0);

	return isKeyMoving(key) || virtualMoving || moveTarget !== null;
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

	// バーチャル十字キー（スマホ）の入力があれば、それを使う
	if (input.virtualMove.x !== 0 || input.virtualMove.y !== 0)
	{
		// タッチ操作を優先する（マウスクリックでの目的地移動は中断する）
		moveTarget = null;
		return { x: input.virtualMove.x, y: input.virtualMove.y };
	}

	// マウスの目的地に向かって移動する
	if (moveTarget)
	{
		// スプライトの中央ではなく「足元（下端の中央）」を基準にする、クリックした場所に、見た目の足がぴったり来るようにするため
		const foot = getFoot(position.x, position.y);

		const dx = moveTarget.x - foot.x;
		const dy = moveTarget.y - foot.y;
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
export function updatePosition(delta, move)
{
	if (move.x !== 0 || move.y !== 0)
	{
		if (moveTarget)
		{
			//マウス移動中は、x/yを別々に加速するのではなく
			// 「進む向き」に応じた1つの速度を、x・yどちらにも同じ倍率でかける
			// （move.xが1に近い＝横方向に近いほど、速度がMOVE_SPEED_X_RATIO倍に近づく）
			// こうすることで実際に進む向きが必ずmove.x, move.yと一致し、
			// 目的地付近で急に向きが変わらなくなる
			const speed = MOVE_SPEED * (1 + Math.abs(move.x) * (MOVE_SPEED_X_RATIO - 1));

			position.x += move.x * speed * delta;
			position.y += move.y * speed * delta;
		}
		else
		{
			// キーボード・バーチャル十字キーの場合は、これまで通り横方向にだけ比率を掛ける
			position.x += move.x * MOVE_SPEED * MOVE_SPEED_X_RATIO * delta;
			position.y += move.y * MOVE_SPEED * delta;
		}

		// 画面(canvas)の外ではなく、マップ全体(MAP_WIDTH/MAP_HEIGHT)の外に出ないよう制限する
		position.x = Math.max(0, Math.min(MAP_WIDTH - SPRITE_WIDTH, position.x));
		position.y = Math.max(0, Math.min(MAP_HEIGHT - SPRITE_HEIGHT, position.y));
	}
}

//キャラ(状態、方向、反転)の設定
export function updateState(move)
{
	let changed = false;
	let s = state;
	let d = direction;
	let f = flip;

	//状態
	if (move.x !== 0 || move.y !== 0)
		s = isRunning ? "run" : "walk";
	else
		s = "idle";

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


// クリックした場所を目的地として登録する関数(game.jsなどで呼び出し用)
export function setMoveTarget(x, y)
{
	moveTarget = { x, y };
}

//画面更新
export function update(delta)
{
	//移動量はここで1回だけ計算し、updatePositionとupdateStateの両方に渡す、2回計算すると、その間にpositionが変わってしまい向きがズレるため
	const move = getMovement();

	//移動処理を追加
	updatePosition(delta, move);

	//状態変化
	if (updateState(move))
	{
		//状態変化したらフレームは最初に
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

	const foot = getFoot(screenX, screenY);

	//影の描画
	utils2.drawCircle(
		ctx, 'rgba(0, 0, 0, 0.6)', foot.x, foot.y,
		SPRITE_WIDTH * 0.25,//幅
		SPRITE_WIDTH * 0.1//高さ
	);
	//utils2.drawShadow(ctx, 'rgba(0, 0, 0, 0.5)', screenX + 5, screenY - 15, SPRITE_WIDTH - 10, SPRITE_HEIGHT);

	// スプライトシートから該当コマだけを切り出して描画する
	if (flip)
	{
		//描画状態（座標系の回転・拡大縮小・移動、透過度、塗りつぶし色など）をスタックに保存・復元するための命令
		ctx.save();
		ctx.scale(-1, 1);
		ctx.drawImage(
			asset.img,
			currentFrame * asset.frameWidth, 0, asset.frameWidth, asset.frameHeight,
			-screenX - asset.frameWidth, screenY, asset.frameWidth, asset.frameHeight // position→screenX/screenY
		);
		ctx.restore();
	}
	else
	{
		ctx.drawImage(
			asset.img,
			currentFrame * asset.frameWidth, 0, asset.frameWidth, asset.frameHeight,
			screenX, screenY, asset.frameWidth, asset.frameHeight // position→screenX/screenY
		);
	}
}

