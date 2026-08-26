import * as THREE from './node_modules/three/build/three.module.js';
import { CSS2DRenderer, CSS2DObject } from './node_modules/three/examples/jsm/renderers/CSS2DRenderer.js';
import * as utils from './utils.js';
import { addLog, debugLog, roundRect } from './utils.js';
import * as engine from './engine.js';
import * as windows from './windows.js';
import * as world from './world.js';
import * as socket from './ws_bin_client.js';
import { keys, keysPress, mouseInfo } from './input.js';

export let playerCount = 0;


export class entity
{

	constructor(playable)
	{
		//プレイヤー関連
		this.onInit = null;
		this.id = playerCount++;
		this.playable = playable;
		this.file;
		this.gltf;
		this.model;
		this.mixer;
		this.scale = 0.077;
		this.actions = [];
		this.object3D;

		this.animeState = "";
		this.moveSpeed = 5.0; // 移動速度

		this.velocityY = 0;           // 現在の上下方向の速度
		// this.isJumping = false;       // ジャンプ中かどうか
		this.jumpPower = 8;         // ジャンプの初速度（高さの調整）
		this.groundThreshold = 0.05;// ジャンプ開始の誤差吸収用の小さな余裕
		this.gravity = -20;         // 重力加速度（下向きなのでマイナス）
		this.lastGroundY = -10;           // 最後の地面のY座標

		// 床判定用のパラメータ
		this.airState = "ground";
		this.rayground = new THREE.Raycaster();
		this.rayOrigin = new THREE.Vector3();     // レイの発射位置（使い回し用）
		this.rayDirection = new THREE.Vector3(0, -1, 0); // 常に真下方向
		this.rayStartOffset = 1.0;    // キャラの少し上からレイを飛ばす（めり込み対策）
		this.maxGroundCheckDistance = 5.0; // 床判定の最大探索距離

		//マウス移動用
		this.targetPosition = null; // 移動目標地点
		this.isClickMoving = false; // クリック移動中かどうかのフラグ
		this.raymouse = new THREE.Raycaster(); // レイキャスト用
		this.mousePosition = new THREE.Vector2();       // マウス座標用
	}

	//仮プレイヤー（ロード中に表示するプレースホルダー）
	createPlaceholder()
	{
		// カプセル型の簡易的な人型シルエット
		//const geometry = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
		const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
		const material = new THREE.MeshStandardMaterial({
			color: 0xEEEEEE,
			wireframe: false,
			transparent: true, // 透明度を有効にする（これがないとopacityが効かない）
			opacity: 0.5        // 透明度（0が完全透明、1が不透明）
		});
		const placeholder = new THREE.Mesh(geometry, material);
		this.model = placeholder;

		this.object3D = new utils.myObject3D(this.model);
		this.object3D.update();

		return placeholder;
	}
	replaceHolder()
	{
		//仮モデルの位置を記憶してから、本物と差し替える
		const placeholderPosition = this.model.position.clone(); // ← ここではまだ仮モデルを指している
		this.scene.remove(this.model); // ← 仮モデル（カプセル）が正しく削除される

		this.model = this.gltf.scene;
		this.model.scale.set(this.scale, this.scale, this.scale);
		this.model.position.copy(placeholderPosition);
	}

	async init(scene, file)
	{
		this.file = file;
		this.scene = scene;

		//本物のモデルが読み込まれるまで、仮モデルを先に表示しておく
		this.createPlaceholder();

		//シーン追加
		this.model.position.y = 0.8; // 地面から浮かせて中心を合わせる
		this.scene.add(this.model);

		//人glbファイル読み込み
		this.gltf = await utils.loadGLTF(this.file);
		if (!this.gltf)
		{
			console.log("プレイヤー初期化に失敗しました");
			return null;
		}

		//本物のモデルに差し替え
		this.replaceHolder();

		//3D情報取得
		this.object3D = new utils.myObject3D(this.model);
		this.object3D.update();

		//シーンにモデル追加
		this.scene.add(this.model);

		// 通信の初期化
		//socket.callbacks.onmove = this.OnMove; //この書き方だとthisがsocket側のthisになってローカル変数が使えなくなる
		this.OnMove = this.OnMove.bind(this);

		//this.onChat = this.onChat.bind(this);
		socket.callbacks.onchat = this.OnChat;

		// 2. AnimationMixerの生成
		this.mixer = new THREE.AnimationMixer(this.model);
		// Blenderで設定したNLAストリップ名からアクションを生成
		//const idleClip = THREE.AnimationClip.findByName(this.gltf.animations, 'Idle');

		//アクション一覧取得
		this.actions = utils.getActions(this.gltf, this.mixer);
		//addLog("INFO", Object.keys(actions).join("\n"));

		//アクションのループ設定
		["idle", "run"].forEach(key =>
		{
			if (this.actions[key])
			{
				const action = this.actions[key];
				action.setLoop(THREE.LoopRepeat);
			}
		});

		//アクション最後の姿勢の維持設定
		if (this.actions['idle'])
			this.actions.idle.clampWhenFinished = true;


		//player初期化でawaitしてないと仮モデルでanime()関数が入ってる
		this.animeState = "";
		this.play_anim("idle");

		if (this.onInit)
			this.onInit(this);

		return this;
	}

