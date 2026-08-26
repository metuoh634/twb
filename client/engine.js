//engine.js
import * as THREE from './node_modules/three/build/three.module.js';
import { Timer } from './node_modules/three/src/core/Timer.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import GUI from './node_modules/lil-gui/dist/lil-gui.esm.js';
import { keys, mouseInfo } from './input.js';

//描画関連
export let scene;    //Scene はデータ上の3D空間
export let camera;   //camera.position（カメラ座標）: 注視点を中心とした「球体の上を移動する」座標
export let renderer;
export let canvas;   //Sceneをブラウザに映すための2Dの画面
export let controls; //controls.target（注視点）: カメラが「どこを見つめるか」の基準点（回転の中心）。
export let gui;
export let timer;

//マウスでのカメラ状態
export let distance = 4;               // プレイヤーからの距離
export const minDistance = 2;       // 最小距離（近づける限界）
export const maxDistance = 15;      // 最大距離（離れられる限界）
export const zoomSpeed = 0.01;      // ズームの感度
export let theta = 0;                  // 水平方向の角度（ラジアン）
export let phi = Math.PI / 2;          // 垂直方向の仰俯角（上下の傾き角度）
export const minPhi = 0.1;                // 垂直方向の回転制限 真上（脳天）から見下ろす一歩手前でストップさせ、画面の反転を防ぐ
export const maxPhi = Math.PI / 2 - 0.05; // 垂直方向の回転制限 地面より少し上まで
export let sensitivity = 0.005;        // マウスの移動感度

export function init()
{
	//タイマー
	timer = new Timer();

	// シーン
	scene = new THREE.Scene();

	//GUI
	gui = new GUI();

	// 描画レンダラー(スクリーンに描画するもの)
	initRenderder();

	// カメラ(撮影機器)
	init3DCamera();

	//OrbitControls初期化
	//initOrbitControls();

	return true;
}

// 描画レンダラー(スクリーンに描画するもの)
function initRenderder()
{
	// 描画レンダラー(スクリーンに描画するもの)
	renderer = new THREE.WebGLRenderer();
	renderer.logarithmicDepthBuffer = true;//描画順序修正用？
	renderer.localClippingEnabled = true;
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	canvas = renderer.domElement;

	// canvasがフォーカスを受け取れるようにする
	canvas.setAttribute('tabindex', '-1');

	// 外枠の黒い線を消す（フォーカス時に青い枠線などが出ないようにする）
	canvas.style.outline = 'none';
}

// カメラ(撮影機器)
function init3DCamera()
{
	//3D空間を人間の目や実際のカメラで見たときと同じような見え方
	camera = new THREE.PerspectiveCamera();
	camera.fov = 60;
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.near = 0.1;
	camera.far = 1000;
	camera.position.z = 5.8;
	camera.position.y = 1.5;//6;
	camera.updateProjectionMatrix(); //fovなどの後は呼ばないと反映されない？
	//カメラの視点追従
	//const targetPosition = new THREE.Vector3(0, 0, 0);
	//camera.lookAt(targetPosition);

	//カメラGUI
	const gui_camera = gui.addFolder('Camera'); //カメラGUI
	// 視野角（fov）を変更する設定 updateProjectionMatrixはfov（視野角）、near、farには必要
	gui_camera.add(camera, 'fov', 10, 150, 1).name('視野角 (fov)').onChange(() => { camera.updateProjectionMatrix(); });
	// 4. カメラの位置（position.z）を変更する設定
	//単に camera.position.y を動かすだけだと、カメラの向き（視点）が固定されたまま平行に上下移動する
	gui_camera.add(camera.position, 'x', 1, 20, 0.1).name('カメラ距離 (X)');
	gui_camera.add(camera.position, 'y', 1, 20, 0.1).name('カメラ距離 (Y)').onChange((value) =>
	{
		// 1. OrbitControls の注視点の高さも、カメラと同じにする
		//controls.target.y = value;

		// 2. コントロールを強制更新する
		//controls.update();
	});
	gui_camera.add(camera.position, 'z', 1, 20, 0.1).name('カメラ距離 (Z)');
	gui_camera.close();
}

