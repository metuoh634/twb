export const keys = {};
export const keysPress = {};
//export const keys = new Proxy({}, {	get: (target, key) => key in target ? target[key] : false});

//キーが押されたとき
export function getKeyState_keydown(e)
{
	const key = e.key === ' ' ? 'space' : e.key.toLowerCase();

	// keysDownは最初の押下のみ（リピートを除外）
	if (!e.repeat)
		keys[key] = true;

	keysPress[key] = true; // keysはリピート含めて常にtrue（変更なし）
};

//キーが離されたとき
export function getKeyState_keyup(e)
{
	const key = e.key === ' ' ? 'space' : e.key.toLowerCase();

	keys[key] = false;
	keysPress[key] = false;
};

// フレーム末にエッジフラグをリセット（anime()の末尾などで呼ぶ）
export function clearKeys()
{
	for (const key in keys)
		delete keys[key];
}


export const mouseInfo =
{
	left: false,    //0: 主ボタン。通常は左ボタンか初期化されていない状態。
	middle: false,  //1: 補助ボタン。通常はホイールボタンまたは中央のボタンが押された場合。
	right: false,   //2: 副ボタン。通常は右ボタン。
	back: false,    //3: 第四ボタン。一般的にブラウザーの戻るボタン。
	forward: false, //4: 第五ボタン。一般的にブラウザーの進むボタン。
	wheel_deltaY: 0,//ホイール移動
	clientX: null,
	clientY: null,
};


// マウスを動かしているとき
export function getMouseState_mousedown(e)
{
	if (e.button === 0) mouseInfo.left = true;
	if (e.button === 1) mouseInfo.middle = true;
	if (e.button === 2) mouseInfo.right = true;
	if (e.button === 3) mouseInfo.back = true;
	if (e.button === 4) mouseInfo.forward = true;

	mouseInfo.clientX = e.clientX;
	mouseInfo.clientY = e.clientY;
}

// マウスを動かしているとき
export function getMouseState_mousemove(e)
{
	mouseInfo.movementX = e.movementX;
	mouseInfo.movementY = e.movementY;
};

// マウスを離したとき
export function getMouseState_mouseup(e)
{
	if (e.button === 0) mouseInfo.left = false;
	if (e.button === 1) mouseInfo.middle = false;
	if (e.button === 2) mouseInfo.right = false;
	if (e.button === 3) mouseInfo.back = false;
	if (e.button === 4) mouseInfo.forward = false;
};

// マウスを動かしているとき
export function getMouseState_mousewheel(e)
{
	mouseInfo.wheel_deltaY = e.deltaY;
};




///////イベント//////////

//キーイベント
document.addEventListener('keydown', (e) =>
{
	//if (player.SendChat(e))
	{
	}
	//else
	{
		//キー状態更新
		getKeyState_keydown(e);
	}
});
document.addEventListener('keyup', (e) =>
{
	//キー状態更新
	getKeyState_keyup(e);
});

document.addEventListener('mousedown', (e) =>
{
	//マウス状態更新
	getMouseState_mousedown(e);

	//if (player)
	//	player.mousedown()
});
// マウスを動かしているとき
document.addEventListener('mousemove', (e) =>
{
	getMouseState_mousemove(e);

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
	getMouseState_mouseup(e);

	//addLog("INFO", "window.mouseup" + mouseInfo.right);
	//windows.mouseup(e);

});
// マウスホイールのイベント
window.addEventListener('wheel', (e) =>
{
	getMouseState_mousewheel(e);
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
	//engine.repaint();
});

// ページ読み込み時
window.addEventListener('load', () =>
{
	// ページの準備が完全に整ってからフォーカスを当てる
	//engine.canvas.focus();
});


//windows.js
//チャット送信ボタン
//windows.chatSendBtn.addEventListener('click', (e) =>
//{
//player.SendChat();
//});

