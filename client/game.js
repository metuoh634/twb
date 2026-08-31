import { print, addLog } from '../shared/sub.js';
import * as utils2 from '../shared/utils2.js';
import * as sub from '../shared/sub.js';

import * as windows from './windows.js';
import { canvas, ctx } from './engine.js';
import * as engine from './engine.js';
import * as input from './input.js';
import { keys, keysPress, mouseInfo } from './input.js';
import * as world from './world.js';
import * as player from './player.js';

//初期化
async function init()
{
	engine.init();
	windows.init();

	await player.init();
	await world.init();
}

//チャットを送信
function SendChat(e)
{
	if (e.key === 'Enter')
	{
		const text = windows.chatInput.value.trim();

		//サーバー未接続
		//if (!socket.connected)
		//{
		//	addLog("ERROR", "サーバーに接続されていません")
		//}
		//チャットウィンドウ非表示中
		if (!windows.chatWindow.isVisible())
		{
			windows.chatWindow.restore();
			windows.chatInput.focus();
		}
		//チャットバーにフォーカスある
		else if (document.activeElement === windows.chatInput)
		{
			//テキスト入力
			if (text === '')
				engine.canvas.focus();//3Dキャンバスに戻る
			else
			{
				socket.sendChat(text);//サーバーへチャット
				this.showBubble(text);//バブル表示
				windows.chatInput.value = '';// 入力欄をクリア
				engine.canvas.focus();//3Dキャンバスに戻る
			}
		}
		//チャットバーにフォーカス
		else
			windows.chatInput.focus();

		return true;
	}
	else
	{
		return document.activeElement === windows.chatInput;
	}
}

///////イベント//////////

const chatOpen = document.getElementById("chatOpen");
chatOpen.addEventListener('click', (e) =>
{
	sub.fullScreen();
});

document.addEventListener('keydown', (e) =>
{
	if (e.key === "c")
	{
		if (windows.chatWindow.isVisible())
		{
			windows.chatWindow.hide();
			//engine.canvas.focus();
		}
		else
		{
			windows.chatWindow.restore();
		}
	}
	else if (SendChat(e))
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

document.addEventListener('mousedown', (e) =>
{
	//マウス状態更新
	input.getMouseState_mousedown(e);

	//if (player)
	//	player.mousedown()
});
// マウスを動かしているとき
document.addEventListener('mousemove', (e) =>
{
	input.getMouseState_mousemove(e);

	//if (mouseInfo.right)
	//{
	//カメラ
	//	engine.camera_MouseMove(e);

	//}

	//addLog("INFO", "window.mousemove" + mouseInfo.right);
	//windows.mousemove(e);
});
// マウスを離したとき
document.addEventListener('mouseup', (e) =>
{
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
	//engine.canvas.focus();
});





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