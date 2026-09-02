import http from 'http';
//import fs from 'fs';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { PORT } from '../shared/config.js';

export let server = null;
export let routeAPI = null;

//ブラウザは サーバーが実際に置いているフォルダ構成を知りません
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPrefix = 'client';
const sharedPrefix = 'shared';
const PUBLIC_DIR = path.join(__dirname, '../' + publicPrefix);
const SHARED_DIR = path.join(__dirname, '../' + sharedPrefix);
//クライアント側呼び出し方 '/shared/config.js'

const mimeTypes = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	// 追加: 画像系のMIMEタイプ
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.webp': 'image/webp',
	'.glb': 'model/gltf-binary',
	".hdr": 'image/vnd.radiance',
};

//httpserverメモ
/*
//req要求
//req.url						string		リクエストのURLパス（例: "/users?id=1"）を取得
//req.method					string		HTTPメソッド（"GET", "POST", "PUT", "DELETE" など）
//req.headers					object		ヘッダー情報（req.headers['content-type'] など）
//req.on('data', chunk => ...)	イベント	POST / PUTなどのリクエストボディ（データ）受信
//req.on('end', () => ...)		イベント	リクエストボディ受信完了の検知

//res返し
//res.writeHead(...)(status, headers)	ステータスコードとヘッダーを一括設定
//res.setHeader(...)(name, value)		個別でレスポンスヘッダーを設定
//res.statusCode	number				ステータスコード（200, 404, 500 など）を指定
//res.write(...)(chunk)					レスポンスボディを出力（複数回呼び出し可能）
//res.end(...)([data])					レスポンス送信を完了（引数で最終データを渡せる）

//status code
//処理が正常に完了したことを示します。
//200 	OKリクエスト成功（最も一般的）
//201 	Createdリクエストが成功し、新しいリソースが作成された（POST等）
//204 	No Contentリクエストは成功したが、返すべきレスポンスボディがない
//Redirection（リソースの場所が移動したため、追加の動作が必要）
//301	Moved Permanently	指定URLへ恒久的に移動（検索エンジンに評価を引き継ぐ）
//302	Found	一時的なリダイレクト
//304	Not Modified	キャッシュが有効（更新がないため再ダウンロード不要）
//client error
//400	Bad Request	リクエストの構文やパラメータが不正
//401	Unauthorized	ログイン・認証が必要、または認証失敗
//403	Forbidden	閲覧・操作の権限がない
//404	Not Found	ページやファイルが存在しない
//405	Method Not Allowed	GET専用の場所にPOSTするなど、メソッド非対応
//409	Conflict	データ重複など、リソースの状態で衝突が発生
//server error
//500	Internal Server Error	サーバー内部で予外のプログラムエラーが発生
//502	Bad Gateway	ゲートウェイ・プロキシサーバーが不正な応答を受信
//503	Service Unavailable	サーバーが過負荷またはメンテナンス中で一時停止中
//504	Gateway Timeout	ゲートウェイ・プロキシが上流サーバーからの応答待ちでタイムアウト
*/

// api関数呼び出し // falseを返すと404出力
function callAPI(req, res, body)
{
	// api関数名取得
	let apistr = "/api/";
	let apiName = null;
	if (req.url.startsWith(apistr))
		apiName = req.url.slice(apistr.length);

	//routes.jsの中に該当する名前があるか探す
	if (routeAPI)
	{
		const handler = routeAPI[apiName];
		if (handler)
		{
			try
			{
				//関数実行
				const ret = handler(req, res, body);
				plainWrite(res, ret.code, ret.message, ret.results);
				return true;
			}
			catch (e)
			{
				plainWrite(res, 400, "APIエラーで終了しました" + e.message, null);
			}
		}
	}
	return false;
}

