import type { SilverQuestion } from "../quizTypes";

/**
 * Oracle Certified Java Programmer, Silver SE 11（1Z0-815-JPN）の中核問題（id 1-11）。
 * 各分野の代表的な論点をひとつずつ扱う。
 */
export const coreQuestions: SilverQuestion[] = [
  // ============================================================ 基本 (basics)
  {
    id: 1,
    topic: "basics",
    variantOf: "basics-main-signature",
    question: "次のコードを javac でコンパイルし、java Greeter として実行した場合の結果はどれか。1つ選びなさい。",
    className: "Greeter",
    code: [
      "public class Greeter {",
      "    public static void main(String[] args) {",
      '        System.out.println("A");',
      "    }",
      "",
      "    public static void main(String args) {",
      '        System.out.println("B");',
      "    }",
      "}",
    ],
    choices: ["A", "B", "AB", "コンパイルエラーになる", "実行時に例外がスローされる"],
    correct: [0],
    expected: { kind: "output", stdout: "A" },
    explanation:
      "main は引数の型が異なればオーバーロードとして定義でき、コンパイルは成功します。ただし JVM がエントリーポイントとして呼び出すのは public static void main(String[] args) というシグネチャのメソッドだけです。main(String) は通常のメソッドとして扱われ、呼び出されません。したがって A だけが出力されます。",
  },

  // ==================================================== データ型 (datatypes)
  {
    id: 2,
    topic: "datatypes",
    variantOf: "datatypes-compound-assign",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Calculator",
    code: [
      "public class Calculator {",
      "    public static void main(String[] args) {",
      "        short s = 10;",
      "        s += 5;",
      "        s = s + 5;",
      "        System.out.println(s);",
      "    }",
      "}",
    ],
    choices: ["20", "15", "10", "5行目でコンパイルエラーになる", "4行目でコンパイルエラーになる"],
    correct: [3],
    expected: { kind: "compile-error", line: 5 },
    explanation:
      "複合代入演算子（+=）には暗黙の縮小変換が含まれるため、4行目の s += 5 はコンパイルできます。一方 5行目の s = s + 5 では、short と int の算術演算の結果が int に昇格し、それを short に代入しようとするため「possible lossy conversion from int to short」というコンパイルエラーになります。明示的なキャスト s = (short) (s + 5) が必要です。",
  },

  // ====================================================== 演算子 (operators)
  {
    id: 3,
    topic: "operators",
    variantOf: "operators-increment",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Counter",
    code: [
      "public class Counter {",
      "    public static void main(String[] args) {",
      "        int i = 5;",
      "        int j = i++ + ++i;",
      '        System.out.println(i + " " + j);',
      "    }",
      "}",
    ],
    choices: ["7 12", "7 11", "6 12", "7 13", "コンパイルエラーになる"],
    correct: [0],
    expected: { kind: "output", stdout: "7 12" },
    explanation:
      "i++ は評価時点の値 5 を返してから i を 6 にします。続く ++i は i を 7 にしてから 7 を返します。したがって j は 5 + 7 で 12、i は 7 になります。後置は「値を返してから増やす」、前置は「増やしてから値を返す」という違いを押さえてください。",
  },

  // ======================================================== 制御構造 (control)
  {
    id: 4,
    topic: "control",
    variantOf: "control-switch-fallthrough",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Selector",
    code: [
      "public class Selector {",
      "    public static void main(String[] args) {",
      "        int x = 2;",
      "        switch (x) {",
      "            case 1:",
      '                System.out.print("1");',
      "            case 2:",
      '                System.out.print("2");',
      "            case 3:",
      '                System.out.print("3");',
      "                break;",
      "            default:",
      '                System.out.print("D");',
      "        }",
      "    }",
      "}",
    ],
    choices: ["23", "2", "234", "23D", "234D"],
    correct: [0],
    expected: { kind: "output", stdout: "23" },
    explanation:
      "switch 文は一致した case から実行を開始し、break に到達するまで後続の case を続けて実行します（フォールスルー）。x が 2 なので case 2 から始まり、2 を出力したあと case 3 に流れて 3 を出力し、break で switch を抜けます。default は実行されません。",
  },

  // ============================================================ 配列 (arrays)
  {
    id: 5,
    topic: "arrays",
    variantOf: "arrays-jagged-default",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Matrix",
    code: [
      "public class Matrix {",
      "    public static void main(String[] args) {",
      "        int[][] grid = new int[3][];",
      "        grid[0] = new int[] {1, 2};",
      '        System.out.println(grid.length + " " + grid[0][1] + " " + grid[1]);',
      "    }",
      "}",
    ],
    choices: [
      "3 2 null",
      "3 2 0",
      "2 2 null",
      "実行時に NullPointerException がスローされる",
      "コンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "3 2 null" },
    explanation:
      "new int[3][] は要素数 3 の「int 配列を格納する配列」を作りますが、各要素はまだ配列を参照していないため null で初期化されます。grid.length は 3、grid[0] には長さ 2 の配列を代入したので grid[0][1] は 2 です。grid[1] は null のままで、参照をたどっていないので例外にはならず null と出力されます。",
  },

  // ========================================================== メソッド (methods)
  {
    id: 6,
    topic: "methods",
    variantOf: "methods-overload-resolution",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Printer",
    code: [
      "public class Printer {",
      '    static void show(long value) { System.out.print("long"); }',
      "",
      '    static void show(Integer value) { System.out.print("Integer"); }',
      "",
      '    static void show(int... values) { System.out.print("varargs"); }',
      "",
      "    public static void main(String[] args) {",
      "        show(5);",
      "    }",
      "}",
    ],
    choices: ["long", "Integer", "varargs", "コンパイルエラーになる", "実行時に例外がスローされる"],
    correct: [0],
    expected: { kind: "output", stdout: "long" },
    explanation:
      "オーバーロードの解決には優先順位があります。まず「拡大変換（int から long）」が試され、次に「オートボクシング（int から Integer）」、最後に「可変長引数」が検討されます。ここでは拡大変換で呼び出せる show(long) が最優先で選ばれるため long が出力されます。",
  },

  // ==================================================== 継承 (inheritance)
  {
    id: 7,
    topic: "inheritance",
    variantOf: "inheritance-field-hiding",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Shape",
    code: [
      "public class Shape {",
      '    String name = "Shape";',
      "",
      "    String describe() {",
      '        return "Shape";',
      "    }",
      "",
      "    public static void main(String[] args) {",
      "        Shape s = new Circle();",
      '        System.out.println(s.name + " " + s.describe());',
      "    }",
      "}",
      "",
      "class Circle extends Shape {",
      '    String name = "Circle";',
      "",
      "    @Override",
      "    String describe() {",
      '        return "Circle";',
      "    }",
      "}",
    ],
    choices: ["Shape Circle", "Circle Circle", "Shape Shape", "Circle Shape", "コンパイルエラーになる"],
    correct: [0],
    expected: { kind: "output", stdout: "Shape Circle" },
    explanation:
      "フィールドはオーバーライドされず「隠蔽」されるだけで、参照変数の型（ここでは Shape）によって静的に解決されます。そのため s.name は Shape 側の値になります。一方メソッドはオーバーライドされ、実行時のインスタンスの型（Circle）によって動的に解決されるため describe() は Circle を返します。",
  },

  // ============================================================ ラムダ (lambda)
  {
    id: 8,
    topic: "lambda",
    variantOf: "lambda-functional-interface",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Validator",
    code: [
      "interface Rule {",
      "    boolean check(String value);",
      "}",
      "",
      "public class Validator {",
      "    public static void main(String[] args) {",
      "        Rule rule = value -> value.length() > 3;",
      '        System.out.println(rule.check("abc") + " " + rule.check("abcd"));',
      "    }",
      "}",
    ],
    choices: [
      "false true",
      "true false",
      "false false",
      "true true",
      "Rule に @FunctionalInterface が付いていないためコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "false true" },
    explanation:
      '抽象メソッドが 1 つだけのインタフェースは関数型インタフェースとして扱われ、@FunctionalInterface が無くてもラムダ式を代入できます（このアノテーションは誤りを検出するための任意の指定です）。ラムダ式は「長さが 3 より大きいか」を判定するので、"abc"（長さ 3）は false、"abcd"（長さ 4）は true になります。',
  },

  // ================================================================= API (api)
  {
    id: 9,
    topic: "api",
    variantOf: "api-list-remove",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Inventory",
    code: [
      "import java.util.ArrayList;",
      "import java.util.List;",
      "",
      "public class Inventory {",
      "    public static void main(String[] args) {",
      "        List<Integer> items = new ArrayList<>();",
      "        items.add(10);",
      "        items.add(20);",
      "        items.add(30);",
      "        items.remove(1);",
      "        System.out.println(items);",
      "    }",
      "}",
    ],
    choices: [
      "[10, 30]",
      "[10, 20, 30]",
      "[20, 30]",
      "[10, 20]",
      "実行時に IndexOutOfBoundsException がスローされる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "[10, 30]" },
    explanation:
      "List には remove(int index) と remove(Object o) の 2 つのオーバーロードがあります。remove(1) の引数はプリミティブの int なので、オートボクシングを伴わない remove(int index) が選ばれ、インデックス 1 の要素（20）が削除されます。値 1 を持つ要素を削除したい場合は remove(Integer.valueOf(1)) と書く必要があります。",
  },

  // ======================================================= 例外 (exceptions)
  {
    id: 10,
    topic: "exceptions",
    variantOf: "exceptions-finally-return",
    question: "次のコードをコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "Resource",
    code: [
      "public class Resource {",
      "    static int compute() {",
      "        try {",
      "            return 1;",
      "        } finally {",
      '            System.out.print("finally ");',
      "        }",
      "    }",
      "",
      "    public static void main(String[] args) {",
      "        System.out.println(compute());",
      "    }",
      "}",
    ],
    choices: ["finally 1", "1", "1 finally", "finally のあと何も出力されない", "コンパイルエラーになる"],
    correct: [0],
    expected: { kind: "output", stdout: "finally 1" },
    explanation:
      "try ブロック内の return は、戻り値を評価して退避したあと finally ブロックを実行し、そのあとで呼び出し元に戻ります。したがって finally の出力が先に行われ、次に compute() の戻り値 1 が出力されます。finally は return があっても必ず実行される点が要点です。",
  },

  // ========================================================== モジュール (modules)
  {
    id: 11,
    topic: "modules",
    variantOf: "modules-exports",
    question:
      "次の module-info.java を持つモジュール com.example.app がある。このモジュールに関する説明として正しいものはどれか。1つ選びなさい。",
    code: [
      "module com.example.app {",
      "    requires java.sql;",
      "    exports com.example.app.api;",
      "}",
    ],
    choices: [
      "com.example.app.api パッケージの public 型だけが、他のモジュールから参照できる",
      "com.example.app に含まれるすべてのパッケージが、他のモジュールから参照できる",
      "com.example.app を requires するモジュールは、自動的に java.sql も利用できる",
      "java.base を requires していないため、このモジュールはコンパイルできない",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "used" },
    // exports した api パッケージが利用側から使えることを実機で確認する
    moduleSetup: {
      main: "com.example.client/com.example.client.Main",
      sources: [
        { module: "com.example.lib", path: "module-info.java", content: ["module com.example.lib {", "    requires java.sql;", "    exports com.example.lib.api;", "}"] },
        { module: "com.example.lib", path: "com/example/lib/api/Published.java", content: ["package com.example.lib.api;", "", "public class Published {", "}"] },
        { module: "com.example.client", path: "module-info.java", content: ["module com.example.client {", "    requires com.example.lib;", "}"] },
        { module: "com.example.client", path: "com/example/client/Main.java", content: ["package com.example.client;", "", "import com.example.lib.api.Published;", "", "public class Main {", "    public static void main(String[] args) {", "        new Published();", "        System.out.println(\"used\");", "    }", "}"] },
      ],
    },
    explanation:
      "exports は指定したパッケージの public 型だけを他モジュールに公開します。exports されていないパッケージは同じモジュール内からしか参照できません。requires は「このモジュールが他を使う」宣言であり、推移的に公開するには requires transitive が必要です。また java.base はすべてのモジュールが暗黙的に requires するため、明示的な記述は不要です。",
  },
];
