# CLAUDE.md

このファイルは Claude Code (claude.ai/code) および Cursor Agent がこのリポジトリで作業する際の**正本ルール**です。Cursor 側は [.cursor/rules/project-guide.mdc](.cursor/rules/project-guide.mdc) から本ファイルを参照するだけにし、規約本文はここだけを更新する。

## プロジェクト概要

Oracle Certified Java Programmer の対策クイズアプリ。
フロントエンド完結（TypeScript + Vite、バニラ DOM）。詳細は [README.md](README.md) 参照。

収録している試験区分は 3 つで、画面上で切り替えて使う。

| 試験区分 | 試験番号 | 検証に使う JDK | 問題の置き場所 |
|---|---|---|---|
| Silver SE 11 | 1Z0-815-JPN | 11 | [src/silver/](src/silver/) |
| Silver SE 17 | 1Z0-825-JPN | 17 | [src/silver17/](src/silver17/)（Silver SE 11 の問題の流用＋SE 17 の新機能） |
| Gold SE 17 | 1Z0-826-JPN | 17 | [src/gold/](src/gold/) |

- 試験区分の設定（試験番号・JDK・出題数・制限時間・合格ライン・分野）は [src/quizTypes.ts](src/quizTypes.ts) の `EXAMS` にまとめている
- [src/questions.ts](src/questions.ts) が全試験を結合する集約点。各問題に試験区分（`exam`）を付けて結合する。新しい試験区分はここに足す
- 分野の型は試験区分ごとに分かれている（`SilverTopic` / `Silver17Topic` / `GoldTopic`）。キーは試験区分をまたいで重複しうる（`modules` など）ため、表示名は `topicMeta(exam, topic)` で引く
- 問題 ID と論点キー（`variantOf`）は試験区分をまたいで一意にする。ブックマーク・復習リストは ID で保存しているため

このプロジェクトの価値は **「正解が実機で裏取りされていること」** にある。
その前提が崩れる変更（検証のスキップ、`not-verifiable` の濫用）は、アプリの存在意義を損なう。

## 最優先ルール

### 1. 本試験の問題を転記しない

本試験の実際の問題文・選択肢は著作権で保護されている。
出典が本試験の問題そのものと分かるもの（受験者による復元問題を含む）は、いかなる形でも取り込まない。
作るのは、公開されている出題範囲に基づく独自問題に限る。

### 2. コードを伴う問題には必ず `expected` を書く

`expected` は「この問題のコードを、試験区分の JDK（Silver SE 11 は 11、Silver SE 17 と Gold SE 17 は 17）で実行したらこうなるはず」という宣言で、
`npm run verify:java` が実機の出力と突き合わせる。これが正解の根拠になる。

```ts
expected: { kind: "output", stdout: "7 12" }        // 正常終了し、この標準出力になる
expected: { kind: "compile-error", line: 5 }         // この行でコンパイルエラーになる
expected: { kind: "exception", type: "ClassCastException" } // 実行時にこの例外で終了する
expected: { kind: "exception", type: "IllegalStateException", stdout: "3" } // 「3 と出力された後」例外で終了する
```

正解の選択肢が「X と出力された後、〜がスローされる」の形なら、`stdout` に X を書く（検証スクリプトが選択肢と照合する）。

**`expected` を自分の記憶から書いて、検証を通さずに完了としないこと。**
書いた期待値が実機と違えばビルドが落ちる。落ちたら、まず自分の理解が誤っていたことを疑う。

### 3. `not-verifiable` は原則として使わない

**現在 `not-verifiable` の問題は 0 件で、全問が実機検証されている。この状態を維持すること。**

単一ファイルで検証できない場合も、次の手段で実機検証できることが多い。

- **`moduleSetup`**: 複数モジュールを構成して `--module-source-path` でコンパイル・実行する。
  「exports していないパッケージは他モジュールから見えない」のように、
  モジュールをまたいで初めて確認できる挙動はこれで検証する
