import { keys, keysPress, mouseInfo } from './input.js';
import { print } from '../shared/sub.js';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
	//map: '/assets/maps/map.png',

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
	//ループで一気に Image オブジェクトを作る
	for (const [key, path] of Object.entries(assetPaths))
	{
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
	ctx.save();
	if (next.flip)
	{
		ctx.scale(-1, 1);
		ctx.drawImage(
			player.img,
			currentFrame * player.frameWidth, 0, player.frameWidth, player.frameHeight,
			-position.x - player.frameWidth, position.y, player.frameWidth, player.frameHeight
		);
	} else
	{
		ctx.drawImage(
			player.img,
			currentFrame * player.frameWidth, 0, player.frameWidth, player.frameHeight,
			position.x, position.y, player.frameWidth, player.frameHeight
		);
	}
	ctx.restore();

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




/*

// node_modules 内のモジュールファイルを直接パスで指定する
//import * as THREE from 'three';
//import GUI from 'lil-gui';
//import { Timer } from './node_modules/three/src/core/Timer.js';
//import * as utils from './utils.js';
//import { addLog } from './utils.js';
//import * as engine from './engine.js';
import * as input from './input.js';
import { keys, mouseInfo } from './input.js';
//import * as windows from './windows.js';
//import * as world from './world.js';
//import { entity } from './entity.js';

let player;
let player2;
let cube;

//初期化(非同期)
async function init()
{
	//ウィンドウズ初期化
	windows.init();

	//scene;camera;renderer;controls;gui;timer;
	engine.init();

	// 通信の初期化
	socket.init();
	//chat.init();

	//マップ読み込み
	world.init(engine.scene); //await

	//キャラクター読み込み
	player = new entity(true);
	player.scale = 0.077;
	player.init(engine.scene, file_player); //await
	// 初期化が成功したときだけ、外部からアクセス可能にする
	//newPlayer.init(engine.scene, file_player).then((result) => { if (result) player = newPlayer; });

	//キャラクター2
	player2 = new entity(false);
	player2.scale = 0.5;
	player2.init(engine.scene, file_player2); //await
	player2.model.position.z += -2;
	player2.model.position.x += 2;


	//キューブ
	cube = await utils.createCube(engine.scene, 2, 5, -10);

	return true;

} //init()

///////イベント//////////

//キーイベント
document.addEventListener('keydown', (e) =>
{
	if (player.SendChat(e))
	{
	}
	else
	{
		//キー状態更新
		input.getKeyState_keydown(e);
	}
});
document.addEventListener('keyup', (e) =>
{
	//キー状態更新
	input.getKeyState_keyup(e);
});
// マウスを動かしているとき
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener('mousedown', (e) =>
{
	//マウス状態更新
	input.getMouseState_mousedown(e);

	if (player)
		player.mousedown()
});
// マウスを動かしているとき
document.addEventListener('mousemove', (e) =>
{
	input.getMouseState_mousemove(e);

	if (mouseInfo.right)
	{
		//カメラ
		engine.camera_MouseMove(e);

	}

	//addLog("INFO", "window.mousemove" + mouseInfo.right);
	//windows.mousemove(e);
});
// マウスを離したとき
document.addEventListener('mouseup', (e) =>
{
	//マウス状態更新
	input.getMouseState_mouseup(e);

	//addLog("INFO", "window.mouseup" + mouseInfo.right);
	//windows.mouseup(e);

});
// マウスホイールのイベント
window.addEventListener('wheel', (e) =>
{
	input.getMouseState_mousewheel(e);
	//engine.camera_MouseWheel();
});

// 画面外に出た
window.addEventListener('mouseleave', () =>
{
});

// タブが切り替わったり別ウィンドウに移った
window.addEventListener('blur', () =>
{
});

//メニューが表示されたとき
document.addEventListener('contextmenu', (e) =>
{
	//ブラウザの標準右クリックメニューが出ないようにする
	e.preventDefault();
});

// 画面リサイズへの対応
window.addEventListener('resize', () =>
{
	engine.repaint();
});

// ページ読み込み時
window.addEventListener('load', () =>
{
	// ページの準備が完全に整ってからフォーカスを当てる
	engine.canvas.focus();
});


//windows.js
//チャット送信ボタン
windows.chatSendBtn.addEventListener('click', (e) =>
{
	player.SendChat();
});



//アニメフレーム処理　直前のフレームと今のフレーム間で経過した時間[秒] を返す
function update(delta)
{
	//ウィンドウの変更 //pointerdownでやるため呼ばれない
	//if (windows.activeWindow)
	//	addLog("INFO", "update pointer" + Math.random());


	//プレイヤーの移動
	if (player)
		player.anime(delta);
	if (player2)
		player2.anime(delta);


	//カメラ更新
	if (engine && player)
		engine.camera_update(player.model);

	//3 回転させる //どこでもいい
	if (cube)
	{
		//cube.rotation.x += 0.01;
		cube.rotation.y += 0.01;
	}

	//4 OrbitControlsコントロールの更新  //どこでもいい
	if (engine.controls)
	{
		//engine.controls.target.copy(player.model.position);
		engine.controls.update();
	}
}


//アニメーションループ
function animate()
{
	//【1】 animate実行予約 //先頭に書く場合エラーで関数が途中で落ちたときでもループを維持
	//通常のループと違って、60fpsなら60fps毎の呼び出しになる？
	requestAnimationFrame(animate);

	//【2】 timerの時間を更新する timer.getDelta()より先に書く
	engine.timer.update();

	const rawDelta = engine.timer.getDelta(); // 本来のdelta
	let timeScale = 0.3; // 0.3倍速でスローモーションになる
	let delta = rawDelta;

	//スロー再生
	delta = rawDelta * timeScale;

	//【3-4】 timerの前フレームからの経過時間を取得してミキサーを更新　//timer.update()より後に書く
	// 最大30fps相当（約0.033秒）に制限
	update(delta = Math.min(rawDelta, 1 / 30));

	//【5】 描画　必ず最後
	engine.renderer.render(engine.scene, engine.camera);

	// 3. 【追加】HTMLの2Dチャットの位置をカメラの動きに同期して再描画！
	//if (chat.chatBubble)
	//	chat.chatBubble.render(engine.scene, engine.camera);

	//複数回呼ばれないためにキーを除去
	input.clearKeys();
}


//初期化、アニメーション
if (await init())
	requestAnimationFrame(animate);//アニメーションループ　この呼び方したほうが次のアニメーションフレームに開始できる
else
	addLog("INFO", "初期化に失敗しました");


//デバッグ表示

function showModelDebugInfo()
{
	if (!player)//|| !player.object3D)
		return;

	const div = document.getElementById('debugInfo');

	//サイズ情報更新
	//player.refreshBoxSize();

	//ポリゴン情報更新
	const player_obj = player.object3D;
	player_obj.update();

	const info = "[Model Debug Info]"
		+ "\n[Player]"
		+ "\nanimeState:" + player.animeState + " airState:" + player.airState
		+ "\nAnimations:" + (player.gltf && player.gltf.animations ? player.gltf.animations.length : "null")
		+ "\nMesh:" + player_obj.meshCount
		+ "\nBone:" + player_obj.boneCount
		+ "\nMaterial:" + player_obj.materialCount
		+ "\nVertex:" + player_obj.vertexCount.toLocaleString()
		+ "\nTriangle:" + Math.floor(player_obj.triangleCount).toLocaleString()
		+ "\nScale: " + player.model.scale.x.toFixed(3)
		+ "\nSize: X(" + player_obj.size.x.toFixed(2) + ") Y(" + player_obj.size.y.toFixed(2) + ") Z(" + player_obj.size.z.toFixed(2) + ")"
		+ "\nPosition: X(" + player.model.position.x.toFixed(2) + ") Y(" + player.model.position.y.toFixed(2) + ") Z(" + player.model.position.z.toFixed(2) + ")"

	div.textContent = info;
}
showModelDebugInfo();
setInterval(showModelDebugInfo, 500);


//レンダラーにフォーカス
engine.canvas.focus();


*/