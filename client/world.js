//world.js

import * as THREE from './node_modules/three/build/three.module.js';
import * as utils from './utils.js';
import { addLog } from './utils.js';

const file_map = "./assets/map.glb";
const file_etexture = "./assets/aarfontein_dirt_road_4k.hdr";

export let gltf;
export let model;
export let object3D;

export const collisionObjects = [];

//仮マップ（ロード中の床だけ表示）
export function createPlaceholder(scene)
{
	const geometry = new THREE.PlaneGeometry(200, 200);
	const material = new THREE.MeshStandardMaterial({
		color: 0xEEEEEE,
		wireframe: false,
		//transparent: true, // 透明度を有効にする（これがないとopacityが効かない）
		//opacity: 0.5        // 透明度（0が完全透明、1が不透明）
	});
	const ground = new THREE.Mesh(geometry, material);

	// 水平に寝かせる
	ground.rotation.x = -Math.PI / 2;

	object3D = new utils.myObject3D(ground);
	object3D.update();

	model = ground;

	return ground;
}


export async function init(scene)
{
	//本物のマップが読み込まれるまで、仮の床を表示しておく
	const placeholder = createPlaceholder(scene);
	collisionObjects.push(placeholder);
	scene.add(placeholder);


	// 1. 環境光（シーン全体を均等に薄暗く照らす。影を作らない）
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // 色, 強度
	scene.add(ambientLight);

	// 2. 平行光源（太陽光のような一方向からの強い光。PBRの質感を出すのに必須）
	const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // 色, 強度
	directionalLight.position.set(5, 10, 7); // 斜め上から照らす
	scene.add(directionalLight);

	//マップ読み込み
	gltf = await utils.loadGLTF(file_map);
	if (!gltf)
	{
		console.log("マップ初期化に失敗しました");
		return false;
	}
	model = gltf.scene;

	// スケールはモデルに合わせて調整してください
	//model.scale.set(scale, scale, scale);

	//仮の床を削除して、本物のマップに差し替える
	scene.remove(placeholder);
	collisionObjects.length = 0;//クリア

	//当たり判定リストを作成
	const newCollisionObjects = [];
	model.traverse((node) =>
	{
		if (!node.isMesh) return;

		const name = node.name.toLowerCase();
		newCollisionObjects.push(node);

		//addLog("INFO", node.name);
	});

	//本物の当たり判定リストを代入
	collisionObjects.push(...newCollisionObjects);

	//3D情報取得
	object3D = new utils.myObject3D(model);
	object3D.update();

	//シーンに追加
	scene.add(model);

	//マップ GLBモデルとは別に、HDR環境マップを読み込む
	const hdr = await utils.loadHDR(file_etexture);
	hdr.mapping = THREE.EquirectangularReflectionMapping;
	scene.background = hdr; // 背景に適用
	scene.environment = hdr.texture; // モデルの反射・ライティングに適用


	// 床（位置確認用）
	//const gridHelper = new THREE.GridHelper(100, 100);
	//scene.add(gridHelper);


	return true;
}
