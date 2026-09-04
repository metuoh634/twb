//windows.js
import { addLog } from '../shared/sub.js';

export let activeWindow = null;
export let windows = [];


//チャットバー
export let chatWindow;
export const chatArea = document.getElementById("chatArea");
export const chatInput = document.getElementById("chatInput");
export const chatLog = document.getElementById("chatLog");

//ウィンドウクラス追加 呼び出し
export function init()
{
	//chatWindow = new WindowController('#chat-container', '#chat-header', '#chat-close-btn');
	//chatWindow = new WindowController('#chatArea', '#chatLog', null);

	chatWindow = new WindowController('#chatArea', '#chatLog', null, '#chatTopBar', 'n', 300, 90, true);//minWidth = 280, minHeight = 180)
	windows.push(chatWindow);
}



//ウィンドウズクラス
class WindowController
{
	//targetSelector　全面サイズ変更
	//headerSelector　動かしたいウィンドウ
	//resizeBarSelector　特定サイズ変更用
	//resizeBarDir　特定サイズ変更位置
	//minWidth　最小横幅
	//minHeight　最小高さ
	constructor(targetSelector, headerSelector = null, closebtnSelector = null,
		resizeBarSelector = null, resizeBarDir = 'n', minWidth = 280, minHeight = 180, childLock = false)
	{
		this.container = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;
		this.header = typeof headerSelector === 'string' ? document.querySelector(headerSelector) : headerSelector;
		this.closebtn = typeof closebtnSelector === 'string' ? document.querySelector(closebtnSelector) : closebtnSelector;
		this.resizeBar = typeof resizeBarSelector === 'string' ? document.querySelector(resizeBarSelector) : resizeBarSelector;

		if (!this.container)
		{
			addLog("WARNING", '対象のウィンドウ要素が見つかりませんでした。');
			return;
		}

		this.childLock = childLock;

		// 各インスタンスごとに独立した状態（状態の隠蔽）
		this.isDragging = false;
		this.dragOffsetX = 0;
		this.dragOffsetY = 0;

		this.isResizing = false;
		this.resizeDir = '';
		this.resizeStartX = 0;
		this.resizeStartY = 0;
		this.resizeStartW = 0;
		this.resizeStartH = 0;
		this.resizeStartLeft = 0;
		this.resizeStartTop = 0;

		this.minWidth = minWidth;
		this.minHeight = minHeight;

		//四隅上下左右リサイズハンドルの追加
		['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].forEach(dir =>
		{
			const handle = document.createElement('div');
			handle.className = `resize-handle ${dir}`;

			this._makeResizable(handle, dir);

			this.container.appendChild(handle);

		});

		//ウィンドウリサイズ
		if (this.resizeBar)
		{
			this._makeResizable(this.resizeBar, resizeBarDir);
		}

		// ウィンドウドラッグ用
		if (this.header)
		{
			// スマホでのスクロール等のジェスチャーをブラウザに横取りされないようにする少し動かした瞬間に pointercancel が発生してドラッグが止まる
			this.header.style.touchAction = 'none';

			//ヘッダーマウスダウン
			this.header.addEventListener('pointerdown', (e) =>
			{
				// e.targetが「子要素自体」または「子要素の中身」である場合は、親の処理をスルーする
				if (this.childLock)
				{
					if (this.header.contains(e.target) && e.target !== this.header)
					{
						return; // ここで処理を終わらせれば、親の処理をスキップできます
					}
				}

				// ポインターの入力をこの要素に固定する
				this.header.setPointerCapture(e.pointerId);

				e.preventDefault();  //デフォルトの挙動（イベント）をキャンセルする
				e.stopPropagation(); //親へイベントが伝わるのを止める！

				activeWindow = this;

				this.isDragging = true;
				const rect = this._fixPosition();
				this.dragOffsetX = e.clientX - rect.left;
				this.dragOffsetY = e.clientY - rect.top;
			});

			//ヘッダーマウス移動
			this.header.addEventListener('pointermove', (e) =>
			{
				if (this.isDragging)
				{
					const x = e.clientX - this.dragOffsetX;
					const y = e.clientY - this.dragOffsetY;
					this.container.style.left = `${x}px`;
					this.container.style.top = `${y}px`;
				}
			});

			//ヘッダーマウスアップ
			this.header.addEventListener('pointerup', (e) =>
			{
				// ポインターの入力をこの要素に固定する
				this.header.releasePointerCapture(e.pointerId);

				this.isDragging = false;
				this.isResizing = false;
				activeWindow = null;
			});

			//ブラウザ都合などで強制的にドラッグが中断された場合の後始末
			//pointerup が呼ばれずに終わるケースがあるため、これが無いと isDragging が
			//true のまま固まってしまい、次のドラッグがおかしくなることがある
			this.header.addEventListener('pointercancel', (e) =>
			{
				this.isDragging = false;
				this.isResizing = false;
				activeWindow = null;
			});
		}

		// 閉じるボタン
		if (this.closebtn)
		{
			this.closebtn.addEventListener('click', (e) =>
			{
				this.hide();

				e.preventDefault();  //デフォルトの挙動（イベント）をキャンセルする
				e.stopPropagation(); //親へイベントが伝わるのを止める！
			});
		}
	}

