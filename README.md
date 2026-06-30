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
ADMIN_CODE=your-secret-code npm start
```

## 公開するとき

Render などの Node.js 対応サービスに公開できます。

- Start command: `npm start`
- Environment variable: `ADMIN_CODE`
