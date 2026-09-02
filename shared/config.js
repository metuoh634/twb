//ポート番号

//Koyebなどのホスティング先では、起動時に使うポート番号が
//環境変数 process.env.PORT で渡されることがある、ただしこのファイルはブラウザ側からも読み込まれ、
//ブラウザには process という変数が存在しないため、先に「process が使えるかどうか」を確認してから使う
export const PORT =
	(typeof process !== 'undefined' && process.env.PORT)
		? process.env.PORT
		: 5135;

//通信のタイプ
export const PACKET_TYPE =
{
	CHAT: 1,
	MOVE: 2
};