	//描画順序修正
	repairMesh()
	{
		//glbのノードを列挙する
		this.gltf.scene.traverse((node) =>
		{
			if (!node.isMesh) return;

			const name = node.name.toLowerCase();

			//console.log(node.name); // ← これで名前確認

			if (name.includes('body'))
			{
				node.renderOrder = 0;
				node.material.depthWrite = true;
			} else if (name.includes('underwear'))
			{
				node.renderOrder = 1;
				node.material.depthWrite = true;
				node.material.depthTest = true;

			} else if (name.includes('skirt'))
			{
				node.renderOrder = 2;
				node.material.depthWrite = true;
			}
		});
	}
	//移動コールバック　//他のプレイヤーの移動データが届いた時
	OnMove(pos)
	{
		console.log("他のプレイヤーが動いたよ:", x, y, z);
	}
	//移動を送信
	SendMove(x, y, z)
	{
		socket.sendMove(x, y, z);
	}
	//プレイヤーのアクション状態変化
	play_anim(nextState, fade = true)
	{
		if (this.animeState === nextState) return;

		//addLog("INFO", `(${this.animeState}) -> (${nextState})`);

		const current = this.actions[this.animeState];
		const next = this.actions[nextState];

		if (current)
		{
			if (fade)
				current.fadeOut(0.2); //徐々に止める
			else
				current.stop(); //一気に止める

		}

		if (next)
		{
			//next.reset() //1フレーム目から始まる
			//next.fadeIn(0, 2) //徐々に始まる
			//next.play(); //アニメーションの開始(fadeInを使う場合)
			//next.setEffectiveTimeScale(1); //アニメーションの影響度（強さ）の変更
			//next.setEffectiveWeight(1); //アニメーションの再生速度の変更

			next.reset().play();
		}

		// 文字列の状態を更新
		this.animeState = nextState;
	}

