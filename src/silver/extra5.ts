import type { SilverQuestion } from "../quizTypes";

/** ラムダ式・モジュールシステムの論点を拡充する追加問題（id 321 以降） */
export const extraQuestions5: SilverQuestion[] = [
  // ============================================================ ラムダ (lambda)
  {
    id: 321,
    topic: "lambda",
    variantOf: "lambda-syntax-forms",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Syntax",
    code: [
      "interface Operation {",
      "    int apply(int a, int b);",
      "}",
      "",
      "public class Syntax {",
      "    public static void main(String[] args) {",
      "        Operation add = (a, b) -> { return a + b; };",
      "        Operation multiply = (int a, int b) -> a * b;",
      '        System.out.println(add.apply(2, 3) + " " + multiply.apply(2, 3));',
      "    }",
      "}",
    ],
    choices: ["5 6", "6 5", "23 23", "コンパイルエラーになる", "実行時に例外がスローされる"],
    correct: [0],
    expected: { kind: "output", stdout: "5 6" },
    explanation:
      "ラムダ式の本体は、式だけを書けば暗黙にその値が返り、波括弧で囲んだ場合は return を明示します。引数の型は文脈から推論できるため省略できますが、書く場合は全部の引数に書く必要があり、一部だけ型を書くことはできません。省略を許すのは、代入先の関数型インタフェースを見れば型が一意に決まるからで、var と同じ「文脈から分かるものは書かなくてよい」という方針です。なお括弧内が引数 1 つだけで型を省略する場合は、括弧自体も省略できます。",
  },
  {
    id: 322,
    topic: "lambda",
    variantOf: "lambda-method-reference",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Ref",
    code: [
      "import java.util.function.Function;",
      "",
      "public class Ref {",
      "    public static void main(String[] args) {",
      "        Function<String, Integer> length = String::length;",
      '        System.out.println(length.apply("abcd"));',
      "    }",
      "}",
    ],
    choices: ["4", "abcd", "0", "コンパイルエラーになる", "実行時に NullPointerException がスローされる"],
    correct: [0],
    expected: { kind: "output", stdout: "4" },
    explanation:
      "String::length は「受け取った String に対して length() を呼ぶ」という意味のメソッド参照で、s -> s.length() と等価です。型名::インスタンスメソッドの形では、第 1 引数がレシーバ（呼び出し対象）になります。ラムダが単に既存のメソッドを呼ぶだけなら、メソッド参照の方が引数名を考えずに済み、意図が名前として現れます。ほかに インスタンス::メソッド、クラス::static メソッド、クラス::new（コンストラクタ参照）の形があり、どれも「呼び出す対象を指し示す」点は共通です。",
  },
  {
    id: 323,
    topic: "lambda",
    variantOf: "lambda-two-abstract-methods",
    question: "次のコードをコンパイルした場合の結果はどれか。1つ選びなさい。",
    className: "Invalid",
    code: [
      "interface Multi {",
      "    void first();",
      "",
      "    void second();",
      "}",
      "",
      "public class Invalid {",
      "    public static void main(String[] args) {",
      '        Multi m = () -> System.out.print("x");',
      "        m.first();",
      "    }",
      "}",
    ],
    choices: [
      "抽象メソッドが 2 つあるためラムダ式を代入できずコンパイルエラーになる",
      "コンパイルは成功し、x が出力される",
      "コンパイルは成功し、何も出力されない",
      "実行時に例外がスローされる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    explanation:
      "ラムダ式を代入できるのは抽象メソッドがちょうど 1 つの関数型インタフェースだけです。2 つ以上あると、そのラムダがどちらの実装になるのか決められません。ラムダ式は「実装すべきメソッドが自明であること」を前提に、メソッド名すら書かずに済ませる記法だからです。複数の操作をまとめたい場合は、匿名クラスで両方を実装するか、インタフェースを分割します。@FunctionalInterface を付けておけば、こうした誤りをインタフェースの定義側で早く検出できます。",
  },
  {
    id: 324,
    topic: "lambda",
    variantOf: "lambda-target-type",
    question: "次のコードをコンパイルした場合の結果はどれか。1つ選びなさい。",
    className: "Target",
    code: [
      "public class Target {",
      "    public static void main(String[] args) {",
      '        Object action = () -> System.out.print("x");',
      '        System.out.println("done");',
      "    }",
      "}",
    ],
    choices: [
      "3行目でコンパイルエラーになる",
      "コンパイルは成功し、done が出力される",
      "コンパイルは成功し、xdone が出力される",
      "4行目でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "compile-error", line: 3 },
    explanation:
      "ラムダ式そのものには型がなく、代入先（ターゲット型）が関数型インタフェースであって初めて型が決まります。Object は関数型インタフェースではないため、どのメソッドの実装なのか決定できずコンパイルエラーになります。この「文脈で型が決まる」性質のため、ラムダは var での宣言にも使えません（var x = () -> ...; は不可）。逆に言えば、同じラムダ式でも代入先のインタフェース次第で別の型の値になるということで、引数として渡す場合も受け取り側の型が決め手になります。",
  },

  // ========================================================== モジュール (modules)
  {
    id: 331,
    topic: "modules",
    variantOf: "modules-requires-transitive",
    question:
      "モジュール com.example.core が次の module-info.java を持つ。com.example.core を requires しただけのモジュールについて、正しい説明はどれか。1つ選びなさい。",
    code: [
      "module com.example.core {",
      "    requires transitive java.logging;",
      "    requires java.sql;",
      "    exports com.example.core.api;",
      "}",
    ],
    choices: [
      "java.logging は自動的に使えるが、java.sql は別途 requires が必要になる",
      "java.logging と java.sql の両方が自動的に使える",
      "java.logging も java.sql も別途 requires が必要になる",
      "java.sql は自動的に使えるが、java.logging は別途 requires が必要になる",
    ],
    correct: [0],
    expected: {
      kind: "not-verifiable",
      reason:
        "推移的な依存の有無は、依存する側の別モジュールを用意してコンパイルしないと確認できない。単一ファイルの javac / java では検証できないため、内容は目視レビューで担保する。",
    },
    explanation:
      "requires transitive は「このモジュールを使う側にも、その依存を一緒に見せる」という宣言です。通常の requires は自分が使うためだけの依存なので、利用側には伝わりません。transitive が必要になるのは、公開 API の戻り値や引数に他モジュールの型が現れる場合で、それが無いと利用側は受け取った値の型を解決できずコンパイルできません。逆に内部実装でしか使わない依存は通常の requires に留めることで、利用側に不要な依存を広げずに済みます。",
  },
  {
    id: 332,
    topic: "modules",
    variantOf: "modules-java-base",
    question: "モジュールシステムにおける java.base モジュールの説明として正しいものはどれか。1つ選びなさい。",
    code: [
      "module com.example.app {",
      "    exports com.example.app.api;",
      "}",
    ],
    choices: [
      "java.base はすべてのモジュールが暗黙的に requires するため、記述しなくても String などを使える",
      "java.base を requires していないため、String などの基本的な型を使えない",
      "java.base は exports 宣言を書かなければ利用できない",
      "java.base を使うには requires transitive java.base と書く必要がある",
    ],
    correct: [0],
    expected: {
      kind: "not-verifiable",
      reason:
        "モジュール宣言の解決結果はモジュールパスを構成してコンパイルしないと確認できない。単一ファイルの javac / java では検証できないため、内容は目視レビューで担保する。",
    },
    explanation:
      "java.base には Object や String、コレクションなど言語の土台となる型が含まれており、すべてのモジュールが暗黙的に依存します。明示的に requires java.base と書くこともできますが、書かなくても同じです。あらゆるコードが必ず使う依存を毎回書かせるのは無意味なので、言語仕様として省略できるようになっています。java.lang パッケージが import なしで使えるのと同じ発想で、「例外なく全員が必要とするものは暗黙にする」という一貫した方針です。",
  },
  {
    id: 333,
    topic: "modules",
    variantOf: "modules-encapsulation",
    question:
      "モジュール com.example.lib が次の module-info.java を持つ。com.example.lib.internal パッケージにある public クラスについて、正しい説明はどれか。1つ選びなさい。",
    code: [
      "module com.example.lib {",
      "    exports com.example.lib.api;",
      "}",
    ],
    choices: [
      "public であっても他モジュールからは参照できない",
      "public であれば他モジュールからも参照できる",
      "同じモジュール内からも参照できない",
      "リフレクションを使わない限り、同じパッケージ内からも参照できない",
    ],
    correct: [0],
    expected: {
      kind: "not-verifiable",
      reason:
        "モジュール境界でのアクセス制御は、参照側の別モジュールを用意しないと確認できない。単一ファイルの javac / java では検証できないため、内容は目視レビューで担保する。",
    },
    explanation:
      "モジュールシステムでは、exports で公開したパッケージの public 型だけが他モジュールから見えます。exports されていないパッケージは、public であってもモジュールの外からは参照できません。これは「public はどこからでも使える」という従来の前提を変える大きな変更で、内部実装用のクラスを public にせざるを得なかった問題（パッケージをまたいで使うため）を解決します。アクセス制御の軸に「どのモジュールから見えるか」が加わったことで、ライブラリは公開 API と内部実装を明確に分離できるようになりました。",
  },
  {
    id: 334,
    topic: "modules",
    variantOf: "modules-declaration-rules",
    question: "module-info.java に関する説明として正しいものはどれか。1つ選びなさい。",
    choices: [
      "モジュールのソースディレクトリの直下に置き、ファイル名は module-info.java でなければならない",
      "任意のパッケージ配下に置くことができ、ファイル名も自由に決められる",
      "モジュール名は必ずパッケージ名と完全に一致していなければならない",
      "1 つのモジュールに複数の module-info.java を置くことができる",
    ],
    correct: [0],
    expected: {
      kind: "not-verifiable",
      reason:
        "ファイル配置の規約はディレクトリ構成を伴うコンパイルでしか確認できない。単一ファイルの javac / java では検証できないため、内容は目視レビューで担保する。",
    },
    explanation:
      "module-info.java はモジュールのルート（パッケージ階層の最上位）に 1 つだけ置き、名前も固定です。位置と名前を固定するのは、コンパイラやビルドツールがモジュール宣言を探す場所を一意に決められるようにするためで、パッケージのディレクトリ構成がクラス名から決まるのと同じ発想です。モジュール名はパッケージ名と一致させる必要はありませんが、衝突を避けるため慣習的に逆ドメイン名（公開 API のパッケージ名と同じ）を使います。",
  },
];