//log & レスポンス
function plainWrite(res, code, message, results, contentType = 'application/json; charset=utf-8')
{
	//console
	if (message)
	{
		//if (results)
		//	console.log(JSON.stringify({ message: message, results: results }));
		//else
		console.log(message);
	}

	//このレスポンスは、もうヘッダーを送信し終えたかどうか
	if (!res.headersSent)
	{
		res.writeHead(code, { 'Content-Type': contentType });

		//contents設定の場合はそのまま返す
		if (results && results.contents)
			res.end(results.contents);
		else
			res.end(JSON.stringify({ code: code, message: message, results: results }));
	}
}

//httpserver初期化
export function init(api)
{
	routeAPI = api;

	//asyncする問題点　async関数内の例外はcatchされない、エラーが起きたときにサーバーごと落ちる可能性がある？asyncじゃなくても落ちるけど。
	//webサーバー立ち上げ
	server = http.createServer(async (req, res) =>
	{
		console.log(req.method, req.url);

		try
		{

			// Render/Koyebなどのホスティング先が「サーバーが生きているか」を定期的に確認しにくる場所、ファイルを読みに行く必要はない
			if (req.url === '/health')
			{
				plainWrite(res, 200, 'OK', { contents: 'OK' }, 'text/plain; charset=utf-8');
				return;
			}
			// 1. 静的ファイルの配信（index.html, main.js, style.css など）
			if (req.method === 'GET')
			{
				// 変更点: PUBLIC_DIR の配下に限定してパスを結合
				//const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
				//const filePath = path.join(PUBLIC_DIR, safePath);

				let baseDir = PUBLIC_DIR;
				let reqPath = req.url === '/' ? '/index.html' : req.url;

				//不正な形式の文字列検知
				let relativePath = decodeURIComponent(reqPath);

				// URLが "/shared/" で始まっていたら、配信元フォルダを SHARED_DIR に切り替える　// "/shared/config.js" → SHARED_DIR + "/config.js" を読みに行く	
				if (relativePath.startsWith('/' + sharedPrefix + '/'))
				{
					baseDir = SHARED_DIR;
					relativePath = relativePath.slice(('/' + sharedPrefix + '/').length - 1); // 先頭の "/" は残しておく
				}

				//URLをきれいにして(見た目上)、ベースディレクトリ+指定パス結合
				const filePath = path.resolve(baseDir, '.' + path.normalize(relativePath));
				//兄弟誤判定が無いように末尾に区切りをつける
				const pubSep = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;

				// 指定パスが base の外に出ていないか（ディレクトリトラバーサル対策）
				if (filePath !== baseDir && !filePath.startsWith(pubSep)) 
				{
					plainWrite(res, 403, 'Forbidden')
					return;
				}

				const ext = path.extname(filePath);
				const contentType = mimeTypes[ext];

				if (contentType)
				{
					try
					{
						//ファイル読み込み(同期)、画像も問題なし
						const content = await fsp.readFile(filePath);
						plainWrite(res, 200, '静的ファイル読み込み', { contents: content }, contentType);
						return;
					}
					catch (e)
					{
						plainWrite(res, 404, 'Content-Type Not Found' + e.message);
						return
					}
				}

				//mimeTypesに無い拡張子はここで404を返す（応答なしハングを防ぐ）
			}
			else if (req.method === 'POST')
			{
				req.setEncoding('utf8'); // 追加: chunkの境目での日本語などの文字化けを防止

				//分割データ受け取り(たぶん非同期)
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				//for await (const chunk of req) { body += chunk; }

				// 'end'イベントをPromise化し、受信完了までここで待機する
				await new Promise((resolve) => { req.on('end', resolve); });

				//API呼び出し
				if (callAPI(req, res, body))
					return;

				//return; // POST全体の処理が終わったのでここで関数を抜ける
			}

			//Not Found
			plainWrite(res, 404, 'Not Found');

		}
		catch (e) 
		{
			plainWrite(res, 500, 'Internal Server Error' + e.message);
		}

	});
}

//Render/Koyebともに「0.0.0.0（すべての受信を待ち受ける）にバインドすること」を推奨しています
server.listen(PORT, '0.0.0.0', () =>
{
	console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});