	//ハンドル要素に「掴んで動かすとリサイズする」処理を付ける共通関数
	_makeResizable(handle, dir)
	{
		// リサイズハンドルもスマホでのジェスチャー横取りを防ぐ
		handle.style.touchAction = 'none';


		handle.addEventListener('pointerdown', (e) =>
		{
			// ポインターの入力をこの要素に固定する
			handle.setPointerCapture(e.pointerId);

			e.preventDefault();  //デフォルトの挙動（イベント）をキャンセルする
			e.stopPropagation(); //親へイベントが伝わるのを止める！

			activeWindow = this;

			this.isResizing = true;
			this.resizeDir = dir;
			this.resizeStartX = e.clientX;
			this.resizeStartY = e.clientY;

			const rect = this._fixPosition();
			this.resizeStartW = rect.width;
			this.resizeStartH = rect.height;
			this.resizeStartLeft = rect.left;
			this.resizeStartTop = rect.top;
		});

		handle.addEventListener('pointermove', (e) =>
		{
			if (this.isResizing)
			{
				const dx = e.clientX - this.resizeStartX;
				const dy = e.clientY - this.resizeStartY;

				if (dir.includes('e'))
				{
					//★変更：固定値280 → this.minWidth
					this.container.style.width = `${Math.max(this.minWidth, this.resizeStartW + dx)}px`;
				}
				if (dir.includes('s'))
				{
					//★変更：固定値180 → this.minHeight
					this.container.style.height = `${Math.max(this.minHeight, this.resizeStartH + dy)}px`;
				}
				if (dir.includes('w'))
				{
					const newW = Math.max(this.minWidth, this.resizeStartW - dx);
					this.container.style.width = `${newW}px`;
					this.container.style.left = `${this.resizeStartLeft + (this.resizeStartW - newW)}px`;
				}
				if (dir.includes('n'))
				{
					//topBarを上にドラッグ→高さが増える／下にドラッグ→高さが減る
					const newH = Math.max(this.minHeight, this.resizeStartH - dy);
					this.container.style.height = `${newH}px`;
					this.container.style.top = `${this.resizeStartTop + (this.resizeStartH - newH)}px`;
				}
			}
		});

		handle.addEventListener('pointerup', (e) =>
		{
			handle.releasePointerCapture(e.pointerId);

			this.isDragging = false;
			this.isResizing = false;
			activeWindow = null;
		});

		// 中断時の後始末（ドラッグ側と同じ理由）
		handle.addEventListener('pointercancel', (e) =>
		{
			this.isDragging = false;
			this.isResizing = false;
			activeWindow = null;
		});
	}

	// 完全に消え去るための後片付けメソッド
	destroy()
	{
		// 1. もしクラス内で直接イベントを貼っていた場合は必ず外す
		// 2. DOM要素に追加したリサイズハンドルを削除する
		const handles = this.container.querySelectorAll('.resize-handle');
		handles.forEach(h => h.remove());

		addLog("INFO", 'メモリ解放');
	}

	// 位置固定の共通処理
	_fixPosition()
	{
		const rect = this.container.getBoundingClientRect();
		this.container.style.top = `${rect.top}px`;
		this.container.style.left = `${rect.left}px`;
		this.container.style.bottom = 'auto';
		this.container.style.right = 'auto';

		//CSSの transform: translateX(-50 %) が残っていると、left を上書きした後にさらにズレてしまうので、無効化する
		this.container.style.transform = 'none';
		return rect;
	}

	hide()
	{
		this.container.style.display = 'none';
	}

	restore()
	{
		this.container.style.display = '';
	}

	isVisible()
	{
		//方法1 最終的に適用されている実際の display の値を取得して判定
		if (getComputedStyle(this.container).display !== 'none')
			return true;

		//方法2 画面上に表示されていれば offsetParent は null 以外になる
		return this.container.offsetParent !== null;
	}


