// ==========================================================================
// チャット入力の処理
// ==========================================================================

// HTMLから「入力欄」と「ログを表示するエリア」の要素を取得しておく
const chatInput = document.getElementById("chatInput");
const chatLog = document.getElementById("chatLog");

// 入力欄でキーが押されたときに呼ばれる処理を登録する
chatInput.addEventListener("keydown", (event) =>
{

	// 押されたキーが「Enter」以外なら何もしない
	if (event.key !== "Enter")
	{
		return;
	}

	// 入力された文字の前後の余分な空白を取り除く
	const message = chatInput.value.trim();

	// 何も入力されていない（空文字）場合は送信しない
	if (message === "")
	{
		return;
	}

	// ログに表示するための新しい要素（1行分）を作る
	const logLine = document.createElement("div");
	// 作った要素にメッセージの文字を入れる
	logLine.textContent = message;

	// 作った行をログエリアの一番下に追加する
	chatLog.appendChild(logLine);

	// 入力欄を空にして、次の入力に備える
	chatInput.value = "";

	// 新しい行が見えるように、ログエリアを一番下までスクロールする
	chatLog.scrollTop = chatLog.scrollHeight;
});