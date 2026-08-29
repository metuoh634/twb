import * as windows from './windows.js';
import { canvas, ctx } from './engine.js';
import * as engine from './engine.js';
import * as input from './input.js';
import { keys, keysPress, mouseInfo } from './input.js';
import * as player from './player.js';
import * as world from './world.js';
import { print, addLog } from '../shared/sub.js';
import * as utils2 from '../shared/utils2.js';

//初期化
async function init()
{
	engine.init();
	windows.init();

	await player.init();
	await world.init();

}

//画面更新
function update(delta)
{
	//マップ画面更新
	world.update(delta);

	//プレイヤー画面更新
	player.update(delta);
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