	//着地/ジャンプ/落下
	air(goJump, delta)
	{
		if (!this.model) return;

		//床の高さ
		let groundY = this.lastGroundY;

		// 1. キャラの少し上から、真下にレイを飛ばす
		this.rayOrigin.copy(this.model.position);
		this.rayOrigin.y += this.rayStartOffset;
		this.rayground.set(this.rayOrigin, this.rayDirection);
		this.rayground.far = this.maxGroundCheckDistance;

		// 2. 床（衝突判定用メッシュ）との交差をチェック
		const hits = this.rayground.intersectObjects(world.collisionObjects, true);

		// 5. 床が見つかった場合
		if (hits.length > 0)
		{
			//hits[0] = キャラのすぐ下にある、最初にぶつかった床（＝一番近い床）
			//hits[1] = その次に近い床（さらに下の階など）
			groundY = hits[0].point.y; // 床の高さ

			if (this.velocityY > 0)// 先にチェック　上昇中は、地面に近くても'ground'にはしない、ジャンプ→次フレームで地面扱いになってしまう
				this.airState = 'jump';
			else if (this.model.position.y <= groundY + this.groundThreshold)
				this.airState = 'ground';
			else
				this.airState = 'fall';

		}
		// 床自体が見つからない
		else if (this.airState === 'ground')
		{
			//（穴など）→ 落下扱いにする
			this.airState = 'fall';
		}

		//debugLog("po:" + utils.roundTo(this.model.position.y, 2) + " as:" + this.airState + " vY:" + this.velocityY);

		//地面
		if (this.airState === 'ground')
		{
			//ジャンプ処理
			if (goJump)
			{
				// 着地判定の誤爆を防ぐオフセット
				this.model.position.y = groundY + 0.01;

				this.velocityY = this.jumpPower;
				this.airState = 'jump';
				//isJumping = true;
			}
			//めり込み防止処理
			else
			{
				//めり込みを直す　レイキャストは誤差で出るので、誤差レベルの差なら位置を上書きしない（無限に微小値を書き換え続けるのを防ぐ）
				if (!utils.nearlyEqual(this.model.position.y, groundY, 1e-4))
					this.model.position.y = groundY;

				//速度を消す
				this.velocityY = 0;
				//isJumping = false;

				return;//位置更新不要
			}
		}

		// 重力を加える
		this.velocityY += this.gravity * delta;

		//現在位置設定
		this.model.position.y += this.velocityY * delta;
	}
	//プレイヤーの移動
	kmove(delta)
	{
		// モデルが読み込まれたら移動処理を行う
		if (!this.model) return false;

		const moveVector = new THREE.Vector3(0, 0, 0);

		// カメラの前方向ベクトル（水平面のみ）
		const cameraDirection = new THREE.Vector3();
		engine.camera.getWorldDirection(cameraDirection);
		cameraDirection.y = 0;
		cameraDirection.normalize();

		// カメラの右方向ベクトル（前方向から算出）
		const cameraRight = new THREE.Vector3();
		cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

		// キー入力に応じてベクトルの向きを設定
		if (keysPress.w) moveVector.add(cameraDirection);
		if (keysPress.s) moveVector.sub(cameraDirection);
		if (keysPress.a) moveVector.sub(cameraRight);
		if (keysPress.d) moveVector.add(cameraRight);

		//移動があるか
		if (moveVector.lengthSq() > 0)
		{
			// 斜め移動の時に移動速度が速くならないように正規化
			moveVector.normalize();

			// キャラクターを移動させる
			this.model.position.addScaledVector(moveVector, this.moveSpeed * delta);

			// 進む方向をキャラクターに向かせる（旋回）
			const targetAngle = Math.atan2(moveVector.x, moveVector.z);
			this.model.rotation.y = targetAngle;

			return true;
		}
		return false;
	}

	//レイキャストでぶつかった場所を移動目標にする
	mousedown()
	{
		if (!mouseInfo.left)
			return;

		// 1. マウス座標を -1 から 1 の正規化デバイス座標（NDC）に変換
		this.mousePosition.x = (mouseInfo.clientX / window.innerWidth) * 2 - 1;
		this.mousePosition.y = -(mouseInfo.clientY / window.innerHeight) * 2 + 1;

		// 2. カメラとマウス位置からレイ（光線）を飛ばす
		this.raymouse.setFromCamera(this.mousePosition, engine.camera);

		// 3. マップのコリジョンオブジェクトとの交差判定を取得
		const intersects = this.raymouse.intersectObjects(world.collisionObjects, true);

		if (intersects.length > 0)
		{
			// 一番最初にぶつかった場所を移動目標にする
			const hit = intersects[0];
			this.targetPosition = hit.point.clone();
			this.isClickMoving = true;
		}
	}

	// 指定した座標に向かって移動する移動処理
	mmove(delta)
	{
		if (!this.model || !this.targetPosition)
			return false;

		// 現在地から目標地点へのベクトルを計算
		const currentPos = this.model.position;
		const target = this.targetPosition.clone();

		// 高低差を無視して水平方向の距離を測る場合
		target.y = currentPos.y;

		const direction = new THREE.Vector3().subVectors(target, currentPos);
		const distance = direction.length();

		// 十分近づいたら停止
		if (distance < 0.1)
		{
			this.isClickMoving = false;
			this.targetPosition = null;
			return false;
		}

		direction.normalize();

		// キャラクターを移動させる
		this.model.position.addScaledVector(direction, this.moveSpeed * delta);

		// 進む方向を向かせる（旋回）
		const targetAngle = Math.atan2(direction.x, direction.z);
		this.model.rotation.y = targetAngle;

		return true;
	}

