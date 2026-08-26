// 文字色・背景色などのエスケープコード一覧
// ※Pythonの \033 とJavaScriptの \x1b は同じ「ESCシーケンス」を表す書き方です
const COLORS = {
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
export function logc(color, text)
{
	if (text === undefined)
		text = color;
	let result = tc(color, text);
	if (!result.endsWith("\x1b[0m")) result += "\x1b[0m";
	console.log(result);
}

export function prtc(text)
{
	if (!text.endsWith("\x1b[0m")) text += "\x1b[0m";
	console.log(text);
}