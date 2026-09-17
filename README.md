# Java 認定資格 対策クイズ

Oracle Certified Java Programmer の出題範囲に沿った練習問題アプリです。
フロントエンド完結（静的ファイルのみ）で動作します。

現在収録しているのは **Silver SE 11（1Z0-815-JPN）** です。
Gold など他の試験区分を追加できるよう、問題は試験ごとのディレクトリ（`src/silver/`）に分けています。

## 特徴

- **正解を JDK 11 で実機検証している**
  コードを伴う問題は、ビルドのたびに実際の `javac` / `java` でコンパイル・実行し、
  「コンパイルが通るか」「実行結果が何か」を期待値と突き合わせています。
  人間の記憶ではなく処理系の出力が正解の根拠です。
- 本試験と同じ選択式（単一選択 / 複数選択）。複数選択は部分点なし
- 出題範囲の 11 分野ごとに練習できる分野別モード
- 制限時間つきの模擬試験モード（本試験と同じ 80 問 / 180 分 / 合格ライン 63% の設定）

## 出題範囲

本試験の出題範囲に対応した 11 分野で構成しています。

| 分野 | 内容 |
|------|------|
| Java プログラムの基本 | main メソッド、パッケージ、import、実行の流れ |
| データ型と文字列 | プリミティブ型、型変換、String / StringBuilder、var |
| 演算子と判定構造 | 演算子の優先順位、短絡評価、if 文、switch 文 |
| 制御構造 | for / while / do-while、break / continue、ラベル |
| 配列 | 1次元・多次元配列、初期化、既定値、共変性 |
| メソッドとカプセル化 | オーバーロード、可変長引数、static、コンストラクタ |
| 継承・インタフェース | 継承、抽象クラス、default メソッド、ポリモーフィズム |
| 関数型インタフェースとラムダ式 | 関数型インタフェースの定義、ラムダ式、変数キャプチャ |
| 標準 API | List / ArrayList、不変コレクション、日付・時刻 API |
| 例外処理 | try-catch-finally、検査例外、try-with-resources |
| モジュールシステム | module-info.java、requires / exports |

Stream API は Silver の範囲外（Gold / 1Z0-816 の範囲）のため含めていません。

## 問題について

本試験の実際の問題は著作権で保護されており、**転記は一切していません**。
公開されている出題範囲に基づき、同じ分野・同じ問い方で作成した独自問題です。
そのため本試験の得点を予測するものではなく、出題範囲の理解を確認するための教材です。

## セットアップ

### 必要なもの

- Node.js
- **JDK 11**（問題の検証に使用。SE 11 の仕様で検証するため 11 が必要）

JDK 11 が未導入の場合:

```bash
winget install EclipseAdoptium.Temurin.11.JDK
```

検証スクリプトは JDK 11 を自動で探します。見つからない場合は `JAVA11_HOME` を設定してください。

### インストール

```bash
npm install
```

## 開発サーバー起動

```bash
npm run dev
```

## ビルド

```bash
npm run build
```

`tsc` → `verify:java`（JDK 11 による全問検証）→ `vite build` の順に実行されます。
問題の正解が実機の挙動と食い違っている場合、ここでビルドが失敗します。

### 検証だけを実行

```bash
npm run verify:java
```

## デプロイ

Cloudflare Workers（静的アセット配信）にデプロイします。

```bash
npm run deploy
```

`npm run build`（JDK 11 実機検証込み）のあと `wrangler deploy` を実行します。事前に `npx wrangler login` が必要です。

Git push 連携の自動デプロイ（Cloudflare Workers Builds）も有効にしていますが、そのビルド環境には JDK が無いため、
`wrangler.jsonc` の `build.command` は実機検証を含まない `npm run build:deploy`（`tsc && vite build` のみ）を使っています。
問題データの実機検証は手元の `npm run build` と、push/PR ごとに走る [.github/workflows/verify.yml](.github/workflows/verify.yml) で行います。

## 技術スタック

- TypeScript
- Vite
- バニラ DOM（フレームワーク不使用）

## ライセンス

MIT