	//アニメーションループ
	anime(delta)
	{
		let isMove = false;

		//空中状態
		this.air(keys.space || (mouseInfo.left && mouseInfo.right), delta);


		//プレイヤーの移動
		if (this.playable)
		{
			if (keysPress.w || keysPress.a || keysPress.s || keysPress.d)
			{
				this.isClickMoving = false;
				this.targetPosition = null;
				isMove = this.kmove(delta);
			}
			// クリック移動中の処理
			else if (this.isClickMoving)
			{
				isMove = this.mmove(delta);
			}
		}

		//アニメーション設定
		if (this.airState === "ground")
		{
			if (isMove)
				this.play_anim("run");
			else
				this.play_anim("idle");
		}
		else if (this.airState === "jump" || this.airState === "fall")
			this.play_anim("jump", false);

		//addLog('INFO', "keypress.w:" + keysPress.w);
		//addLog('INFO', "anime(" + animeState + ") keys(" + keys.space + ") jump(" + isJumping);

		// モデルアニメーション更新
		if (this.mixer)
			this.mixer.update(delta);
	}




	//チャットが届いた時
	OnChat(text) 
	{
		//ログ追加
		addLog("INFO", text);
	}

	//チャットを送信
	SendChat(e)
	{
		if (e.key === 'Enter')
		{
			const text = windows.chatInput.value.trim();

			//サーバー未接続
			if (!socket.connected)
			{
				addLog("ERROR", "サーバーに接続されていません")
			}
			//チャットウィンドウ非表示中
			else if (!windows.chatWindow.isVisible())
			{
				windows.chatWindow.restore();
				windows.chatInput.focus();
			}
			//チャットバーにフォーカスある
			else if (document.activeElement === windows.chatInput)
			{
				//テキスト入力
				if (text === '')
					engine.canvas.focus();//3Dキャンバスに戻る
				else
				{
					socket.sendChat(text);//サーバーへチャット
					this.showBubble(text);//バブル表示
					windows.chatInput.value = '';// 入力欄をクリア
					engine.canvas.focus();//3Dキャンバスに戻る
				}
			}
			//チャットバーにフォーカス
			else
				windows.chatInput.focus();

			return true;
		}
		else
		{
			return document.activeElement === windows.chatInput;
		}
	}

	//頭上チャットウィンドウ DIVのみ
	showBubble(text)
	{
		const newDiv = document.createElement('div');
		newDiv.textContent = text;
		newDiv.className = 'chat-bubble'; // style.css で自由にデザイン可能！
		document.body.appendChild(newDiv);

		// animate()側でも呼べるように、更新関数をどこかに登録しておく必要がある
		let rafId;
		const loop = () =>//アローにしないとthisが使えない
		{
			const pos = engine.worldToScreen(this.model, 0, this.object3D.height);
			newDiv.style.left = `${pos.x}px`;
			newDiv.style.top = `${pos.y}px`;

			rafId = requestAnimationFrame(loop);
		}
		rafId = requestAnimationFrame(loop);

		setTimeout(() =>
		{
			newDiv.remove();
			cancelAnimationFrame(rafId);
		}, 3000);
	}


	//(未使用)頭上チャットウィンドウ表示　CSS2DObject
	static chatBubble;
	showBubbleCSS2DObject(text)
	{
		if (!chatBubble)
		{
			// 通常のWebGLRendererの初期化のあとに追加
			chatBubble = new CSS2DRenderer();
			chatBubble.setSize(window.innerWidth, window.innerHeight);
			chatBubble.domElement.style.position = 'absolute';
			chatBubble.domElement.style.top = '0px';
			chatBubble.domElement.style.pointerEvents = 'none'; // クリックを妨げないように
			document.body.appendChild(chatBubble.domElement);

			// リサイズ対応
			window.addEventListener('resize', () =>
			{
				chatBubble.setSize(window.innerWidth, window.innerHeight);
			});

		}

		// 1. 普通の HTML の div を作成
		const chatDiv = document.createElement('div');
		chatDiv.className = 'chat-bubble'; // style.css で自由にデザイン可能！
		chatDiv.textContent = text;

		// 2. CSS2DObject に変換する
		const chatObject = new CSS2DObject(chatDiv);

		// 3. プレイヤーの頭上に配置（3D座標で指定できる！）
		chatObject.position.set(0, 20 + player.height + 1.0, 0);
		//chatObject.scale.set(15, 15, 1);

		// 4. プレイヤーのモデルに追加（プレイヤーが動けば自動で付いていきます）
		player.model.add(chatObject);

		chatBubble.render(engine.scene, engine.camera);

		// 5. 3秒後に削除する処理
		setTimeout(() =>
		{
			player.model.remove(chatObject);
		}, 10000);
	}

