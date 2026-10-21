# サイネスHP 更新手順

1. Claude Designのキャンバス（サイネス ホームページ）で内容を修正する
2. Claudeに「HPを更新して」と依頼する。Claudeは以下を実行する
   - キャンバスの Main.dc.html を取得して `_source/Main.dc.html` を差し替え
   - `node _source/build.js _source/Main.dc.html . <FormspreeのURL>` で index.html / en/index.html を再生成
   - GitHubの main ブランチに push（GitHub Pagesが数分で自動反映）
3. https://www.sciness.co.jp で反映を確認する

- 写真は assets/ceo.jpg、OGP画像は assets/og.png
- DNS（お名前.com）のMX・TXTレコードはMicrosoft 365メール用。変更しないこと