	//位置記憶
	savePosition()
	{
		if (!this.container)
			return;

		// 画面に対する現在の相対位置（割合: 0.0 ～ 1.0）を記録する変数
		this._saveRelativePos = { xRate: 0.5, yRate: 0.5 };
		this._saveRect = this.container.getBoundingClientRect();//相対位置
		this._saveRelativePos.xRate = this._saveRect.left / window.innerWidth;
		this._saveRelativePos.yRate = this._saveRect.top / window.innerHeight;

		// 保存しておいた割合から一旦のpx位置を計算
		this.newLeft = window.innerWidth * this._saveRelativePos.xRate;
		this.newTop = window.innerHeight * this._saveRelativePos.yRate;

	}

	//位置復元
	restorePosition()
	{
		if (!this.container)
			return;

		let newLeft = window.innerWidth * this._saveRelativePos.xRate;
		let newTop = window.innerHeight * this._saveRelativePos.yRate;

		// bottom/right や transform による影響を打ち消す場合は以下を指定
		this.container.style.bottom = 'auto';
		this.container.style.transform = 'none';

		// CSSのスタイルを更新（transform等で中央寄せしている場合は記述に合わせて調整）
		this.container.style.left = `${newLeft}px`;
		this.container.style.top = `${newTop}px`;
	}

	//はみ出しを戻す
	insideScreen()
	{
		if (!this.container)
			return;

		// visualViewportが使える場合は、アドレスバー等を除いた実際の表示領域の高さを使う
		const currentWidth = window.visualViewport ? window.visualViewport.width : window.innerHeight;
		const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

		// style.leftは"100px"のような文字列なので、parseFloatで数値に変換する
		let newLeft = parseFloat(this.container.style.left) || 0;
		let newTop = parseFloat(this.container.style.top) || 0;

		// はみ出し判定には要素自身の幅・高さが必要なので取得しておく
		const rect = this.container.getBoundingClientRect();
		const elemWidth = rect.width;
		const elemHeight = rect.height;

		// 画面内からはみ出ないように座標を補正 (0 ～ 画面幅-要素幅)
		const maxLeft = Math.max(0, currentWidth - elemWidth);
		const maxTop = Math.max(0, currentHeight - elemHeight);

		newLeft = Math.min(Math.max(0, newLeft), maxLeft);
		newTop = Math.min(Math.max(0, newTop), maxTop);

		// bottom/right や transform による影響を打ち消す場合は以下を指定
		this.container.style.bottom = 'auto';
		this.container.style.transform = 'none';

		// 補正後の位置を適用
		this.container.style.left = `${newLeft}px`;
		this.container.style.top = `${newTop}px`;

	}

	//ブラウザのアドレスを消して全画面表示 -1=auto ,1=full,2=解除
	restoreFullScreen(flg = -1)
	{
		//画面フルスクリーン
		this.savePosition();
		fullScreen(flg);
		this.restorePosition();
		this.insideScreen();

		/*こっちだと逆にダメ
		this.savePosition();
		fullScreen(flg);
		// フルスクリーン解除はアニメーションを伴い非同期に完了するため、resizeイベント（画面サイズの変化完了）を待ってから復元処理を行う
		this.container.addEventListener('resize', function onResize()
		{
			// 一度実行したらリスナーを削除しておく（毎回発火させないため）
			this.container.removeEventListener('resize', onResize);

			this.restorePosition();
			this.insideScreen();
		});
		*/
	}
}


export function mousemove(e)
{
	//if (activeWindow)
	//	activeWindow.handleMouseMove(e);
	//全ウィンドウクラスの移動・リサイズ
	//windows.forEach(win => win.handleMouseMove(e));
}

export function mouseup(e)
{
	//if (activeWindow)
	//	activeWindow.handleMouseUp(e);

	//全ウィンドウクラスの移動・リサイズ
	//windows.forEach(win => win.handleMouseUp(e));
}


//ブラウザのアドレスを消して全画面表示 -1=auto ,1=full,2=解除
export function fullScreen(flg = -1)
{
	//自動
	if (flg == -1)
		flg = !(document.fullscreenElement);

	if (flg)
	{
		// documentElement(html全体)を全画面化する
		// ※ユーザーのクリックがきっかけでないと動かないので注意
		document.documentElement.requestFullscreen()
			.catch((err) =>
			{
				// 全画面化に失敗した場合(未対応ブラウザなど)はエラーを表示
				console.log("全画面化できませんでした:", err);
			});
	}
	else
	{
		// exitFullscreen()を呼ぶと、今の全画面表示を解除できる
		document.exitFullscreen()
			.catch((err) =>
			{
				// すでに全画面でない場合などはエラーになることがある
				console.log("解除に失敗しました:", err);
			});
	}
}