- **`runAsSourceFile`**: `javac` を介さず `java Foo.java` で実行する（SE 11 以降のソースファイルモード）
- **`moduleSetup.jars`**: module-info.java を持たない JAR を作り、モジュールパス（自動モジュール）かクラスパス（無名モジュール）に置く
- **`moduleSetup.tool`**: 構成をビルドしたあと `jdeps` / `jar` / `java` コマンドを実行し、その出力を結果とする（jdeps の出力やコマンドラインオプションの裏取り）
- **`resources`**: コードが読むファイル（リソース・バンドルの .properties、入力ファイルなど）を作業ディレクトリに置く。画面にもコードと並べて表示される
- **`stdin`**: 標準入力に流し込む内容（コンソール入力の問題）
- **`libraries: ["h2"]`**: JDBC の問題で H2 Database（インメモリ）のドライバをクラスパスに載せ、実際に SQL を実行する

どうしても検証できない場合に限り `not-verifiable` を使い、`reason` に理由を必ず書く。
「期待値を書くのが面倒」「検証が通らない」という理由で使ってはいけない。

### モジュール構成での検証（`moduleSetup`）

```ts
expected: { kind: "compile-error" },
moduleSetup: {
  main: "com.example.client/com.example.client.Main", // 省略するとコンパイルのみ
  sources: [
    { module: "com.example.lib", path: "module-info.java", content: ["module com.example.lib {", "}"] },
    { module: "com.example.lib", path: "com/example/lib/api/Api.java", content: [...] },
  ],
},
```

`code` を省略した `moduleSetup` の問題は、`jars` と `sources` のファイル一式がそのまま画面に表示される
（表示しているコードと検証したコードを一致させるため）。

**注意**: `moduleSetup` と `runAsSourceFile` による検証は「解説で主張している挙動が
処理系と一致するか」の裏取りであり、**正解の選択肢と実行結果の一致は検証されない**
（選択肢が文章による説明であり、実行結果と文字列比較できないため）。
そのため、これらの問題では選択肢と解説の対応を人間が確認する必要がある。
`npm run verify:java -- --show` で各問の実機の結果（コンパイルエラーや例外のメッセージ）を表示できるので、
「期待どおりの種類の結果が、解説どおりの理由で起きているか」を必ず確かめる。

## 出題範囲

範囲外の内容で問題を作らないこと。出題範囲を広げる場合は、根拠（公式の試験トピック）を確認してから。

### Silver SE 11

[src/quizTypes.ts](src/quizTypes.ts) の `SilverTopic` が出題範囲の 11 分野に対応している。

- **Stream API は Silver の範囲外**（Gold の範囲）。Silver では出題しない
- ラムダ式・関数型インタフェースは Silver の範囲内（基礎レベル）
- モジュールシステムは範囲内
- SE 11 の言語機能（`var`、`String.repeat` / `strip` / `isBlank` など）は範囲内

### Silver SE 17

`Silver17Topic` は Oracle 公式の「試験内容チェックリスト」（Java SE 17 Programmer I / 1Z0-825-JPN）の 6 分野に対応している。

- SE 11 から加わった範囲: switch 式、テキスト・ブロック、レコード、instanceof のパターン・マッチング、シール・クラス
- **範囲外**: ラムダ式・関数型インタフェース、モジュール、日付・時刻 API、ArrayList 以外のコレクション（List.of、HashMap など）、Comparator
- パターン・マッチングの switch は SE 17 ではプレビュー機能なので出題しない

問題は 2 系統ある。

- [src/silver17/fromSilver11.ts](src/silver17/fromSilver11.ts): Silver SE 11 の問題のうち SE 17 の範囲にも入るものを流用する。
  ID は元の ID + 20000、論点キーは `s17-` + 元のキー。流用した問題も JDK 17 で改めて検証される。
  Java のバージョンを名指しした記述や、JDK 17 で結果が変わる選択肢は `TEXT_OVERRIDES` で置き換える。
  **Silver SE 11 に問題を追加・修正すると、Silver SE 17 にも自動で反映される**ので、SE 17 の範囲に入る問題なら JDK 17 でも成り立つように書く
