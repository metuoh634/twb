// client.js
import { PACKET_TYPE, PORT } from '/shared/config.js';
import { addLog } from '../shared/sub.js';
//クライアントwsはnode標準搭載

let ws = null;
export let connected = false;

// 複数のコールバックを保管する箱（初期状態は空っぽ）
//export let onchat = null;  //これだと外から書き換え不可
export const callbacks =
{
	onchat: null,
	onmove: null
};

//WebSocketサーバーに接続し、各種イベントのコールバックを登録する
export function init()
{
	//本番（https配信のCloudflare Pages）では、暗号化された wss:// を使う必要がある
	//自分のパソコンで動かして試す時（http）は、今まで通り ws:// でよい
	const isSecure = (location.protocol === 'https:');
	const protocol = isSecure ? 'wss' : 'ws';

	//クライアントとサーバーが別ドメインになるので、本番用のURLに書き換えてください
	const wsHost = isSecure ? "あなたのアプリ名-組織名-xxxx.koyeb.app" : `${window.location.hostname}:${PORT}`;
	ws = new WebSocket(`${protocol}://${wsHost}`);

	// これをつけることで、サーバーから届くバイナリを正しく受け取れるようになります
	ws.binaryType = 'arraybuffer';

	//セッション開始
	ws.onopen = () =>
	{
		connected = true;
		addLog("INFO", "サーバーと接続しました。");
	}
	//セッション終了
	ws.onclose = () =>
	{
		connected = false;
		addLog("INFO", "サーバーとの接続が切れました。");
	};
	//セッションエラー
	ws.onerror = (error) =>
	{
		connected = false;
		addLog("ERROR", "サーバーとの接続が切れました。(" + error.code + ")");
	};


	//サーバーから受信
	ws.onmessage = (event) =>
	{
		// 届いたバイナリを読み取るために Uint8Array に包む
		const data = new Uint8Array(event.data);

		// 1バイト目からタイプを読み取る
		const dataType = data[0];

		// ─── チャットを受信した場合 ───
		if (dataType === PACKET_TYPE.CHAT)
		{
			ongetchat(data);
		}

		// ─── 移動データを受信した場合 ───
		else if (dataType === PACKET_TYPE.MOVE)
		{
			ongetmove(event.data);
		}
	};

	return true;
}

//データを送信する汎用関数
function sendBinary(buffer)
{
	if (ws && ws.readyState === WebSocket.OPEN)
	{
		// type と data をセットにして、JSON文字列にして送信
		//const packet = JSON.stringify({ type: type, data: data });
		ws.send(buffer);
	}
}

//wsチャット受信
function ongetchat(data)
{
	// 2バイト目（インデックス1）以降のバイナリを取り出す
	const textBytes = data.subarray(1);

	// バイナリを人間の読める文字列（UTF-8）に逆変換
	const decoder = new TextDecoder();
	const chatMessage = decoder.decode(textBytes);

	// 前に作った、画面にログを出す関数（innerTextで安全なやつ！）を呼び出す
	if (callbacks.onchat)
		callbacks.onchat(chatMessage);
	else
		addLog("WARNING", "onChatコールバック指定無し");
}

//チャット送信
export function sendChat(text)
{
	// 1. 文字列をバイナリ（UTF-8）のバイト列に変換する便利メカニズム
	const encoder = new TextEncoder();
	const textBytes = encoder.encode(text); // 例: "あ" -> [227, 129, 130]

	// 2. 「タイプ用(1バイト) + 文字列用」の合計サイズを持つ新しいバイナリの箱を作る
	const packet = new Uint8Array(1 + textBytes.length);

	// 3. 1バイト目にチャットのタイプ（1）を入れる
	packet[0] = PACKET_TYPE.CHAT;

	// 4. 2バイト目以降に、変換した文字列のバイナリをそっくりコピーする
	packet.set(textBytes, 1);

	// 5. サーバーへ生のバイナリのまま送信！
	sendBinary(packet);
}


//ws移動受信
function ongetmove(arrayBuffer)
{
	// DataViewを使って、バイト列から小数を正しく引き抜く
	const view = new DataView(arrayBuffer);
	const x = view.getFloat32(1, true);
	const y = view.getFloat32(5, true);
	const z = view.getFloat32(9, true);

	// Three.jsの立方体の位置を更新する関数などを呼び出す
	if (callbacks.onmove)
		callbacks.onmove(x, y, z);
	else
		addLog("WARNING", "onmoveコールバック指定無し");
}

//移動を送信
export function sendMove(x, y, z)
{
	const buffer = new ArrayBuffer(13); // 13バイトのメモリを確保
	const view = new DataView(buffer);

	view.setUint8(0, PACKET_TYPE.MOVE); // 1バイト目にタイプ（2）を書き込む
	view.setFloat32(1, x, true);        // 2〜5バイト目にX座標
	view.setFloat32(5, y, true);        // 6〜9バイト目にY座標
	view.setFloat32(9, z, true);        // 10〜13バイト目にZ座標

	sendBinary(buffer);
}
