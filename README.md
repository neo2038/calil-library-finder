# 📚 近くの図書館を探す

[カーリル図書館API](https://calil.jp/doc/api.html) を使って、現在地から近くの図書館を検索する静的Webアプリです。

## 機能

- 現在地（GPS）から近くの図書館を検索
- 図書館名・住所・距離・カテゴリを表示
- ウェブサイトリンク・Google マップリンク
- APIキーはブラウザのlocalStorageに保存（サーバー不要）

## 使い方

1. [カーリル図書館API](https://calil.jp/api/dashboard/) でアプリケーションキーを取得
2. `index.html` をブラウザで開く（またはHTTPサーバーで配信）
3. APIキーを入力して「保存して検索」
4. 「現在地で検索」ボタンをクリック

## ローカルで動かす

```bash
# Python がある場合
python3 -m http.server 8000

# Node.js がある場合
npx serve .
```

ブラウザで `http://localhost:8000` を開く。

> ⚠️ `file://` で直接開くと geolocation が動作しない場合があります。HTTPサーバー経由で開いてください。

## 使用API

- **図書館データベースAPI** `GET https://api.calil.jp/library`
  - `geocode` : 経度,緯度（現在地）
  - `limit` : 取得件数
  - `format=json&callback=` : JSONP形式で取得

## ファイル構成

```
calil-library-finder/
├── index.html   # メインページ
├── style.css    # スタイル
├── app.js       # ロジック（CALIL APIコール・表示）
└── README.md
```

## ライセンス

MIT