- [src/silver17/java17.ts](src/silver17/java17.ts): SE 17 で加わった言語機能の問題（id 21001-）。論点キーは `s17-<分野>-<論点>`

### Gold SE 17

`GoldTopic` は Oracle 公式の「試験内容チェックリスト」（Java SE 17 Programmer II / 1Z0-826-JPN）の 8 分野に対応している。

- コレクションとジェネリクス / 関数型インタフェースとラムダ式（内部クラスを含む）/ Stream API /
  モジュール・システム（jdeps、ServiceLoader を含む）/ 並列処理（Flow を含む）/ ファイル I/O / JDBC / ローカライズ
- record や var などの Java 17 までの言語機能は、コードの中で使ってよい（それ自体を主題にするのは Silver SE 17 の範囲）
- 例外処理そのもの、日付・時刻 API の計算はチェックリストに無いので主題にしない（ローカライズでの日付の書式は範囲内）

Gold で気を付けること:

- **実行のたびに結果が変わるコードは出題しない**。並列処理の問題はスレッドの完了を `join` / `Future.get` などで必ず待ち、
  出力順が実行順序に依存しない形にする（検証は 1 回しか実行しないので、偶然通ることがある）
- **Path を文字列として出力しない**。区切り文字が OS で異なり、手元（Windows）と CI（Linux）で結果が変わる。名前要素の単位で扱う
- ファイルを読み書きする問題は相対パスで書く。検証時のカレントディレクトリは問題ごとの作業ディレクトリ
- **検証時の既定ロケールは ja_JP、タイムゾーンは Asia/Tokyo に固定している**（`RUNTIME_PROPS`）。
  既定ロケールに依存する問題では、問題文に「デフォルトロケールは ja_JP とする」と明記する
- JDBC は H2 で検証するが、**JDBC の仕様として定まっている振る舞いだけを出題する**。
  H2 は仕様より寛容な箇所がある（自動コミット中の `rollback()` が例外にならない、前方専用の ResultSet で `absolute()` が動くなど）ので、そうした挙動は問わない。
  例外はベンダー固有のサブクラスになるため、`catch (SQLException e)` で受けて出力する形にする

## 問題の作り方

本試験の問い方を再現する。

- 問題文は「次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。」のような定型
- 複数選択なら「2つ選びなさい」のように選ぶ数を明示する（採点は部分点なしの完全一致）
- 選択肢は 4〜6 個。実行結果を問う問題では、選択肢に「コンパイルエラーになる」「実行時に例外がスローされる」を混ぜる
- 誤答の選択肢は、典型的な勘違いに対応させる（ありえない値を並べない）
- 解説は「なぜそうなるか」を仕様に基づいて書く。結論だけ書かない

### 解説の深さ

解説は試験対策の暗記事項の列挙にとどめず、**本質的な理解を助ける内容を目指す**（必須ではないが望ましい）。
目安として、次の 3 つを意識する。

1. **何が起きたか**: 結論。どの規則が働いた結果その答えになるのか
2. **なぜそうなっているか**: 言語仕様がそう設計されている理由。
   「そう決まっているから」で止めず、その規則が何を守るために存在するのかまで触れる
   （例: フィールドが静的に解決されるのは、フィールドがポリモーフィズムの対象ではなく
   「型に属する記憶領域」だから。メソッドと違い実行時の型で切り替わらない）
3. **実務で何を意味するか**: その仕様を知らないとどんなバグを踏むか、どう書くのが安全か

ただし冗長にしない。3〜5 文程度で、読んで「なるほど」と腑に落ちることを優先する。

### 選択肢の並び

出題時に選択肢はシャッフルされ、正解のインデックスも追随する（`shuffleChoices`）。
そのため **問題データ上で正解の位置を分散させる必要はない**。
ただし選択肢のテキスト自体は、シャッフルされても意味が通るように書くこと
（「上記のすべて」「A と B の両方」のような、並び順に依存する選択肢は使わない）。

### 出力を問う問題の注意

`expected.kind === "output"` の場合、**正解の選択肢のテキストが期待出力と一致していなければならない**。
検証スクリプトがこの整合性もチェックする（`choice-mismatch`）。

