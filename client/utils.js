// utils.js
import * as THREE from './node_modules/three/build/three.module.js';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
//import { RGBELoader } from '../node_modules/three/examples/jsm/loaders/RGBELoader.js';
import { HDRLoader } from './node_modules/three/examples/jsm//loaders/HDRLoader.js';

//ファイル
const file_texture = "./assets/minecraft-box.png";

//ログエリアに文字追加
const chatLog = document.getElementById('chat-log');

//色付きdiv作成
export function createTypeFont(type, message)
{
	const ctype = type.toUpperCase();
	let prefix = "";
	const mes = document.createElement('div');

	/*
	// 直接 body に追加する場合は、3D画面の手前に浮かせるために絶対配置が必要です！
	document.body.appendChild(msgDiv);
	
	msgDiv.style.position = 'absolute';
	msgDiv.style.top = '10px';
	msgDiv.style.left = '10px';
	msgDiv.style.zIndex = '100'; // 3D画面（キャンバス）より手前に出す設定
	*/

	// 見た目の装飾だけ残す
	mes.style.backgroundColor = 'rgba(0,0,0,0.8)';
	mes.style.fontFamily = 'sans-serif';
	mes.style.borderRadius = '4px'; // ちょっと角を丸くすると綺麗になります

	if (ctype === 'INFO')
		mes.style.color = 'white';
	else if (ctype === 'WARNING')
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


//============


//テクスチャを読み込む
export function loadTexture(fileName)
{
	const loader = new THREE.TextureLoader();

	return loader.load(fileName,
		// 成功時
		(loadedTexture) =>
		{
			console.log('テクスチャの読み込みに成功しました: ' + fileName);
		},
		// 進行時
		undefined,
		// 失敗時（上で作った showError を使い回す）
		() =>
		{
			console.error(`テクスチャファイル「${fileName}」の読み込みに失敗しました。パスが正しいか、またはローカルサーバーが起動しているか確認してください。`);
		}
	);
}

//GLTFを読み込み
export function loadGLTF(filename)
{
	const gltfloader = new GLTFLoader();

	// Promiseを返すようにする
	//スキップする時はundefinedを指定する
	//第1引数ファイルのパスfilename
	//第2引数成功したときの処理(gltf) => { ... }
	//第3引数進捗中の処理
	//第4引数エラーが起きたときの処理(error) => { ... }

	return new Promise((resolve, reject) =>
	{
		gltfloader.load(filename, (gltf) =>
		{
			console.log('GLTFの読み込みに成功しました：' + filename);
			resolve(gltf); // 成功したらgltfを渡す
		}, (xhr) => //(XMLHttpRequest)通信の進捗状況（今どれくらいダウンロードできたか）」の情報が入っているオブジェクト
		{
			// xhr.loaded = ダウンロード済みのバイト数
			// xhr.total  = ファイル全体のバイト数
			//console.log('GLTF:' + (xhr.loaded / xhr.total * 100) + '% loaded');
		}, (error) =>
		{
			console.error('GLTFの読み込みで、エラーが発生しました:', error);

			//resolve(null) を使う場合「読み込み処理自体は無事に終わったよ（完了）。ただ、結果は null（中身なし） だったよ」という意味になります。
			resolve(null); //  reject せず、null を返す

			//reject「重大なシステムエラーが起きたから、プログラムの進行を強制的に止めてエラー処理にルートを変更する（＝ catch に飛ばす）」
			//reject(error); // エラー処理される
		});
	});
}

/*/RGBEを読み込み
export function loadRGBE(filename)
{
	const rgbeloader = new RGBELoader();

	// Promiseを返すようにする
	//スキップする時はundefinedを指定する
	//第1引数ファイルのパスfilename
	//第2引数成功したときの処理(gltf) => { ... }
	//第3引数進捗中の処理
	//第4引数エラーが起きたときの処理(error) => { ... }

	return new Promise((resolve, reject) =>
	{
		rgbeloader.load(filename, (rgbe) =>
		{
			console.log('RGBEの読み込みに成功しました！');
			resolve(rgbe); // 成功したらgltfを渡す
		}, (xhr) => //(XMLHttpRequest)通信の進捗状況（今どれくらいダウンロードできたか）」の情報が入っているオブジェクト
		{
			// xhr.loaded = ダウンロード済みのバイト数
			// xhr.total  = ファイル全体のバイト数
			//console.log('RGBE:' + (xhr.loaded / xhr.total * 100) + '% loaded');
		}, (error) =>
		{
			console.error('RGBEの読み込みでエラーが発生しました:', error);

			//resolve(null) を使う場合「読み込み処理自体は無事に終わったよ（完了）。ただ、結果は null（中身なし） だったよ」という意味になります。
			resolve(null); //  reject せず、null を返す

			//reject「重大なシステムエラーが起きたから、プログラムの進行を強制的に止めてエラー処理にルートを変更する（＝ catch に飛ばす）」
			//reject(error); // エラー処理される
		});
	});
}*/

//HDRを読み込み
export function loadHDR(filename)
{
	const hdrloader = new HDRLoader();

	// Promiseを返すようにする
	//スキップする時はundefinedを指定する
	//第1引数ファイルのパスfilename
	//第2引数成功したときの処理(gltf) => { ... }
	//第3引数進捗中の処理
	//第4引数エラーが起きたときの処理(error) => { ... }

	return new Promise((resolve, reject) =>
	{
		hdrloader.load(filename, (rgbe) =>
		{
			console.log('HDRの読み込みに成功しました：' + filename);
			resolve(rgbe); // 成功したらgltfを渡す
		}, (xhr) => //(XMLHttpRequest)通信の進捗状況（今どれくらいダウンロードできたか）」の情報が入っているオブジェクト
		{
			// xhr.loaded = ダウンロード済みのバイト数
			// xhr.total  = ファイル全体のバイト数
			//console.log('HDR:' + (xhr.loaded / xhr.total * 100) + '% loaded');
		}, (error) =>
		{
			console.error('HDRの読み込みで、エラーが発生しました:', error);

			//resolve(null) を使う場合「読み込み処理自体は無事に終わったよ（完了）。ただ、結果は null（中身なし） だったよ」という意味になります。
			resolve(null); //  reject せず、null を返す

			//reject「重大なシステムエラーが起きたから、プログラムの進行を強制的に止めてエラー処理にルートを変更する（＝ catch に飛ばす）」
			//reject(error); // エラー処理される
		});
	});
}

//キューブ作成//threeのベクトル　x=右へ、y=上へ、z=奥へ
export async function createCube(scene, x = 0, y = 0, z = 0)
{
	const geometry = new THREE.BoxGeometry(2, 2, 2);
	const texture = await loadTexture(file_texture);
	const material = new THREE.MeshBasicMaterial({ map: texture });
	const cube = new THREE.Mesh(geometry, material);

	cube.position.set(x, y, z);

	//ダメな書き方　cube.position = new THREE.Vector3(10, 5, -2); //positionの内部参照が壊れる
	//OKな書き方　　cube.position.copy(new THREE.Vector3(10, 5, -2));

	scene.add(cube);

	// GUI（システムウィンドウ）を作るコードを追加！
	/*
	gui = new GUI();
		
	// ウィンドウに操作したい項目を登録する
	gui.add(cube.position, 'x', -3, 3, 0.01).name('左右（X軸）');
	gui.add(cube.position, 'y', -3, 3, 0.01).name('上下（Y軸）');
	gui.add(cube.rotation, 'x', 0, Math.PI * 2, 0.01).name('回転（X軸）');
	*/
	return cube;

}


//Canvas上に角丸長方形のパスを描画するヘルパー関数
export function roundRect(ctx, x, y, w, h, r)
{
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
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

//アニメーションの配列取得
export function getActions(gltf, mixer)
{
	let actions = [];
	// 読み込んだアニメーション要素をループして、名前でアクセスできるように保持
	gltf.animations.forEach((clip) =>
	{
		// clip.name が Blender側でのアクション名（"move_forward"など）になります
		actions[clip.name] = mixer.clipAction(clip);
	});

	return actions;
}

//3DObject
export class myObject3D
{
	constructor(model)
	{
		this.model = model;

		//ポリゴン数など
		this.meshCount = 0;
		this.boneCount = 0;
		this.materialCount = 0;
		this.vertexCount = 0;
		this.triangleCount = 0;
		this.materialNames = new Set();

		//boxサイズ
		this.box = new THREE.Box3();
		this.size = new THREE.Vector3();
		this.width = 0;
		this.height = 0;
		this.top = 0;
		this.bottom = 0;
	}

	update()
	{
		this.getBoxSize();
		this.get3DInfo();
	}

	//boxサイズ
	getBoxSize()
	{
		// 変更された行列（マトリクス）を手動で強制更新する、スケールより後に記述
		//positionやscale、rotationを変更しても、その変更を即座にmatrixWorld(ワールド座標行列)に反映しません。通常はrenderer.render()が呼ばれるタイミングでシーン全体の行列がまとめて再計算
		this.model.updateMatrixWorld(true);

		//モデルのオブジェクト情報を元に、バウンディングボックスの範囲を計算（モデルの回転やスケール、親子関係を含めた正確な世界座標ベースで取得します）
		this.box.setFromObject(this.model);
		this.box.getSize(this.size);

		this.top = this.box.max.y;
		this.bottom = this.box.min.y;

		//this.width = (this.box.max.x - this.box.min.x) / scale;
		//this.height = (this.box.max.y - this.box.min.y) / scale;

		this.width = this.size.x;
		this.height = this.size.y;

		//this.localHeight = this.height / this.scale; //ローカル高さ　もしもplayer.addするときはこちらを使う必要がある

		return this;
	}

	//ポリゴン数など取得
	get3DInfo()
	{
		// プレイヤーのポリゴンチェック
		this.model.traverse((obj) =>
		{
			if (obj.isMesh)
			{
				// 形状の数
				this.meshCount++;

				if (obj.material)
				{
					const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
					mats.forEach(m => this.materialNames.add(m.name || '(no name)'));
				}

				// 頂点数・三角形数のカウント
				const geometry = obj.geometry;
				if (geometry)
				{
					// 頂点数
					const position = geometry.attributes.position;
					if (position)
						this.vertexCount += position.count;

					// 三角形数(ポリゴン数)
					if (geometry.index) // index(頂点の使い回し情報)があるかどうか
						this.triangleCount += geometry.index.count / 3;
					else if (position)
						this.triangleCount += position.count / 3;
				}
			}
			if (obj.isBone)
			{
				this.boneCount++;
			}
		});

		// 最後にマテリアル数をセット
		this.materialCount = this.materialNames.size;

		return this;
	}
}