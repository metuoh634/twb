import { canvas, ctx } from './engine.js';
import * as engine from './engine.js';
import { keys, keysPress, mouseInfo } from './input.js';
import { print } from '../shared/sub.js';


const SPRITE_WIDTH = 70;
const SPRITE_HEIGHT = 95;
const ANIMATION_SPEED = 10; 		// フレーム更新の速さ（値が小さいほど速い）


let state = "idle_forward";
const position = { x: 50, y: 50 };	//プレイヤー位置
let currentFrame = 0; 				// 何コマ目を表示しているか(0番目からスタート)
let frameSpeed = 15;				// 何回描画するごとにコマを進めるか(値を大きくすると動きがゆっくりになる)
let FRAME_DURATION = 0.1;			// アニメーションの更新間隔（秒単位：例 0.1秒ごとに1コマ進める）
let frameTimer = 0;					// コマ切り替え用の経過時間カウンター
let lastTime = 0;

// マップ設定
const MAP_WIDTH = 6800;
const MAP_HEIGHT = 4500;

const assets = {};
const assetPaths =
{
	map: '/assets/maps/map.png',

	run_backside: '/assets/player/run_backside.png',
	run_backward: '/assets/player/run_backward.png',
	run_forside: '/assets/player/run_forside.png',
	run_forward: '/assets/player/run_forward.png',
	run_side: '/assets/player/run_side.png',

	idle_backside: '/assets/player/idle_backside.png',
	idle_backward: '/assets/player/idle_backward.png',
	idle_forside: '/assets/player/idle_forside.png',
	idle_forward: '/assets/player/idle_forward.png',
	idle_side: '/assets/player/idle_side.png'
};

//画像イメージ同期処理
function loadImage(src)
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

async function init()
{
	engine.init();

	//ループで一気に Image オブジェクトを作る
	for (const [key, path] of Object.entries(assetPaths))
	{
		// map画像は単体画像として扱う
		if (path.includes('map'))
		{
			assets.map = { img: await loadImage(path) };
			continue;
		}

		assets[key] = [];
		assets[key].img = await loadImage(path);
		assets[key].frameWidth = SPRITE_WIDTH;
		assets[key].frameHeight = SPRITE_HEIGHT;
		assets[key].frameCount = assets[key].img.width / assets[key].frameWidth;
	}
}

// 角度から「使用する画像」と「反転フラグ」を決定する関数
/*
function getAngleState()
{
	const a = this.angle;
	let key = 'forward';
	let flip = false;

	// 8方向の判定 (45度ずつ分割)
	if (a >= 22.5 && a < 67.5) { key = 'forside'; flip = true; }  // 右下（左下を反転）
	else if (a >= 67.5 && a < 112.5) key = 'forward';               // 下
	else if (a >= 112.5 && a < 157.5) key = 'forside';               // 左下
	else if (a >= 157.5 && a < 202.5) key = 'side';                  // 左
	else if (a >= 202.5 && a < 247.5) key = 'backside';              // 左上
	else if (a >= 247.5 && a < 292.5) key = 'backward';              // 上
	else if (a >= 292.5 && a < 337.5) { key = 'backside'; flip = true; }// 右上（左上を反転）
	else { key = 'side'; flip = true; }     // 右（左を反転）

	// 例: 'run_forside' や 'idle_forward' などのキー名を生成
	const imgKey = `${this.state}_${key}`;
	return { img: assets[imgKey], flip: flip };
}*/

function getKeyAnimeState()
{
	let stat = "idle"
	let direction = 'forward';
	let flip = false;

	if (keysPress.w || keysPress.a || keysPress.s || keysPress.d)
		stat = "run";


	// 8方向の判定 (45度ずつ分割)
	if (keysPress.s && keysPress.d) { direction = 'forside'; flip = true; }  // 右下（左下を反転）
	else if (keysPress.a && keysPress.s) direction = 'forside';               // 左下
	else if (keysPress.a && keysPress.w) direction = 'backside';              // 左上
	else if (keysPress.d && keysPress.w) { direction = 'backside'; flip = true; }// 右上（左上を反転）
	else if (keysPress.w) direction = 'backward';              // 上
	else if (keysPress.a) direction = 'side';                  // 左
	else if (keysPress.s) direction = 'forward';               // 下
	else if (keysPress.d) { direction = 'side'; flip = true; }     // 右（左を反転）

	return { state: stat + "_" + direction, flip: flip };
	// 例: 'run_forside' や 'idle_forward' などのキー名を生成
	//const imgKey = `${this.state}_${key}`;
	//return { img: assets[imgKey], flip: flip };
}


//画面更新
function update(delta)
{
	// 1. フレームの最初にキャンバス全体をクリア
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// 2. 背景マップを画面（キャンバス）全体いっぱいに表示
	let map = assets.map.img;

	// キャンバスの画面サイズに合わせて切り取る幅・高さを決定
	const sourceWidth = canvas.width;
	const sourceHeight = canvas.height;

	// マップ画像の中央を基準にした切り出し開始位置(x, y)を計算
	const sourceX = (map.width - sourceWidth) / 2;
	const sourceY = (map.height - sourceHeight) / 2;

	ctx.drawImage(
		map,
		sourceX, sourceY, sourceWidth, sourceHeight, // 元画像の中央部分を切り抜き
		0, 0, canvas.width, canvas.height            // 画面全体に1:1の等倍サイズで描画
	);


	//プレイヤー描画
	let next = getKeyAnimeState();
	if (next.state != state)
	{
		currentFrame = 0;
		state = next.state;
	}

	let player = assets[state];

	//実際に経過した時間(delta)を加算する
	frameTimer += delta;

	// 設定した時間（0.1秒）を超えたらコマを進める
	if (frameTimer >= FRAME_DURATION)
	{
		// 余剰時間を保持してタイミングを滑らかに維持する
		frameTimer %= FRAME_DURATION;

		// 最後のコマまで来たら最初のコマに戻る
		currentFrame = (currentFrame + 1) % player.frameCount;
	}

	// 描画前に一旦キャンバスをクリアする
	ctx.clearRect(position.x, position.y, player.frameWidth, player.frameHeight);

	// スプライトシートから該当コマだけを切り出して描画する
	if (next.flip)
	{
		//描画状態（座標系の回転・拡大縮小・移動、透過度、塗りつぶし色など）をスタックに保存・復元するための命令
		ctx.save();
		ctx.scale(-1, 1);
		ctx.drawImage(
			player.img,
			currentFrame * player.frameWidth, 0, player.frameWidth, player.frameHeight,
			-position.x - player.frameWidth, position.y, player.frameWidth, player.frameHeight
		);
		ctx.restore();
	}
	else
	{
		ctx.drawImage(
			player.img,
			currentFrame * player.frameWidth, 0, player.frameWidth, player.frameHeight,
			position.x, position.y, player.frameWidth, player.frameHeight
		);
	}


}

//アニメーション
function animate(currentTime)
{
	if (!lastTime)
		lastTime = currentTime;

	// 前のフレームからの経過時間（秒単位）
	const deltaTime = (currentTime - lastTime) / 1000;
	lastTime = currentTime;

	// ゲーム状態の更新（移動速度などに deltaTime を掛ける）
	try
	{
		update(deltaTime);
		requestAnimationFrame(animate);
	}
	catch (e)
	{
		print("red", e.message);
	}
}

//初期化
await init();

//ゲーム開始
requestAnimationFrame(animate);