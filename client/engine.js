//import { keys, mouseInfo } from './input.js';

export let canvas;
export let ctx;

export function init()
{
	canvas = document.getElementById("gameCanvas");
	ctx = canvas.getContext("2d");

	repaint();

	return true;
}

//ウィンドウリサイズ時の再描画
export function repaint()
{
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}