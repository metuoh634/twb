import { print, addLog } from '../shared/sub.js';
import * as utils2 from '../shared/utils2.js';

import * as windows from './windows.js';
import { canvas, ctx } from './engine.js';
import * as engine from './engine.js';
import * as input from './input.js';
import { keys, keysPress, mouseInfo } from './input.js';
import * as world from './world.js';
import * as player from './player.js';
import * as chat from './chat.js';

//初期化
async function init()
{
	engine.init();
	windows.init();
	await chat.init();

	await player.init();
	await world.init();
}

//画面更新
let firstUpdate = false;
function update(delta)
{
	// カメラ計算のため、プレイヤーの中心座標を渡す
	const centerX = player.position.x + player.SPRITE_WIDTH / 2;
	const centerY = player.position.y + player.SPRITE_HEIGHT / 2;

	//マップ描画
	world.update(delta, centerX, centerY);

	//プレイヤー画面更新
	player.update(delta);

	//if (!firstUpdate)
	chat.update();

	firstUpdate = true;
}

//アニメーション
let lastTime = null;
function animate(currentTime)
{
	if (!lastTime)
		lastTime = currentTime;

	// ゲーム状態の更新（移動速度などに deltaTime を掛ける）
	try
	{
		// 前のフレームからの経過時間（秒単位）
		const deltaTime = (currentTime - lastTime) / 1000;

		update(deltaTime);
		requestAnimationFrame(animate);
	}
	catch (e)
	{
		print("red", "animation: " + e.message);
	}

	lastTime = currentTime;
}


//初期化
await init();

//ゲーム開始
requestAnimationFrame(animate);


//デバッグ表示
function showModelDebugInfo()
{
	if (!player)//|| !player.object3D)
		return;

	const div = document.getElementById('debugInfo');

	div.textContent = "[Model Debug Info]"
		+ "\n[World]"
		+ "\n camera.x:" + world.camera.x.toFixed(3) + " camera.y:" + world.camera.y.toFixed(3)
		+ "\n[Player]"
		+ "\n position.x:" + player.position.x.toFixed(3) + " position.y:" + player.position.y.toFixed(3)
		+ "\n state:" + player.state + " direction:" + player.direction + " flip:" + player.flip
}
showModelDebugInfo();
setInterval(showModelDebugInfo, 500);

//レンダラーにフォーカス
engine.canvas.focus();