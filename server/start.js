import inspector from 'node:inspector'; // 追加：デバッガが接続されているか調べるため
import * as web from './web.js';
import * as ws from './ws_bin_server.js'; //webserverに相乗り
//import * as dbs from './db_sync.js';

//デバッグ情報
//const isDebugging = inspector.url() !== undefined; //デバッグ実行
const isMainModule = import.meta.url === `file:///${process.argv[1].replaceAll("\\", "/")}`;  //直接実行
//logc("green", (isMainModule ? "(main)" : "") + (isDebugging ? "(debug)" : "") + "で実行中 引数:" + JSON.stringify(process.argv.slice(2)))

//urlの文字列 と 実行する関数 の対応表（ルーティングテーブル）
export const routesAPI =
{
	//"seed": api_seed,
	//"query": api_query,
};

//web返信用
/*
const webResult = Object.seal(
	{
		code: 0,
		message: null,
		results: null,
	});
*/


//直接起動時
if (isMainModule)
{
	//webserver立ち上げ
	web.init(routesAPI);

	//websocket立ち上げ
	ws.init(web.server);
}



//サンプル
/*
//ダミーデータの作成
function api_seed(req, res, body)
{
	try
	{
		//データベース接続
		dbs.connect();

		//ダミーデータ作成
		let ret = dbs.seed(res);

		return { code: 200, message: "ダミーデータの取得完了", results: ret };
	}
	catch (e)
	{
		return { code: 400, message: "ダミーデータ取得に失敗しました" + e.message, results: null };
	}
	finally
	{
		dbs.close();
	}
}

//sql実行
function api_query(req, res, body)
{
	try
	{
		//文字列JSON解析
		const { sql } = JSON.parse(body);

		//クエリエラー
		if (!sql)
			return { code: 400, message: "SQLクエリが空です", results: null };

		const lowerSql = sql.trim().toLowerCase();

		//データベース接続
		dbs.connect();

		//select文
		if (lowerSql.startsWith('select'))
		{
			try
			{
				//データ取得
				const rows = dbs.all(sql);
				return { code: 200, message: "データ取得完了", results: rows };
			}
			catch (e)
			{
				return { code: 400, message: "データ取得が失敗しました" + e.message, results: null };
			}
		}
		else
		{
			//plainWrite(res, 501, "SELECT以外のクエリは未対応です。");
			//DELETE FROM users WHERE name = '佐藤 花子'

			try
			{
				//SQL実行
				const info = dbs.prepare(sql).run();
				let mes = "データ処理完了";
				//実行件数あり
				if (info.changes)
					mes += "(" + info.changes + ")";

				return { code: 200, message: mes, results: info };
			}
			catch (e)
			{
				return { code: 400, message: "データ処理が失敗しました" + e.message, results: null };
			}
		}
	}
	catch (e)
	{
		return { code: 400, message: "無効なJSONリクエストです。" + e.message, results: null };
	}
	finally
	{
		dbs.close();
	}
}
	*/