const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 画面サイズ設定（ウィンドウサイズに合わせる）
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- ゲーム設定 & 定数 ---
const SPRITE_WIDTH = 70;
const SPRITE_HEIGHT = 95;
const ANIMATION_SPEED = 10; // フレーム更新の速さ（値が小さいほど速い）

// マップ設定
const MAP_WIDTH = 6800;
const MAP_HEIGHT = 4500;

// --- 画像アセットの読み込み ---
// 1. 先に「画像キー」と「ファイルパス」のペアだけを定義する
const assetPaths =
{
	map: '/assets/maps/map.png',

	run_backside: '/assets/player/run_backside.png',
	run_backward: '/assets/player/run_backward.png',
	run_forside: '/assets/player/run_forside.png',
	run_forward: '/assets/player/run_forward.png',
	run_side: '/assets/player/run_side.png',

	idle_backside: '/assets/player/idle_backside.png',
	idle_backward: '/assets/player/idle_backward.png',
	idle_forside: '/assets/player/idle_forside.png',
	idle_forward: '/assets/player/idle_forward.png',
	idle_side: '/assets/player/idle_side.png'
};

// 2. 空のオブジェクトを用意し、ループで一気に Image オブジェクトを作る
const assets = {};
for (const [key, path] of Object.entries(assetPaths))
{
	assets[key] = new Image();
	assets[key].src = path;
}

// --- プレイヤーオブジェクト ---
const player = {
	// マップ上の絶対座標 (初期位置はマップ中央付近)
	x: MAP_WIDTH / 2,
	y: MAP_HEIGHT / 2,
	// 目標地点
	targetX: MAP_WIDTH / 2,
	targetY: MAP_HEIGHT / 2,

	speed: 2,               // 移動速度大きいほど早い
	state: 'idle',          // 'idle' または 'run'
	angle: 90,              // 向き（度数法: 0=右, 90=下, 180=左, 270=上...）

	// アニメーション用
	frameCount: 0,
	currentFrame: 0,
	maxFrames: 4,           // ※実際のシートの横のコマ数に合わせて調整してください　自動計算される？

	update()
	{
		// 目標地点までの距離を計算
		const dx = this.targetX - this.x;
		const dy = this.targetY - this.y;
		const distance = Math.hypot(dx, dy);

		if (distance > this.speed)
		{
			this.state = 'run';
			// 角度の計算（ラジアンから度数に変換）
			const radian = Math.atan2(dy, dx);
			this.angle = (radian * 180 / Math.PI + 360) % 360;

			// 移動処理
			this.x += Math.cos(radian) * this.speed;
			this.y += Math.sin(radian) * this.speed;

			// マップの境界を越えないように制限
			this.x = Math.max(0, Math.min(MAP_WIDTH, this.x));
			this.y = Math.max(0, Math.min(MAP_HEIGHT, this.y));
		} else
		{
			// 目標地点に到着
			this.x = this.targetX;
			this.y = this.targetY;
			this.state = 'idle';
		}

		// アニメーションフレームの更新
		// --- 修正前 ---
		// this.frameCount++;
		// if (this.frameCount >= ANIMATION_SPEED) {
		//     this.frameCount = 0;
		//     this.currentFrame = (this.currentFrame + 1) % this.maxFrames;
		// }

		// --- 修正後 ---
		// コマ数が1より大きい（アニメーションする）場合だけフレームを更新する
		if (this.maxFrames > 1)
		{
			this.frameCount++;
			if (this.frameCount >= ANIMATION_SPEED)
			{
				this.frameCount = 0;
				this.currentFrame = (this.currentFrame + 1) % this.maxFrames;
			}
		} else
		{
			// 1コマしかない画像の場合は強制的に0番目を固定
			this.currentFrame = 0;
		}
	},

	// 角度から「使用する画像」と「反転フラグ」を決定する関数
	getSpriteKeyAndFlip()
	{
		const a = this.angle;
		let key = 'forward';
		let flip = false;

		// 8方向の判定 (45度ずつ分割)
		if (a >= 22.5 && a < 67.5)
		{
			key = 'forside'; flip = true;  // 右下（左下を反転）
		} else if (a >= 67.5 && a < 112.5)
		{
			key = 'forward';               // 下
		} else if (a >= 112.5 && a < 157.5)
		{
			key = 'forside';               // 左下
		} else if (a >= 157.5 && a < 202.5)
		{
			key = 'side';                  // 左
		} else if (a >= 202.5 && a < 247.5)
		{
			key = 'backside';              // 左上
		} else if (a >= 247.5 && a < 292.5)
		{
			key = 'backward';              // 上
		} else if (a >= 292.5 && a < 337.5)
		{
			key = 'backside'; flip = true; // 右上（左上を反転）
		} else
		{
			key = 'side'; flip = true;     // 右（左を反転）
		}

		// 例: 'run_forside' や 'idle_forward' などのキー名を生成
		const imgKey = `${this.state}_${key}`;
		return { img: assets[imgKey], flip: flip };
	}
};