	//(未使用)頭上チャットウィンドウを表示
	//[キャンバス] (createElement)   1. 裏で「おつかれ！」という文字と角丸の黒背景を描く（ただの2D画像）
	//[テクスチャ (Texture)]           2. この2D画像を、Three.js用の「画像データ」に変換する
	//[スプライト (Sprite)]            3. 常にカメラの方向を向く「3Dの板（看板）」に画像を貼り付ける
	//[3D空間(Scene/player.model)]    4. プレイヤーの頭上（3D空間内）にこの板を配置する
	//[renderer.domElement]           5. カメラが「プレイヤーと看板」を一緒に撮影し、
	static talkSprite;// 現在表示されている頭上のチャットウィンドウ（スプライト）を保持する変数
	showBubbleCanvasTexture(text)
	{
		// すでに古いチャットウィンドウが表示されている場合は、一旦削除して上書きする
		if (talkSprite)
		{
			player.model.remove(talkSprite);
			talkSprite = null;
		}


		//2DCanvasを作成して、ここにテキストウィンドウを描画する
		const canvas = document.createElement('canvas');
		//描画ペン
		const ctx = canvas.getContext('2d');

		// 解像度が粗くならないよう、少し大きめのサイズでCanvasを確保
		canvas.width = 400;
		canvas.height = 140;

		// Canvasの縦横比（アスペクト比）を計算し、3D空間上でも引き伸ばされないようにスケール（サイズ）を調整
		const aspect = canvas.width / canvas.height;

		// 背景を一度完全にクリア（透明に）する
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// 吹き出しの背景となる「黒色で半透明（不透明度60%）」の角丸四角形を描画
		roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 20);
		ctx.fillStyle = 'rgba(0,0,0,0.6)';
		ctx.fill();

		// テキストの基本スタイルを設定（白色、27pxのサンセリフ体、中央揃え）
		ctx.fillStyle = '#fff';
		ctx.font = '27px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		// 改行（\n）でテキストを分割し、複数行の描画に対応させる
		const lineHeight = 32; //2D1行あたりの高さ（px）
		const lines = text.split('\n');
		const totalHeight = lines.length * lineHeight; // 2Dの縦幅(px)

		// 複数行がちょうどCanvasの中央に収まるように、描画開始のY座標を計算
		const startY = canvas.height / 2 - totalHeight / 2 + lineHeight / 2;

		// 1行ずつCanvasに文字を描き込んでいく
		lines.forEach((line, i) =>
		{
			ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
		});

		// 描き終わったCanvasを、Three.jsで使える「テクスチャ（画像）」に変換
		const texture = new THREE.CanvasTexture(canvas);

		// テクスチャを貼り付けるための、常にカメラを向く「スプライト素材」を作成
		const material = new THREE.SpriteMaterial({ map: texture, transparent: true });

		// 3D空間上に配置できる実体（Spriteオブジェクト）を生成
		const sprite = new THREE.Sprite(material);

		// 3D空間上での縦の大きさ 「3D空間に置いたときにどれくらいの大きさ（スケール）、20なら20メートルみたいな
		const spriteHeight = 20;

		//スプライトのスケール
		sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);

		// スプライトの位置をプレイヤーの頭上に設定 (プレイヤーの身長 + オフセット10)
		sprite.position.set(0, totalHeight / 2 + player.height / player.scale, 0);

		// プレイヤーの3Dモデルの子供としてスプライトを追加（追従するようになる）
		player.model.add(sprite);
		talkSprite = sprite; // 現在表示中のスプライトとして保存

		// 3秒（3000ミリ秒）後に自動的にチャットウィンドウを消去するタイマー
		setTimeout(function ()
		{
			player.model.remove(sprite);

			sprite.material.map.dispose(); // テクスチャ（Canvas）を解放
			sprite.material.dispose();     // マテリアルを解放

			// 自分が消去するタイミングで、talkSpriteの参照もクリアする
			if (talkSprite === sprite)
				talkSprite = null;
		}, 3000);

		return sprite;
	}

}