//windows.js
import { addLog } from '../shared/sub.js';

export let activeWindow = null;
export let windows = [];


//チャットバー
export let chatWindow;
export const chatLog = document.getElementById('chat-log');
export const chatInput = document.getElementById('chat-input');
export const chatSendBtn = document.getElementById('chat-send-btn');
export const chatContainer = document.getElementById('chat-container');
export const chatHeader = document.getElementById('chat-header');
export const chatCloseBtn = document.getElementById('chat-close-btn');

//ウィンドウクラス追加 呼び出し
export function init()
{
	//chatWindow = new WindowController('#chat-container', '#chat-header', '#chat-close-btn');
	//chatWindow = new WindowController('#chatArea', '#chatLog', null);

	chatWindow = new WindowController('#chatArea', '#chatLogText', null, '#chatTopBar', 'n', 300, 90);//minWidth = 280, minHeight = 180)
	windows.push(chatWindow);
}



//ウィンドウズクラス
class WindowController
{
	/**
	 * @param {string|HTMLElement} targetSelector - 動かしたいウィンドウの要素、またはセレクタ
	 * @param {string|HTMLElement} headerSelector - ドラッグのトリガーになるヘッダー要素（任意）
	 */
	constructor(targetSelector, headerSelector = null, closebtnSelector = null,
		resizeBarSelector = null, resizeBarDir = 'n', minWidth = 280, minHeight = 180)
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

		if (this.resizeBar)
		{
			this._makeResizable(this.resizeBar, resizeBarDir);
		}

		// ヘッダーイベントがある場合のみドラッグ可能
		if (this.header)
		{
			//ヘッダーマウスダウン
			this.header.addEventListener('pointerdown', (e) =>
			{
				// e.targetが「子要素自体」または「子要素の中身」である場合は、親の処理をスルーする
				if (this.header.contains(e.target) && e.target !== this.header)
				{
					// 💡「親の中に含まれている、かつ、親自身ではない」＝「子要素のどこかが触られた」ということ！
					//console.log('子要素（またはその中身）が触られました');
					return; // ここで処理を終わらせれば、親の処理をスキップできます
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
		}

		// 閉じるボタン
		if (this.closebtn)
		{
			this.closebtn.addEventListener('click', (e) =>
			{
				this.container.style.display = 'none';

				e.preventDefault();  //デフォルトの挙動（イベント）をキャンセルする
				e.stopPropagation(); //親へイベントが伝わるのを止める！
			});
		}
	}

	//ハンドル要素に「掴んで動かすとリサイズする」処理を付ける共通関数
	_makeResizable(handle, dir)
	{
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

	restore()
	{
		this.container.style.display = '';
	}

	isVisible()
	{
		//方法1 最終的に適用されている実際の display の値を取得して判定
		//return getComputedStyle(this.container).display !== 'none';

		//方法2 画面上に表示されていれば offsetParent は null 以外になる
		return this.container.offsetParent !== null;
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
