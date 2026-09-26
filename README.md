# Java 認定資格 対策クイズ

Oracle Certified Java Programmer の出題範囲に沿った練習問題アプリです。
フロントエンド完結（静的ファイルのみ）で動作します。

次の 3 つの試験区分を収録しており、トップ画面で切り替えられます。

| 試験区分 | 試験番号 | 本試験の形式 | 正解の検証に使う JDK |
|---|---|---|---|
| **Silver SE 11** | 1Z0-815-JPN | 80 問 / 180 分 / 合格ライン 63% | JDK 11 |
| **Silver SE 17** | 1Z0-825-JPN | 60 問 / 90 分 / 合格ライン 65% | JDK 17 |
| **Gold SE 17** | 1Z0-826-JPN | 60 問 / 90 分 / 合格ライン 65% | JDK 17 |

問題は試験区分ごとのディレクトリ（`src/silver/`、`src/silver17/`、`src/gold/`）に分けています。

## 特徴

- **正解を実機で検証している**（Silver SE 11 は JDK 11、Silver SE 17 と Gold SE 17 は JDK 17）
  コードを伴う問題は、ビルドのたびに実際の `javac` / `java` でコンパイル・実行し、
  「コンパイルが通るか」「実行結果が何か」を期待値と突き合わせています。
  人間の記憶ではなく処理系の出力が正解の根拠です。
  Gold のモジュール構成・`jdeps`・ファイル I/O・JDBC（H2 Database で実際に SQL を実行）・リソース・バンドルの問題も実機で検証しています。
- 本試験と同じ選択式（単一選択 / 複数選択）。複数選択は部分点なし
- 出題範囲の分野ごとに練習できる分野別モード
- 制限時間つきの模擬試験モード（試験区分ごとに本試験と同じ出題数・制限時間・合格ラインを設定）

## 出題範囲

### Silver SE 11

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

Stream API は Silver の範囲外（Gold の範囲）のため含めていません。

### Silver SE 17

Oracle 公式の試験内容チェックリスト（Java SE 17 Programmer I）の 6 分野で構成しています。

| 分野 | 内容 |
|------|------|
| Java の概要と簡単なプログラム | main メソッド、コンパイルと実行、パッケージと import |
| 基本データ型と文字列 | 変数とスコープ、var、文字列とテキスト・ブロック、配列、ArrayList |
| 演算子と制御構造 | 演算子、if / switch 文、switch 式、繰り返し、break / continue |
| クラスとインスタンス | コンストラクタ、オーバーロード、static、アクセス修飾子、パターン・マッチング、レコード |
| 継承とインタフェース | 抽象クラス、オーバーライド、キャスト、インタフェース、シール・クラス |
| 例外処理 | 検査例外と非検査例外、try-with-resources、カスタム例外、multi-catch |

Silver SE 11 の問題のうち SE 17 の範囲にも入るものを流用し（JDK 17 で改めて検証しています）、
switch 式・テキスト・ブロック・レコード・パターン・マッチング・シール・クラスの問題を加えています。
ラムダ式・モジュール・日付と時刻の API は Silver SE 17 の範囲外のため含めていません。

### Gold SE 17

Oracle 公式の試験内容チェックリスト（Java SE 17 Programmer II）の 8 分野で構成しています。

| 分野 | 内容 |
|------|------|
| コレクションとジェネリクス | List / Set / Map / Deque、総称型とワイルドカード、Comparator、オートボクシング |
| 関数型インタフェースとラムダ式 | 内部クラス・無名クラス、関数型インタフェースの定義、ラムダ式とメソッド参照、java.util.function |
| Stream API | 中間操作、reduce / collect / Collectors、集計・探索、Optional、並列ストリーム |
| モジュール・システム | exports / opens、無名モジュール・自動モジュール、jdeps、ServiceLoader |
| 並列処理 | Thread / Runnable、ExecutorService、synchronized とロック、並行コレクション、Flow |
| ファイル I/O | コンソール、I/O ストリーム、シリアライズ、Path / Files、Files のストリーム操作 |
| JDBC | DriverManager / DataSource、Statement / PreparedStatement、トランザクション、CallableStatement |
| ローカライズ | Locale、リソース・バンドル、MessageFormat、数値・日付のフォーマット |

## 問題について

本試験の実際の問題は著作権で保護されており、**転記は一切していません**。
公開されている出題範囲に基づき、同じ分野・同じ問い方で作成した独自問題です。
そのため本試験の得点を予測するものではなく、出題範囲の理解を確認するための教材です。

## セットアップ

### 必要なもの

- Node.js
- **JDK 11 と JDK 17**（問題の検証に使用。Silver SE 11 は SE 11、Silver SE 17 と Gold SE 17 は SE 17 の仕様で検証するため、両方が必要）
- インターネット接続（初回の検証時に、JDBC の問題で使う H2 Database のドライバを Maven Central から取得します）

JDK が未導入の場合:

```bash
winget install EclipseAdoptium.Temurin.11.JDK
winget install EclipseAdoptium.Temurin.17.JDK
```

検証スクリプトは JDK 11 / 17 を自動で探します。見つからない場合は `JAVA11_HOME` / `JAVA17_HOME` を設定してください。

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

`tsc` → `verify:java`（JDK 11 / 17 による全問検証）→ `vite build` の順に実行されます。
問題の正解が実機の挙動と食い違っている場合、ここでビルドが失敗します。

### 検証だけを実行

```bash
npm run verify:java
npm run verify:java -- --exam gold17          # 試験区分を絞る
npm run verify:java -- --exam gold17 --show   # 各問の実機の結果も表示する
```

## デプロイ

Cloudflare Workers（静的アセット配信）にデプロイします。

```bash
npm run deploy
```

`npm run build`（JDK 実機検証込み）のあと `wrangler deploy` を実行します。事前に `npx wrangler login` が必要です。

Git push 連携の自動デプロイ（Cloudflare Workers Builds）も有効にしていますが、そのビルド環境には JDK が無いため、
`wrangler.jsonc` の `build.command` は実機検証を含まない `npm run build:deploy`（`tsc && vite build` のみ）を使っています。
問題データの実機検証は手元の `npm run build` と、push/PR ごとに走る [.github/workflows/verify.yml](.github/workflows/verify.yml) で行います。

## 技術スタック

- TypeScript
- Vite
- バニラ DOM（フレームワーク不使用）

## ライセンス

MIT
