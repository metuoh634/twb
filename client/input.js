import * as engine from './engine.js';


//キーボード==============================================================
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

//マウス==============================================================


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




//バーチャル十字キー（スマホ用）==============================================================

// 現在バーチャル十字キーで入力されている移動方向（-1〜1の範囲、未入力時は0）
export const virtualMove = { x: 0, y: 0 };

// 今操作中のタッチを追跡するためのID（他の指のタッチと混ざらないようにする）
let virtualMoveTouchId = null;

// 指を置いた場所（ここを中心にどれだけ離れたかで、方向と強さを決める）
let virtualMoveOriginX = 0;
let virtualMoveOriginY = 0;

// スティックが反応する最大距離（px）。これ以上離しても入力の強さは頭打ちになる
const VIRTUAL_MOVE_RADIUS = 50;

//画面に指を置いたとき
export function getVirtualMove_touchstart(e)
{
	// 既に別の指で操作中なら何もしない（2本指で同時操作させない）
	if (virtualMoveTouchId !== null)
		return;

	const touch = e.changedTouches[0];

	// 画面の左半分に置いた指だけを「十字キー操作」として扱う
	if (touch.clientX > window.innerWidth / 2)
		return;

	// タッチ操作から発生する余計なマウスイベント（クリック移動）を防ぐ
	e.preventDefault();

	virtualMoveTouchId = touch.identifier;
	virtualMoveOriginX = touch.clientX;
	virtualMoveOriginY = touch.clientY;
}

//指を動かしたとき
export function getVirtualMove_touchmove(e)
{
	// 今追跡している指を、動いた指の一覧から探す
	const touch = Array.from(e.changedTouches).find(t => t.identifier === virtualMoveTouchId);

	if (!touch)
		return;

	// タッチ操作から発生する余計なマウスイベント（クリック移動）を防ぐ
	e.preventDefault();

	// 指を置いた場所からの移動量
	const dx = touch.clientX - virtualMoveOriginX;
	const dy = touch.clientY - virtualMoveOriginY;
	const dist = Math.hypot(dx, dy);

	if (dist > 0)
	{
		// 最大距離でクランプ（頭打ち）しつつ、-1〜1の範囲の強さに変換する
		const power = Math.min(dist, VIRTUAL_MOVE_RADIUS) / VIRTUAL_MOVE_RADIUS;
		virtualMove.x = (dx / dist) * power;
		virtualMove.y = (dy / dist) * power;
	}
}

//指を離したとき
export function getVirtualMove_touchend(e)
{
	const touch = Array.from(e.changedTouches).find(t => t.identifier === virtualMoveTouchId);

	if (!touch)
		return;

	// 操作終了。入力をリセットする
	virtualMoveTouchId = null;
	virtualMove.x = 0;
	virtualMove.y = 0;
}