//OrbitControls
function initOrbitControls()
{
	//カメラコントロール（マウスでぐるぐる動かせるようにする）
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true; //慣性を有効にする
	controls.target.y = 2;//カメラ高さ
	controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;// 右クリック（RIGHT）に回転（ROTATE）を割り当て
	controls.mouseButtons.LEFT = THREE.MOUSE.NONE;// 左クリック無効化
	controls.mouseButtons.MIDDLE = THREE.MOUSE.NONE;// 中クリック無効化

	controls.enableZoom = true; // ズームを有効にする（デフォルトtrue）


	//カメラコントロールGUI
	const gui_ctrl = gui.addFolder('OrbitControls'); //OrbitControl GUI
	//gui_ctrl.add(controls, 'minDistance', 1, 50, 0.1).name('最接近距離');
	//gui_ctrl.add(controls, 'maxDistance', 1, 50, 0.1).name('最大遠隔距離');
	gui_ctrl.add(controls.target, 'x', 0, 20, 0.1).name('コントロール(X)')
	gui_ctrl.add(controls.target, 'y', 0, 20, 0.1).name('コントロール(Y)')
	gui_ctrl.add(controls.target, 'z', 0, 20, 0.1).name('コントロール(Z)')

	gui_ctrl.add(controls, 'enableRotate').name('回転を許可')
	gui_ctrl.add(controls, 'enableZoom').name('ズームを許可')
	gui_ctrl.add(controls, 'enablePan').name('平行移動を許可');
	gui_ctrl.add(controls, 'enableDamping').name('慣性を有効化').onChange((value) => { });

	gui_ctrl.close();
}

//ウィンドウリサイズ時の再描画
export function repaint()
{
	// 1. カメラのアスペクト比（縦横比）を新しいウィンドウサイズに更新
	camera.aspect = window.innerWidth / window.innerHeight;

	// 2. カメラの投影行列を更新（これをしないと変更が反映されません）
	camera.updateProjectionMatrix();

	// 3. レンダラー（描画領域）のサイズを新しいウィンドウサイズに更新
	renderer.setSize(window.innerWidth, window.innerHeight);
}

export function camera_MouseMove()
{
	// マウスの移動量（movementX, movementY）に応じて角度を更新
	theta -= mouseInfo.movementX * sensitivity;
	phi += (-mouseInfo.movementY) * sensitivity;

	// 垂直方向の角度を制限（クリップ）
	phi = Math.max(minPhi, Math.min(maxPhi, phi));
}

// マウスホイールのイベント
/*export function camera_MouseWheel()
{
	distance += mouseInfo.wheel_deltaY * zoomSpeed;

	// 距離が範囲を超えないように制限
	distance = Math.max(minDistance, Math.min(maxDistance, distance));
};*/

//カメラ更新
export function camera_update(model)
{
	if (!model)
		return;

	const targetPosition = new THREE.Vector3(
		model.position.x,
		model.position.y + 1.5, // 足元ではなく、胸〜頭の高さにする好みで調整（キャラの身長に合わせて）
		model.position.z
	);

	//マウスホイールで入力された距離
	distance += mouseInfo.wheel_deltaY * zoomSpeed;
	distance = Math.max(minDistance, Math.min(maxDistance, distance));// 距離が範囲を超えないように制限

	// 1. 角度と距離から、プレイヤーを原点としたときのカメラの相対座標を計算
	const x = distance * Math.sin(phi) * Math.sin(theta);
	const y = distance * Math.cos(phi);
	const z = distance * Math.sin(phi) * Math.cos(theta);

	// 2. プレイヤーの現在位置を足して、実際のカメラ位置を設定
	camera.position.set(
		targetPosition.x + x,
		targetPosition.y + y,
		targetPosition.z + z
	);

	//カメラを常にプレイヤーの方向に向かせる(まっすぐにそこに行く)
	camera.lookAt(targetPosition);

	//カメラを常にプレイヤーの方向に向かせる(徐々に+1の視点になる)
	//camera.lookAt(targetPosition.x, targetPosition.y + 1, targetPosition.z);

}


//3Dターゲットの2Dスクリーン座標を取得
export function worldToScreen(target, offx = 0, offy = 0)
{
	/*// ターゲットのワールド座標（オフセットなしでそのまま変換）
	let worldPos = new THREE.Vector3();
	target.getWorldPosition(worldPos);

	// ワールド座標→スクリーン座標（-1〜1）に変換
	const screenPos = worldPos.project(engine.camera);

	// スクリーン座標→ピクセル座標に変換した後、ピクセル単位のオフセットを加算
	const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth + offx;
	const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight + offy;

	return { x, y };
	*/

	// ターゲットのワールド座標
	let worldPos = new THREE.Vector3();
	target.getWorldPosition(worldPos);
	worldPos.x += offx;
	worldPos.y += offy;
	//worldPos.z += offz;

	// ワールド座標→画面上のスクリーン座標（-1〜1の範囲）に変換
	const screenPos = worldPos.project(camera);

	// スクリーン座標（-1〜1）→ 実際のピクセル座標に変換
	//Vector3.project(camera)　-1 ──────── 0 ──────── 1を返す
	//CSSのleft,topは　　　　　  0 ─────────────────── window.innerWidth を返すので
	screenPos.x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
	screenPos.y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

	return screenPos;
}