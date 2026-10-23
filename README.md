# サイネスHP 更新手順

1. Claude Designのキャンバス（サイネス ホームページ）で内容を修正する
2. Claudeに「HPを更新して」と依頼する。Claudeは以下を実行する
   - キャンバスの Main.dc.html を取得して `_source/Main.dc.html` を差し替え
   - `node _source/build.js _source/Main.dc.html . <FormspreeのURL>` で index.html / en/index.html を再生成
   - ローカルで日英・PC・スマートフォンの表示と差分を確認し、公開承認を得てから GitHubの main ブランチに push（GitHub Pagesが数分で自動反映）
3. https://www.sciness.co.jp で反映を確認する

- 写真は assets/ceo.jpg、OGP画像は assets/og.png
- DNS（お名前.com）のMX・TXTレコードはMicrosoft 365メール用。変更しないこと

## 確定ロゴと再生成

- 生成に使うのは `_source/build.js`。ルート直下の旧 `build.js` は使わない。
- `_source/build.js` が日英のヘッダー・フッターへ `assets/sciness-logo-white.svg` を適用する。幅は178px・142px、`height: auto` とSVGの1397:315の縦横比を維持する。
- faviconは `favicon.svg`、Apple Touch Iconは `assets/sciness-apple-touch-icon.png`。英語版の相対パスには `../` を付ける。構造化データのlogoは `https://www.sciness.co.jp/assets/sciness-logo.svg` を使う。
- 確定素材の原本は `downloads/sciness-logo.zip`（コミット `764dff104c036e522966d52d43cfb1c5581ec851`）。再生成・再デザインしない。
- キャンバスを更新してもビルド時にロゴを適用する。ヘッダー・フッターの構造変更でブランド要素を特定できない場合はビルドを停止するため、該当セレクターを確認する。
- Node.jsとCheerioが必要。未導入の場合はリポジトリ外へ `npm install --prefix /tmp/sciness-build-deps --ignore-scripts cheerio@1.0.0` で導入し、`NODE_PATH=/tmp/sciness-build-deps/node_modules node _source/build.js _source/Main.dc.html . https://formspree.io/f/xrpewyld` で既存フォーム接続を維持して生成する。
