//import { keys, mouseInfo } from './input.js';

export let canvas = document.getElementById("gameCanvas");
export let ctx = canvas.getContext("2d");

export function init()
{
	// canvasがフォーカスを受け取れるようにする
	canvas.setAttribute('tabindex', '0');
	// 外枠の黒い線を消す（フォーカス時に青い枠線などが出ないようにする）
	canvas.style.outline = 'none';

	repaint();

	return true;
}

//ウィンドウリサイズ時の再描画
export function repaint()
{
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}