## 検証

```bash
npm run verify:java                        # 全問を試験区分ごとの JDK でコンパイル・実行して検証（必須・build 組み込み）
npm run verify:java -- --exam gold17       # 1 つの試験区分だけ検証する（問題作成中の確認用）
npm run verify:java -- --exam gold17 --show  # 各問の実機の結果も表示する
npm run build                              # tsc → verify:java → vite build
```

検証スクリプトは JDK 11 と JDK 17 を自動検出する（`JAVA11_HOME` / `JAVA17_HOME`、CI では setup-java の `JAVA_HOME_11_X64` / `JAVA_HOME_17_X64` でも指定可）。
**Silver SE 11 は 11、Silver SE 17 と Gold SE 17 は 17 で検証する。別のバージョンで代用しない。** 試験区分の Java のバージョンの仕様で正解が決まるため
（検出時に `java -version` を読んで確かめている）。

JDBC の問題で使う H2 のドライバは、初回の検証時に Maven Central から取得し、SHA-1 を照合して `.java-lib/` に置く（Git 管理外）。

### デプロイのビルドは検証を含まない

Cloudflare Workers Builds（Git push 連携の自動デプロイ）のビルドイメージには
Go / Node.js / Python / Ruby はあるが **Java が無い**。そのため `wrangler.jsonc`
の `build.command` は `npm run build`（JDK 実機検証込み）ではなく、
`npm run build:deploy`（`tsc && vite build` のみ）を使っている。
JDK 前提のコマンドをそこに置くと自動デプロイが必ず失敗する。

問題データの実機検証は手元の `npm run build` と、push/PR ごとに走る
[.github/workflows/verify.yml](.github/workflows/verify.yml)（JDK 11 / 17 セットアップ込み）で担保している。
**`build.command` を安易に `npm run build` へ戻さないこと。**

### 検証で落ちる項目

- `expected-mismatch`: 期待した結果と実機の結果が違う（出力・コンパイルエラーの行・例外の型・例外までの出力）
- `choice-mismatch`: 正解として指定した選択肢が期待結果と噛み合っていない
- `choice-ambiguous`: 誤答として並べた「N行目でコンパイルエラーになる」の行でも実機でエラーが出ている（正解が 1 つに定まらない）
- `unique-id` / `variant-of` / `correct` / `choices` / `class-name`: 問題データの構造的な誤り

`choice-mismatch` / `choice-ambiguous` は実行結果を問う問題にだけ適用される。
「コンパイルエラーになる行はどれか」の問題では、エラーが本当に 1 行だけで出ることを確かめる
（検査例外の未処理などは、同じ原因で複数の行がエラーになりやすい）。
`moduleSetup` / `runAsSourceFile` の問題は対象外（上記の注意を参照）。

## その他

- `className` は `code` 内の public クラス名と一致させる（検証時のファイル名になる）
- 改行コードは既存ファイルに合わせる（`src/` 以下はいずれも LF）
- Silver の問題ファイル（[src/silver/](src/silver/)）の構成:
  - `core.ts`: 各分野の中核問題（id 1-11）
  - `more.ts`: 分野を厚くする問題（id 12-37）
  - `variants.ts` / `variants2.ts`: 既存論点の亜種（id 101-137）
  - `extra1.ts`: 論点を増やすための追加問題（id 201-）
  - `index.ts`: Silver 全問題の集約
- Gold の問題ファイル（[src/gold/](src/gold/)）は分野ごとに分け、id は分野ごとに 100 ずつ区切る:
  - `collections.ts`（10101-）/ `functional.ts`（10201-）/ `streams.ts`（10301-）/ `modules.ts`（10401-）
  - `concurrency.ts`（10501-）/ `io.ts`（10601-）/ `jdbc.ts`（10701-）/ `localization.ts`（10801-）
  - `<分野>2.ts`: 各分野の追加問題（id は同じ分野の番号帯で、1 つ目のファイルの続きから振る）
  - `index.ts`: Gold 全問題の集約
  - 論点キーは `gold-<分野>-<論点>` の形にする（Silver のキーと衝突させない）