// --- カメラオブジェクト（プレイヤーが画面中央になるように追従） ---
const camera =
{
	x: 0,
	y: 0,
	update()
	{
		// プレイヤーの座標を画面中央に持ってくるためのカメラ座標
		this.x = player.x - canvas.width / 2;
		this.y = player.y - canvas.height / 2;

		// カメラがマップの端を超えないようにロック
		this.x = Math.max(0, Math.min(MAP_WIDTH - canvas.width, this.x));
		this.y = Math.max(0, Math.min(MAP_HEIGHT - canvas.height, this.y));
	}
};

// --- マウスクリックイベント ---
window.addEventListener('mousedown', (e) =>
{
	// 画面上のクリック座標から、マップ上の絶対座標を逆算
	player.targetX = e.clientX + camera.x;
	player.targetY = e.clientY + camera.y;
});

// 画面リサイズ対応
window.addEventListener('resize', () =>
{
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
});

// --- メインゲームループ ---
function gameLoop()
{
	// 1. 状態更新
	player.update();
	camera.update();

	// 2. 描画処理
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// 背景マップの描画 (カメラの相対位置に描画)
	ctx.drawImage(
		assets.map,
		0, 0, MAP_WIDTH, MAP_HEIGHT, // 元画像切り出し
		-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT // 描画位置
	);

	// プレイヤーの描画
	const { img, flip } = player.getSpriteKeyAndFlip();

	//今から描画する画像の横幅から、その都度正しいフレーム数を割り出す
	if (img && img.width > 0)
	{
		player.maxFrames = img.width / SPRITE_WIDTH;
	}

	// プレイヤーの画面上の表示位置（中心が足元に来るよう調整）
	const screenX = player.x - camera.x;
	const screenY = player.y - camera.y;

	//現在の描画を一時保存
	ctx.save();

	if (flip)
	{
		// 右向き（右、右上、右下）の場合はコンテキストを反転
		ctx.translate(screenX, screenY);
		ctx.scale(-1, 1);
		ctx.drawImage(
			img,
			player.currentFrame * SPRITE_WIDTH, 0, SPRITE_WIDTH, SPRITE_HEIGHT, // スプライトシート切り出し
			-SPRITE_WIDTH / 2, -SPRITE_HEIGHT + 10, SPRITE_WIDTH, SPRITE_HEIGHT // 反転時の中心ブレを防ぐ
		);
	} else
	{
		// 通常（左向き・上下）
		ctx.drawImage(
			img,
			player.currentFrame * SPRITE_WIDTH, 0, SPRITE_WIDTH, SPRITE_HEIGHT,
			screenX - SPRITE_WIDTH / 2, screenY - SPRITE_HEIGHT + 10, SPRITE_WIDTH, SPRITE_HEIGHT
		);
	}

	//復元
	ctx.restore();

	requestAnimationFrame(gameLoop);
}

// 全てのアセットがロードされたらループを開始（簡易実装）
window.onload = () =>
{
	// スプライトシートが読み込めたら、実際の画像の幅からフレーム数を自動計算
	// 例: 横幅 280px だったら 280 / 70 = 4コマ
	assets.run_forward.onload = () =>
	{
		player.maxFrames = assets.run_forward.width / SPRITE_WIDTH;
	};
	gameLoop();
};