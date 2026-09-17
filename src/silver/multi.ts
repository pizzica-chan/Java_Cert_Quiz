import type { SilverQuestion } from "../quizTypes";

/**
 * 複数選択問題（id 701 以降）。
 *
 * 本試験は「2つ選びなさい」「3つ選びなさい」のような複数選択問題も出題される
 * (単一選択のみではない)。それまでの問題はすべて単一選択だったため、
 * 各分野に1問ずつ、複数の正しい記述を選ばせる形式で補った。
 *
 * 単一選択問題（「実行結果はどれか」）と違い、ここでは「コードについて
 * 正しい記述を複数選ぶ」形式にしている。コード自体の実行結果は expected で
 * 実機検証するが、各選択肢の記述の正誤そのものは検証スクリプトの対象外
 * なので（choice-mismatch は正解が1つの問題にしか適用されない）、通常以上に
 * 目視レビューを徹底すること。
 */
export const multiChoiceQuestions: SilverQuestion[] = [
  // ============================================================ 基本 (basics)
  {
    id: 701,
    topic: "basics",
    variantOf: "basics-multi-main-overload",
    question: "次のコードについて、正しい記述を2つ選びなさい。",
    className: "Entry2",
    code: [
      "public class Entry2 {",
      "    public static void main(String[] args) {",
      '        System.out.println("A");',
      "    }",
      "",
      "    public static void main(String[] args, int extra) {",
      '        System.out.println("B");',
      "    }",
      "}",
    ],
    choices: [
      "コンパイルは成功する",
      "main メソッドは同じクラスに複数定義できる",
      "java Entry2 で実行すると B が出力される",
      "2つの main は同じシグネチャのためコンパイルエラーになる",
      "実行時に NoSuchMethodError がスローされる",
    ],
    correct: [0, 1],
    expected: { kind: "output", stdout: "A" },
    explanation:
      "main(String[] args) と main(String[] args, int extra) は引数の個数が異なるため、通常のオーバーロードとして問題なく共存できます。JVM がエントリーポイントとして探すのは public static void main(String[] args) というシグネチャだけなので、実行すると A だけが出力されます。main は特別な予約語ではなく普通のメソッド名なので、シグネチャが異なれば同じクラスにいくつでも定義できます。",
  },

  // ==================================================== データ型 (datatypes)
  {
    id: 702,
    topic: "datatypes",
    variantOf: "datatypes-multi-widening-chain",
    question: "次のコードについて、正しい記述を3つ選びなさい。",
    className: "Chain2",
    code: [
      "public class Chain2 {",
      "    public static void main(String[] args) {",
      "        byte b = 10;",
      "        short s = b;",
      "        int i = s;",
      "        long l = i;",
      "        System.out.println(l);",
      "    }",
      "}",
    ],
    choices: [
      "コンパイルは成功する",
      "byte から int への直接代入にはキャストが必要である",
      "byte → short → int → long の順に暗黙の拡大変換ができる",
      "実行時に例外がスローされる",
      "l の値は 10 になる",
      "int から long への代入にはキャストが必要である",
    ],
    correct: [0, 2, 4],
    expected: { kind: "output", stdout: "10" },
    explanation:
      "byte → short → int → long は情報が失われない方向（拡大変換）なので、すべてキャストなしで代入できます。値は変わらず 10 のまま伝わるので、コンパイルは成功し、実行結果は 10 です。この並びは表現できる範囲が広がる一方向の変換であり、逆方向（long から int など）だけがキャストを要求されます。",
  },

  // ====================================================== 演算子 (operators)
  {
    id: 703,
    topic: "operators",
    variantOf: "operators-multi-short-circuit",
    question: "次のコードについて、正しい記述を3つ選びなさい。",
    className: "Guard2",
    code: [
      "public class Guard2 {",
      "    static int calls = 0;",
      "",
      "    static boolean check() {",
      "        calls++;",
      "        return false;",
      "    }",
      "",
      "    public static void main(String[] args) {",
      "        boolean r1 = true || check();",
      "        boolean r2 = false && check();",
      "        System.out.println(calls);",
      "    }",
      "}",
    ],
    choices: [
      "calls は 0 のままになる",
      "|| は左辺が true の時点で右辺を評価しない",
      "&& は左辺が false の時点で右辺を評価しない",
      "r1 と r2 はどちらも true になる",
      "コンパイルエラーになる",
      "check() は合計 2 回呼び出される",
    ],
    correct: [0, 1, 2],
    expected: { kind: "output", stdout: "0" },
    explanation:
      "|| は左辺が true なら、&& は左辺が false なら、その時点で結果が確定するため右辺を評価しません（短絡評価）。true || check() も false && check() も check() を呼ばずに結果が決まるため、calls は 0 のままです。r1 は true、r2 は false になりますが、これは出力に含まれていません。短絡評価は null チェックと参照の利用を 1 つの条件式にまとめる際の安全装置として重要です。",
  },

  // ======================================================== 制御構造 (control)
  {
    id: 704,
    topic: "control",
    variantOf: "control-multi-switch-fallthrough",
    question: "次のコードについて、正しい記述を3つ選びなさい。",
    className: "Fall2",
    code: [
      "public class Fall2 {",
      "    public static void main(String[] args) {",
      "        int x = 1;",
      "        switch (x) {",
      "            case 1:",
      "            case 2:",
      '                System.out.print("A");',
      "                break;",
      "            default:",
      '                System.out.print("B");',
      "        }",
      "    }",
      "}",
    ],
    choices: [
      "出力は A になる",
      "case 1 と case 2 は同じ処理を共有している",
      "x が 2 のときも出力は A になる",
      "default は switch の先頭に書かなければならない",
      "switch の対象に long 型をそのまま使える",
      "コンパイルエラーになる",
    ],
    correct: [0, 1, 2],
    expected: { kind: "output", stdout: "A" },
    explanation:
      "case に処理を書かず次の case へ続ける書き方は、複数の値をまとめて同じ処理にする常套手段です。x が 1 でも 2 でも case 2 の処理（A の出力）へたどり着き、break で switch を抜けます。default の位置は自由でどこに書いても構いません。また switch に使えるのは byte・short・char・int とそのラッパー、String、enum で、long は使えません。",
  },

  // ============================================================ 配列 (arrays)
  {
    id: 705,
    topic: "arrays",
    variantOf: "arrays-multi-covariance-defaults",
    question: "次のコードについて、正しい記述を3つ選びなさい。",
    className: "ArrProps",
    code: [
      "public class ArrProps {",
      "    public static void main(String[] args) {",
      "        int[] a = new int[3];",
      "        Object[] o = new String[2];",
      '        System.out.println(a[0] + " " + o.length);',
      "    }",
      "}",
    ],
    choices: [
      "a[0] は既定値の 0 で初期化されている",
      "String[] は Object[] 型の変数に代入できる",
      "o.length は 2 になる",
      "コンパイルエラーになる",
      "実行時に ArrayStoreException がスローされる",
      "a の要素はすべて null で初期化されている",
    ],
    correct: [0, 1, 2],
    expected: { kind: "output", stdout: "0 2" },
    explanation:
      "int 配列の要素は既定値 0 で初期化されます。配列は共変なので String[] を Object[] 型の変数に代入でき、length はコンパイル時に確保した要素数（2）のままです。ArrayStoreException は、Object[] 型の変数を通じて String 以外の要素を実際に代入しようとしたときに初めて起きるもので、このコードでは代入操作をしていないため発生しません。",
  },

  // ========================================================== メソッド (methods)
  {
    id: 706,
    topic: "methods",
    variantOf: "methods-multi-overload-vs-override",
    question: "次のコードについて、正しい記述を3つ選びなさい。",
    className: "Dispatch2",
    code: [
      "class Base5 {",
      '    void show(Object o) { System.out.print("Object"); }',
      "}",
      "",
      "public class Dispatch2 extends Base5 {",
      '    void show(String s) { System.out.print("String"); }',
      "",
      "    public static void main(String[] args) {",
      "        Base5 b = new Dispatch2();",
      '        b.show("x");',
      "    }",
      "}",
    ],
    choices: [
      "出力は Object になる",
      "show(String) は show(Object) をオーバーロードしている",
      "呼び出すメソッドは変数の宣言型（Base5）で決まる",
      "show(String) は show(Object) をオーバーライドしている",
      "実行時に例外がスローされる",
      "出力は String になる",
    ],
    correct: [0, 1, 2],
    expected: { kind: "output", stdout: "Object" },
    explanation:
      "引数の型が違うため show(String) は show(Object) のオーバーライドではなく、まったく別のオーバーロードです。b は Base5 型の変数なので、コンパイラは Base5 が持つ show(Object) だけを候補として静的に解決し、実行しても Object が出力されます。もし変数を Dispatch2 型で宣言していれば show(String) が優先して選ばれ String になります。",
  },

  // ==================================================== 継承 (inheritance)
  {
    id: 707,
    topic: "inheritance",
    variantOf: "inheritance-multi-interface-super",
    question: "次のコードについて、正しい記述を2つ選びなさい。",
    className: "Combined2",
    code: [
      "interface Alpha2 {",
      "    default String name() {",
      '        return "A";',
      "    }",
      "}",
      "",
      "interface Beta2 {",
      "    default String name() {",
      '        return "B";',
      "    }",
      "}",
      "",
      "public class Combined2 implements Alpha2, Beta2 {",
      "    @Override",
      "    public String name() {",
      "        return Alpha2.super.name() + Beta2.super.name();",
      "    }",
      "",
      "    public static void main(String[] args) {",
      "        System.out.println(new Combined2().name());",
      "    }",
      "}",
    ],
    choices: [
      "出力は AB になる",
      "インタフェース名.super.メソッド名() の形で、特定のインタフェースの実装を明示的に呼べる",
      "Combined2 は name() をオーバーライドしなくてもコンパイルできる",
      "Alpha2 と Beta2 のどちらの default メソッドが優先されるかは自動で決まる",
      "コンパイルエラーになる",
    ],
    correct: [0, 1],
    expected: { kind: "output", stdout: "AB" },
    explanation:
      "複数のインタフェースから同じシグネチャの default メソッドを継承すると、どちらを使うか自動では決まらずコンパイルエラーになります。解決するには実装クラス側でオーバーライドし、必要なら インタフェース名.super.メソッド名() で特定の実装を呼び分けます。ここでは両方を呼んで連結しているため AB が出力されます。",
  },

  // ============================================================ ラムダ (lambda)
  {
    id: 708,
    topic: "lambda",
    variantOf: "lambda-multi-andthen",
    question: "次のコードについて、正しい記述を3つ選びなさい。",
    className: "Lam2",
    code: [
      "import java.util.function.Function;",
      "",
      "public class Lam2 {",
      "    public static void main(String[] args) {",
      "        Function<Integer, Integer> f = x -> x * 2;",
      "        Function<Integer, Integer> g = f.andThen(x -> x + 1);",
      "        System.out.println(g.apply(3));",
      "    }",
      "}",
    ],
    choices: [
      "出力は 7 になる",
      "andThen は先に f を適用し、その結果に続く関数を適用する",
      "Function は抽象メソッドを1つだけ持つ関数型インタフェースである",
      "compose は andThen とまったく同じ順序で処理される",
      "コンパイルエラーになる",
    ],
    correct: [0, 1, 2],
    expected: { kind: "output", stdout: "7" },
    explanation:
      "andThen は「自分（f）を先に適用し、その結果を引数として渡す関数を後から適用する」という合成です。3 に f（2倍）を適用して 6、続けて +1 して 7 になります。Function は apply という抽象メソッドを 1 つだけ持つため関数型インタフェースとしてラムダを代入できます。似た compose は順序が逆（渡した関数を先に適用してから自分を適用する）なので、andThen とは結果が変わります。",
  },

  // ================================================================= API (api)
  {
    id: 709,
    topic: "api",
    variantOf: "api-multi-immutable-copy",
    question: "次のコードについて、正しい記述を3つ選びなさい。",
    className: "ApiQ",
    code: [
      "import java.util.ArrayList;",
      "import java.util.List;",
      "",
      "public class ApiQ {",
      "    public static void main(String[] args) {",
      '        List<String> fixed = List.of("a", "b");',
      "        List<String> mutable = new ArrayList<>(fixed);",
      '        mutable.add("c");',
      '        System.out.println(fixed.size() + " " + mutable.size());',
      "    }",
      "}",
    ],
    choices: [
      "出力は 2 3 になる",
      "List.of で作ったリストは変更できない",
      "new ArrayList<>(fixed) は要素をコピーした可変リストを作る",
      "mutable.add(\"c\") は fixed にも影響する",
      "実行時に UnsupportedOperationException がスローされる",
    ],
    correct: [0, 1, 2],
    expected: { kind: "output", stdout: "2 3" },
    explanation:
      "List.of が返すリストは変更不可能で、add や remove を呼ぶと UnsupportedOperationException になります。new ArrayList<>(fixed) は fixed の要素をコピーした新しい可変リストを作るため、mutable への追加は fixed に影響しません。結果として fixed は 2 のまま、mutable は 3 になります。ここでは変更操作を行っているのは fixed ではなく mutable なので、例外は発生しません。",
  },

  // ======================================================= 例外 (exceptions)
  {
    id: 710,
    topic: "exceptions",
    variantOf: "exceptions-multi-checked-vs-unchecked",
    question: "次のコードについて、正しい記述を3つ選びなさい。",
    className: "ExcQ",
    code: [
      "import java.io.IOException;",
      "",
      "public class ExcQ {",
      "    static void risky() throws IOException {",
      "        if (Math.random() < 0) {",
      '            throw new IOException("x");',
      "        }",
      '        throw new RuntimeException("y");',
      "    }",
      "",
      "    public static void main(String[] args) {",
      "        try {",
      "            risky();",
      "        } catch (RuntimeException e) {",
      '            System.out.print("caught");',
      "        } catch (IOException e) {",
      '            System.out.print("io");',
      "        }",
      "    }",
      "}",
    ],
    choices: [
      "IOException は検査例外である",
      "RuntimeException は非検査例外である",
      "出力は caught になる",
      "catch (IOException e) を先に書くとコンパイルエラーになる",
      "risky() は throws 宣言が無くてもコンパイルできる",
    ],
    correct: [0, 1, 2],
    expected: { kind: "output", stdout: "caught" },
    explanation:
      "IOException は検査例外、RuntimeException は非検査例外です。Math.random() は 0 以上を返すため if の条件は常に偽で、実際には RuntimeException が投げられて最初の catch に捕まり caught が出力されます。IOException と RuntimeException は互いに継承関係を持たない独立した型なので、catch の順序を入れ替えても両方に到達可能でありコンパイルエラーにはなりません。一方 IOException は検査例外なので、risky() には throws 宣言が必須です。",
  },

  // ========================================================== モジュール (modules)
  {
    id: 711,
    topic: "modules",
    variantOf: "modules-multi-exports-requires",
    question:
      "次の module-info.java を持つモジュール com.example.app がある。正しい記述を3つ選びなさい。",
    code: [
      "module com.example.app {",
      "    requires java.sql;",
      "    exports com.example.app.api;",
      "}",
    ],
    choices: [
      "このモジュール自身は java.sql のパッケージを使える",
      "com.example.app.api パッケージの public 型は他モジュールから参照できる",
      "requires は「このモジュールが依存先を使う」ことを宣言するものである",
      "exports していないパッケージも他モジュールから参照できる",
      "このモジュールを requires した側は、自動的に java.sql も使えるようになる",
    ],
    correct: [0, 1, 2],
    expected: {
      kind: "not-verifiable",
      reason:
        "requires/exports の実際の可視性は参照側の別モジュールを用意してコンパイルしないと確認できない。単一ファイルの javac / java では検証できないため、内容は目視レビューで担保する。",
    },
    explanation:
      "requires は「自分がその依存を使うための宣言」で、exports は「指定したパッケージの public 型を他モジュールへ公開する宣言」です。exports されていないパッケージは、public 型であっても他モジュールからは見えません。また requires（transitive を付けない通常の requires）は自分のためだけの依存であり、このモジュールを requires した側に java.sql が自動的に引き継がれることはありません。引き継ぎたい場合は requires transitive java.sql と書く必要があります。",
  },
];
