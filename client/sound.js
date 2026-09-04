import * as sub from '../shared/sub.js';

export let pathBGM = '/assets/bgm';
export let BGM = null;
export let fileBGM = null;
export let volumeBGM = 0.1; //音量は 0.0（消音）〜 1.0（最大音量） の範囲

export let pathSE = '/assets/se';
export let SE = null;
export let fileSE = null;
export let volumeSE = 0.1; //音量は 0.0（消音）〜 1.0（最大音量） の範囲


export function setBGM(file, volume = volumeBGM)
{
	if (!sub.checkFileExists(file))
	{
		sub.addLoc("ERROR", "ファイルが見つかりません" + file);
		return null;
	}

	BGM = new Audio(file);
	fileBGM = file;
	BGM.volume = volume;
	BGM.loop = true;

	return BGM;
}

export function setSE(file, volume = volumeSE)
{
	if (!sub.checkFileExists(file))
	{
		sub.addLoc("ERROR", "ファイルが見つかりません" + file);
		return null;
	}

	SE = new Audio(file);
	SE.volume = value;
	fileSE = file;

	return SE;
}

/*
document.getElementById('volumeControl').addEventListener('input', (event) => {
  audio.volume = event.target.value;
});
 */

// 画面クリックで音を鳴らす例
/*
function generate()
{
	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	const osc = audioCtx.createOscillator();

	osc.type = 'sine'; // 音の種類: 'sine', 'square', 'sawtooth', 'triangle'
	osc.frequency.setValueAtTime(440, audioCtx.currentTime); // 周波数 (440Hz = ドレミの「ラ」)

	osc.connect(audioCtx.destination);
	osc.start();
	osc.stop(audioCtx.currentTime + 0.5); // 0.5秒後に停止
};

*/