//import { keys, mouseInfo } from './input.js';

export let canvas = document.getElementById("gameCanvas");
export let ctx = canvas.getContext("2d");

export function init()
{
	repaint();

	return true;
}

//ウィンドウリサイズ時の再描画
export function repaint()
{
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}