# Study Rank

友達と勉強時間を共有して、スコアと順位を見られるアプリです。

## 使い方

```bash
npm start
```

ブラウザで `http://localhost:3000` を開きます。

## 管理者コード

公開するときは、環境変数 `ADMIN_CODE` に自分だけが知っているコードを設定してください。

```bash
ADMIN_CODE=yanace
```

## データベース保存

本番公開では、PostgreSQL の接続URLを `DATABASE_URL` に設定するとデータベース保存になります。

Renderなら PostgreSQL を作成して、Web Service の環境変数に次を設定します。

```text
DATABASE_URL=PostgreSQL の External Database URL
ADMIN_CODE=自分だけが知っている管理者コード
```

`DATABASE_URL` がないローカル環境では `records.json` に保存します。

## 公開するとき

Render などの Node.js 対応サービスに公開できます。

- Start command: `npm start`
- Environment variables: `ADMIN_CODE`, `DATABASE_URL`
