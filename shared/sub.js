//import path from 'path'; //ブラウザ環境では使えない
//import fs from 'fs';//ブラウザ環境では使えない

//ブラウザ環境のみ
let chatLog = null;
if (typeof document !== 'undefined')
	chatLog = document.getElementById('chatLog');


// 文字色・背景色などのエスケープコード一覧
// ※Pythonの \033 とJavaScriptの \x1b は同じ「ESCシーケンス」を表す書き方です
const COLORS = {

	info: "\x1b[34m",
	warning: "\x1b[33m",
	error: "\x1b[31m",

	// 文字色
	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",

	// 太字の文字色
	bold_red: "\x1b[1;31m",
	bold_green: "\x1b[1;32m",
	bold_yellow: "\x1b[1;33m",
	bold_blue: "\x1b[1;34m",
	bold_magenta: "\x1b[1;35m",
	bold_cyan: "\x1b[1;36m",

	// 明るい文字色（bright系）を追加
	bright_black: "\x1b[90m",
	bright_red: "\x1b[91m",
	bright_green: "\x1b[92m",
	bright_yellow: "\x1b[93m",
	bright_blue: "\x1b[94m",
	bright_magenta: "\x1b[95m",
	bright_cyan: "\x1b[96m",
	bright_white: "\x1b[97m",

	// 背景色つき（例: 赤背景に白文字など）
	bg_red: "\x1b[41m\x1b[37m",
	bg_green: "\x1b[42m\x1b[30m",
	bg_yellow: "\x1b[43m\x1b[30m",
};

// RGB値（0-255ずつ）を直接指定して約1677万色を出力（truecolor対応端末のみ）
export function trgb(r, g, b, text)
{

	// 各成分を0-255にクリップ
	r = Math.max(0, Math.min(255, r));
	g = Math.max(0, Math.min(255, g));
	b = Math.max(0, Math.min(255, b));
	const code = `\x1b[38;2;${r};${g};${b}m`;
	return `${code}${text}\x1b[0m`;
	//return code + text;
}

export function tc(color, text)
{
	// COLORSに無いキーが指定されたらwhiteにフォールバックする
	const code = COLORS[color] || COLORS["white"] || "";
	return `${code}${text}\x1b[0m`;
	//return code + text;
}

export function log_rgb(r, g, b, text)
{
	let result = trgb(r, g, b, text);
	if (!result.endsWith("\x1b[0m")) result += "\x1b[0m";
	console.log(result);
}

//色log
export function print(color, text)
{
	if (text === undefined)
		text = color;
	let result = tc(color, text);
	if (!result.endsWith("\x1b[0m")) result += "\x1b[0m";
	console.log(result);
}

export function print2(text)
{
	if (!text.endsWith("\x1b[0m")) text += "\x1b[0m";
	console.log(text);
}

//色付きdiv作成
export function createTypeFont(type, message)
{
	const ctype = type.toUpperCase();
	let prefix = "";
	const mes = document.createElement('div');

	//クラス名設定
	mes.classList.add("logLine");

	/*
	// 直接 body に追加する場合は、3D画面の手前に浮かせるために絶対配置が必要です！
	document.body.appendChild(msgDiv);
	
	msgDiv.style.position = 'absolute';
	msgDiv.style.top = '10px';
	msgDiv.style.left = '10px';
	msgDiv.style.zIndex = '100'; // 3D画面（キャンバス）より手前に出す設定
	*/

	//cssそのままを使う
	//if (ctype === 'INFO')
	//	mes.style.color = 'white';
	if (ctype === 'WARNING')
		mes.style.color = 'yellow';
	else if (ctype === 'ERROR')
		mes.style.color = 'red';

	mes.innerText = message;
	//mes.innerText = `${prefix} ${message}`;

	return mes;
}

//typeのconsoleを取得
export function typeConsole(type)
{
	const ctype = type.toUpperCase();
	let consoleFunc = console.log
	if (ctype === 'INFO')
		consoleFunc = console.log;
	else if (ctype === 'WARNING')
		consoleFunc = console.warn; //ちょっとまずい
	else if (ctype === 'ERROR')
		consoleFunc = console.error; //致命的エラー
	return consoleFunc;
}

export function addLog(type, message, logArea = chatLog)
{
	//タイプコンソール取得
	let consoleFunc = typeConsole(type);

	//色付き文字のdiv作成
	let msgDiv = createTypeFont(type, message);

	if (logArea)
	{
		logArea.appendChild(msgDiv);
		logArea.scrollTop = logArea.scrollHeight;
	}

	//conlose.log
	consoleFunc(message);

	// INFOやWARNINGが画面に残り続けると邪魔なので、5秒後に自動で消えるようにする
	/*if (ctype !== 'ERROR')
	{
		setTimeout(() =>
		{
			msgDiv.remove();
		}, 5000); // 5000ミリ秒 = 5秒
	}*/
}

let debugMessage;
export function debugLog(message)
{
	if (debugMessage != message)
	{
		debugMessage = message;
		addLog('INFO', debugMessage);
	}
}

//丸め処理
export function roundTo(value, digits)
{
	const factor = Math.pow(10, digits);
	return Math.round(value * factor) / factor;
}

//2つの数値がほぼ等しいか判定する（浮動小数点誤差を許容する）
export function nearlyEqual(a, b, epsilon = 1e-4)
{
	return Math.abs(a - b) <= epsilon;
}

//拡張子変更
export function changeExt(filePath, newExt)
{
	// .の有無を吸収してフォーマット（例: "png" -> ".png"）
	const ext = newExt.startsWith('.') ? newExt : `.${newExt}`;

	// 末尾の拡張子部分（.xxx）を新しい拡張子に置換
	return filePath.replace(/\.[^/.]+$/, ext);
}

//ファイル名だけ取得
export function getFileName(filePath)
{
	return filePath.split(/[/\\]/).pop();
}

//ファイルの有無
export async function checkFileExists(url)
{
	try
	{
		const response = await fetch(url, { method: 'HEAD' });
		return response.ok; // 200〜299ならtrue
	} catch
	{
		return false;
	}
}