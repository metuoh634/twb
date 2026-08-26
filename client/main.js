// node_modules 内のモジュールファイルを直接パスで指定する
//import * as THREE from 'three';
//import GUI from 'lil-gui';
import * as THREE from './node_modules/three/build/three.module.js';
import { Timer } from './node_modules/three/src/core/Timer.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import GUI from './node_modules/lil-gui/dist/lil-gui.esm.js';
import * as utils from './utils.js';
import { addLog } from './utils.js';
import * as socket from './ws_bin_client.js';
import * as engine from './engine.js';
import * as input from './input.js';
import { keys, mouseInfo } from './input.js';
import * as windows from './windows.js';
import * as world from './world.js';
import { entity } from './entity.js';

//ファイル
const file_player = "./assets/practice2018.glb";
const file_player2 = "./assets/remy.glb";


//ファイル一覧
//const glb_file = "./assets/practice2018.glb";
//const file_texture = "./assets/minecraft-box.png";

//ウィンドウズ
//let windows = [];
//let chatWindow;

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