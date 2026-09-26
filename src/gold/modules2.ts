import type { GoldQuestion } from "../quizTypes";

/**
 * Gold SE 17（1Z0-826-JPN）: Java モジュール・システムの追加問題（id 10418-10499）。
 * requires static、暗黙に読み込まれる java.base、Module API、ServiceLoader の詳細、open module、jdeps など。
 *
 * modules.ts と同じく、ここの問題の多くは code を持たず、moduleSetup のソース一式をそのまま画面に表示する。
 * moduleSetup の問題は「解説で主張している挙動が処理系と一致するか」の裏取りで、選択肢との対応は目視で確認する。
 */
export const goldModulesQuestions2: GoldQuestion[] = [
  // ------------------------------------------------------------ requires static
  {
    id: 10418,
    topic: "modules",
    variantOf: "gold-modules-requires-static",
    question:
      "次のモジュール構成をまとめてコンパイルし、java --module-path out -m com.example.app/com.example.app.Main で実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "false と出力される",
      "true と出力される",
      "com.example.app の module-info.java でコンパイルエラーになる",
      "起動時に com.example.debug モジュールの解決に失敗し、例外がスローされる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "false" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.debug", path: "module-info.java", content: ["module com.example.debug {", "    exports com.example.debug;", "}"] },
        {
          module: "com.example.debug",
          path: "com/example/debug/Tracer.java",
          content: ["package com.example.debug;", "", "public class Tracer {", "    public static void trace(String s) {", "        System.out.println(\"trace: \" + s);", "    }", "}"],
        },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires static com.example.debug;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        boolean found = ModuleLayer.boot().findModule(\"com.example.debug\").isPresent();",
            "        System.out.println(found);",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "requires static は「コンパイル時には必須だが、実行時には任意」という依存を表します。コンパイル時は通常の requires と同じく com.example.debug を読み込みますが、実行時のモジュール解決では、ほかに requires しているモジュールが無く --add-modules でも指定されていなければ、モジュール・パス上にあっても解決されません。そのため起動時のモジュール・グラフに含まれず false が出力されます（見つからなくてもエラーにはなりません）。アノテーションだけを使うライブラリや、存在すれば使うという任意の機能に向いた指定で、実行時に使う前には存在を確認する必要があります。",
  },

  // ------------------------------------------------------------ 公開していないパッケージ
  {
    id: 10419,
    topic: "modules",
    variantOf: "gold-modules-exports-basic",
    question: "次の 2 つのモジュールをまとめてコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "com.example.app の Main.java でコンパイルエラーになる",
      "Helper は public クラスなので、コンパイルに成功する",
      "com.example.lib の module-info.java でコンパイルエラーになる",
      "コンパイルには成功するが、実行時に IllegalAccessError がスローされる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.lib", path: "module-info.java", content: ["module com.example.lib {", "    exports com.example.lib.api;", "}"] },
        {
          module: "com.example.lib",
          path: "com/example/lib/api/Calc.java",
          content: ["package com.example.lib.api;", "", "import com.example.lib.internal.Helper;", "", "public class Calc {", "    public static int twice(int n) {", "        return Helper.add(n, n);", "    }", "}"],
        },
        {
          module: "com.example.lib",
          path: "com/example/lib/internal/Helper.java",
          content: ["package com.example.lib.internal;", "", "public class Helper {", "    public static int add(int a, int b) {", "        return a + b;", "    }", "}"],
        },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.lib;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import com.example.lib.api.Calc;",
            "import com.example.lib.internal.Helper;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        System.out.println(Calc.twice(2) + Helper.add(1, 2));",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "モジュール・システムでは、public なクラスであっても、そのパッケージがモジュールから exports されていなければ他のモジュールからはアクセスできません。com.example.lib は api パッケージだけを公開しているので、app から internal パッケージの Helper を import した Main.java がコンパイルエラーになります。同じモジュールの中にある Calc から Helper を使うのは問題ありません。これまで public は「どこからでも使える」意味でしたが、モジュールによって「モジュールの内部でだけ public」という範囲を作れるようになり、ライブラリの内部実装を利用者から確実に隠せるようになりました。",
  },

  // ------------------------------------------------------------ 推移的な依存
  {
    id: 10420,
    topic: "modules",
    variantOf: "gold-modules-implied-readability",
    question: "次の 3 つのモジュールをまとめてコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "com.example.app の Main.java でコンパイルエラーになる",
      "コンパイルに成功する",
      "com.example.bank の module-info.java でコンパイルエラーになる",
      "com.example.bank の Account.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.money", path: "module-info.java", content: ["module com.example.money {", "    exports com.example.money;", "}"] },
        { module: "com.example.money", path: "com/example/money/Yen.java", content: ["package com.example.money;", "", "public record Yen(long amount) {", "}"] },
        { module: "com.example.bank", path: "module-info.java", content: ["module com.example.bank {", "    requires com.example.money;", "    exports com.example.bank;", "}"] },
        {
          module: "com.example.bank",
          path: "com/example/bank/Account.java",
          content: ["package com.example.bank;", "", "import com.example.money.Yen;", "", "public class Account {", "    public Yen balance() {", "        return new Yen(1000);", "    }", "}"],
        },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.bank;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import com.example.bank.Account;",
            "import com.example.money.Yen;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        Yen yen = new Account().balance();",
            "        System.out.println(yen.amount());",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "requires による読み込み（readability）は推移しません。app は bank を読み込みますが、bank が読み込んでいる money までは読み込まないので、Main.java で Yen を import するとコンパイルエラーになります。bank の公開 API（balance の戻り値）が Yen を使っているのに、利用者が money を別途 requires しなければならないのは不便です。bank 側で requires transitive com.example.money と書けば、bank を読み込むモジュールは自動的に money も読み込むようになります。公開 API の型に他のモジュールの型が現れる場合は transitive を付けるのが原則です。",
  },

  // ------------------------------------------------------------ java.base と他の JDK モジュール
  {
    id: 10421,
    topic: "modules",
    variantOf: "gold-modules-jdk-requires",
    question: "次のモジュールをコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "java.sql を requires していないため、Main.java でコンパイルエラーになる",
      "java.base も java.sql も requires していないため、java.util と java.sql の両方の使用箇所でコンパイルエラーになる",
      "JDK のモジュールは requires しなくても使えるため、コンパイルに成功する",
      "module-info.java に何も書かれていないため、module-info.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import java.util.List;",
            "import java.sql.Connection;",
            "",
            "public class Main {",
            "    static Connection con;",
            "",
            "    public static void main(String[] args) {",
            "        System.out.println(List.of(1, 2) + \" \" + con);",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "すべてのモジュールは java.base を暗黙に読み込むので、java.lang や java.util など java.base のパッケージは requires を書かずに使えます（requires java.base と書いても構いません）。しかし java.sql（JDBC）や java.logging など java.base 以外の JDK のモジュールは、自作のモジュールと同じく requires が必要です。そのため java.sql.Connection を import した箇所がコンパイルエラーになります。空の module-info.java 自体は正しい宣言です。クラスパスで動かしていたアプリをモジュール化すると、この requires の書き漏れが最初につまずく点になるので、jdeps で必要なモジュールを洗い出すのが定石です。",
  },

  // ------------------------------------------------------------ Module API
  {
    id: 10422,
    topic: "modules",
    variantOf: "gold-modules-module-api",
    question:
      "次のモジュールをコンパイルし、java --module-path out -m com.example.app/com.example.app.Main で実行した場合の結果はどれか。1つ選びなさい。",
    choices: [
      "com.example.app java.base java.sql true",
      "com.example.app java.base java.base true",
      "null java.base java.sql false",
      "com.example.app null null true",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "com.example.app java.base java.sql true" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires java.sql;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import java.sql.Connection;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        Module self = Main.class.getModule();",
            "        System.out.println(self.getName() + \" \"",
            "                + String.class.getModule().getName() + \" \"",
            "                + Connection.class.getModule().getName() + \" \"",
            "                + self.canRead(Connection.class.getModule()));",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "Class.getModule() はそのクラスが属するモジュールを表す java.lang.Module を返します。モジュール・パスから起動した Main は com.example.app に、String は java.base に、Connection は java.sql に属します。canRead は、あるモジュールが別のモジュールを読み込んでいるか（requires の関係にあるか）を調べるメソッドで、app は java.sql を requires しているので true です。Module API を使うと、プログラムの中から自分の属するモジュールや依存関係を調べられるので、プラグインの仕組みなど実行時にモジュール構成を判断する処理に使われます。",
  },
  {
    id: 10423,
    topic: "modules",
    variantOf: "gold-modules-module-api",
    question: "次のコードをモジュールを使わずにクラスパス上でコンパイルおよび実行した場合の結果はどれか。1つ選びなさい。",
    className: "UnnamedTest",
    code: [
      "public class UnnamedTest {",
      "    public static void main(String[] args) {",
      "        Module m = UnnamedTest.class.getModule();",
      "        System.out.println(m.isNamed() + \" \" + m.getName() + \" \"",
      "                + (m.getDescriptor() == null) + \" \" + Object.class.getModule().isNamed());",
      "    }",
      "}",
    ],
    choices: ["false null true true", "true UnnamedTest false true", "false  true true", "false null true false", "3行目でコンパイルエラーになる"],
    correct: [0],
    expected: { kind: "output", stdout: "false null true true" },
    explanation:
      "クラスパスから読み込まれたクラスは、すべて「無名モジュール」に属します。無名モジュールは名前を持たないので isNamed() は false、getName() は null、モジュール記述子（module-info の情報）も無いので getDescriptor() は null です。一方、JDK のクラスはクラスパスで動かしていても名前付きモジュール（Object なら java.base）に属します。無名モジュールはほかのすべてのモジュールを読み込み、自分のすべてのパッケージを公開する扱いなので、モジュールを意識せずに書かれた従来のアプリケーションもそのまま動作できるのです。",
  },

  // ------------------------------------------------------------ ServiceLoader の詳細
  {
    id: 10424,
    topic: "modules",
    variantOf: "gold-modules-serviceloader",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "2 Hello,Hi と出力される",
      "1 Hello と出力される",
      "同じサービスに 2 つの実装が登録されているため、実行時に ServiceConfigurationError がスローされる",
      "com.example.app が実装モジュールを requires していないため、0  と出力される",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "2 Hello,Hi" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.api", path: "module-info.java", content: ["module com.example.api {", "    exports com.example.api;", "}"] },
        { module: "com.example.api", path: "com/example/api/Greeter.java", content: ["package com.example.api;", "", "public interface Greeter {", "    String greet();", "}"] },
        { module: "com.example.en", path: "module-info.java", content: ["module com.example.en {", "    requires com.example.api;", "    provides com.example.api.Greeter with com.example.en.EnGreeter;", "}"] },
        { module: "com.example.en", path: "com/example/en/EnGreeter.java", content: ["package com.example.en;", "", "public class EnGreeter implements com.example.api.Greeter {", "    public String greet() {", "        return \"Hello\";", "    }", "}"] },
        { module: "com.example.casual", path: "module-info.java", content: ["module com.example.casual {", "    requires com.example.api;", "    provides com.example.api.Greeter with com.example.casual.HiGreeter;", "}"] },
        { module: "com.example.casual", path: "com/example/casual/HiGreeter.java", content: ["package com.example.casual;", "", "public class HiGreeter implements com.example.api.Greeter {", "    public String greet() {", "        return \"Hi\";", "    }", "}"] },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.api;", "    uses com.example.api.Greeter;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import java.util.ServiceLoader;",
            "import java.util.stream.Collectors;",
            "import com.example.api.Greeter;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        ServiceLoader<Greeter> loader = ServiceLoader.load(Greeter.class);",
            "        long count = loader.stream().count();",
            "        String names = loader.stream()",
            "                .map(p -> p.get().greet())",
            "                .sorted()",
            "                .collect(Collectors.joining(\",\"));",
            "        System.out.println(count + \" \" + names);",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "1 つのサービス・インタフェースに対して、複数のモジュールがそれぞれ provides で実装を登録できます。ServiceLoader はモジュール・パス上のすべての実装を見つけるので、件数は 2 です。stream() は ServiceLoader.Provider のストリームを返し、get() を呼んだ時点で初めて実装クラスがインスタンス化されます（type() で実装クラスを調べてから、必要なものだけインスタンス化することもできます）。複数のモジュールにまたがる実装の見つかる順序は保証されないので、ここでは sorted() で並べてから連結しています。",
  },
  {
    id: 10425,
    topic: "modules",
    variantOf: "gold-modules-service-provider-method",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "from factory と出力される",
      "GreeterFactory が Greeter を実装していないため、com.example.impl の module-info.java でコンパイルエラーになる",
      "GreeterFactory に public な引数なしのコンストラクタが無いため、実行時に ServiceConfigurationError がスローされる",
      "none と出力される",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "from factory" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.api", path: "module-info.java", content: ["module com.example.api {", "    exports com.example.api;", "}"] },
        { module: "com.example.api", path: "com/example/api/Greeter.java", content: ["package com.example.api;", "", "public interface Greeter {", "    String greet();", "}"] },
        { module: "com.example.impl", path: "module-info.java", content: ["module com.example.impl {", "    requires com.example.api;", "    provides com.example.api.Greeter with com.example.impl.GreeterFactory;", "}"] },
        {
          module: "com.example.impl",
          path: "com/example/impl/GreeterFactory.java",
          content: [
            "package com.example.impl;",
            "",
            "import com.example.api.Greeter;",
            "",
            "public class GreeterFactory {",
            "    private GreeterFactory() {",
            "    }",
            "",
            "    public static Greeter provider() {",
            "        return () -> \"from factory\";",
            "    }",
            "}",
          ],
        },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.api;", "    uses com.example.api.Greeter;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import java.util.ServiceLoader;",
            "import com.example.api.Greeter;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        String s = ServiceLoader.load(Greeter.class)",
            "                .findFirst()",
            "                .map(Greeter::greet)",
            "                .orElse(\"none\");",
            "        System.out.println(s);",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "provides ... with に指定したクラスが public static で引数なしの provider() メソッドを持っている場合、ServiceLoader はコンストラクタではなくそのメソッドを呼んでサービスの実装を得ます。このときクラス自体はサービスのインタフェースを実装していなくてよく、provider() の戻り値の型がサービスのインタフェース（またはそのサブタイプ）であれば十分です。コンストラクタが private でも問題ありません。シングルトンを返したい、設定に応じて実装を切り替えたいなど、実装の生成方法を提供側で制御したい場合に使える仕組みです。",
  },
  {
    id: 10426,
    topic: "modules",
    variantOf: "gold-modules-service-provider-method",
    question: "次のモジュール構成をまとめてコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "com.example.impl の module-info.java でコンパイルエラーになる",
      "コンパイルに成功するが、実行時に ServiceLoader が実装を見つけられず空の結果になる",
      "コンパイルに成功するが、実行時に ServiceConfigurationError がスローされる",
      "com.example.impl の ImplGreeter.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.api", path: "module-info.java", content: ["module com.example.api {", "    exports com.example.api;", "}"] },
        { module: "com.example.api", path: "com/example/api/Greeter.java", content: ["package com.example.api;", "", "public interface Greeter {", "    String greet();", "}"] },
        { module: "com.example.impl", path: "module-info.java", content: ["module com.example.impl {", "    requires com.example.api;", "    provides com.example.api.Greeter with com.example.impl.ImplGreeter;", "}"] },
        {
          module: "com.example.impl",
          path: "com/example/impl/ImplGreeter.java",
          content: [
            "package com.example.impl;",
            "",
            "import com.example.api.Greeter;",
            "",
            "public class ImplGreeter implements Greeter {",
            "    private final String message;",
            "",
            "    public ImplGreeter(String message) {",
            "        this.message = message;",
            "    }",
            "",
            "    public String greet() {",
            "        return message;",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "ServiceLoader は実装クラスを、public static な provider() メソッドか、public で引数なしのコンストラクタのどちらかで生成します。ImplGreeter はどちらも持たない（引数ありのコンストラクタだけ）ので、生成する手段がありません。モジュールの provides 宣言ではこれがコンパイル時に検査され、module-info.java でコンパイルエラーになります。従来の META-INF/services による登録ではこの誤りが実行時まで見つからなかったので、モジュールの宣言として書くことで早い段階で検出できるようになったのです。",
  },
  {
    id: 10427,
    topic: "modules",
    variantOf: "gold-modules-serviceloader-uses",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "実行時に ServiceConfigurationError がスローされる",
      "Hello from impl と出力される",
      "none と出力される",
      "com.example.app の module-info.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "exception", type: "java.util.ServiceConfigurationError" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.api", path: "module-info.java", content: ["module com.example.api {", "    exports com.example.api;", "}"] },
        { module: "com.example.api", path: "com/example/api/Greeter.java", content: ["package com.example.api;", "", "public interface Greeter {", "    String greet();", "}"] },
        { module: "com.example.impl", path: "module-info.java", content: ["module com.example.impl {", "    requires com.example.api;", "    provides com.example.api.Greeter with com.example.impl.ImplGreeter;", "}"] },
        { module: "com.example.impl", path: "com/example/impl/ImplGreeter.java", content: ["package com.example.impl;", "", "public class ImplGreeter implements com.example.api.Greeter {", "    public String greet() {", "        return \"Hello from impl\";", "    }", "}"] },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.api;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import java.util.ServiceLoader;",
            "import com.example.api.Greeter;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        String s = ServiceLoader.load(Greeter.class)",
            "                .findFirst()",
            "                .map(Greeter::greet)",
            "                .orElse(\"none\");",
            "        System.out.println(s);",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "名前付きモジュールの中から ServiceLoader.load を呼ぶには、そのモジュールの module-info.java で uses サービスのインタフェース; と宣言しておく必要があります。宣言が無いと、ServiceLoader.load の呼び出し時に ServiceConfigurationError（Error のサブクラス）がスローされます。空の結果（none）になるのではない点に注意します。uses はコンパイル時には検査されないのでコンパイルは成功します。どのモジュールがどのサービスを利用するかを module-info.java に明示させることで、モジュールの依存関係が宣言から読み取れるようになり、jlink などのツールも必要な実装モジュールを判断できます。",
  },

  // ------------------------------------------------------------ open module
  {
    id: 10428,
    topic: "modules",
    variantOf: "gold-modules-opens",
    question: "次の 2 つのモジュールをまとめてコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "com.example.app の Main.java でコンパイルエラーになる",
      "open module はすべてのパッケージを公開するため、コンパイルに成功する",
      "com.example.model の module-info.java でコンパイルエラーになる",
      "コンパイルには成功するが、実行時に InaccessibleObjectException がスローされる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.model", path: "module-info.java", content: ["open module com.example.model {", "}"] },
        { module: "com.example.model", path: "com/example/model/User.java", content: ["package com.example.model;", "", "public class User {", "    public String name() {", "        return \"ann\";", "    }", "}"] },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.model;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import com.example.model.User;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        System.out.println(new User().name());",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "open module は、モジュール内のすべてのパッケージを実行時のリフレクションに対して開く（すべてのパッケージを opens する）宣言です。しかし opens が許すのはリフレクションによるアクセス（private メンバーを含む）だけで、コンパイル時に型を参照することは許しません。コンパイル時のアクセスには exports が必要なので、User を import した Main.java はコンパイルエラーになります。exports は「API として公開する」、opens は「フレームワークなどが実行時に中身を覗くのを許す」という別々の目的を持ち、JSON 変換や DI のライブラリ向けに opens だけを付けることもあります。",
  },

  // ------------------------------------------------------------ jdeps
  {
    id: 10429,
    topic: "modules",
    variantOf: "gold-modules-jdeps",
    question:
      "次のモジュール構成を out ディレクトリにコンパイルした後、jdeps --module-path out -s -m com.example.app を実行した。出力として正しいものはどれか。1つ選びなさい。",
    choices: [
      "com.example.app から com.example.lib と java.base への依存だけが表示される",
      "com.example.app から com.example.lib、java.base、java.logging への依存が表示される",
      "com.example.app から com.example.lib と java.logging への依存だけが表示される（java.base は表示されない）",
      "java.logging を requires しているのに使っていないため、jdeps はエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "com.example.app -> com.example.lib\ncom.example.app -> java.base" },
    moduleSetup: {
      sources: [
        { module: "com.example.lib", path: "module-info.java", content: ["module com.example.lib {", "    exports com.example.lib;", "}"] },
        { module: "com.example.lib", path: "com/example/lib/Tax.java", content: ["package com.example.lib;", "", "public class Tax {", "    public static int apply(int price) {", "        return price * 110 / 100;", "    }", "}"] },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.lib;", "    requires java.logging;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import com.example.lib.Tax;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        System.out.println(Tax.apply(100));",
            "    }",
            "}",
          ],
        },
      ],
      tool: { command: "jdeps", args: ["--module-path", "out", "-s", "-m", "com.example.app"] },
    },
    explanation:
      "jdeps はクラスファイルのバイトコードを解析して、実際に参照しているモジュールを調べます。-s（-summary）はモジュール単位の依存の要約を「モジュール -> 依存先」の形で表示します。Main は Tax（com.example.lib）と、String や System などの java.base のクラスしか使っていないので、module-info.java で requires している java.logging は表示されません。宣言と実際の使用の食い違いを見つけるのに役立ち、jdeps --check を使うと、不要な requires を除いた推奨のモジュール宣言も提示されます。",
  },

  // ------------------------------------------------------------ 自動モジュール
  {
    id: 10430,
    topic: "modules",
    variantOf: "gold-modules-automatic-name",
    question:
      "module-info.java を持たない次の data-core-2.jar に対して、jar --describe-module --file data-core-2.jar を実行した。導出される自動モジュールの名前として正しいものはどれか。1つ選びなさい。",
    choices: ["data.core", "data-core", "data.core.2", "datacore", "com.data.core"],
    correct: [0],
    expected: {
      kind: "output",
      stdout: "No module descriptor found. Derived automatic module.\n\ndata.core@2 automatic\nrequires java.base mandated\ncontains com.data.core",
    },
    moduleSetup: {
      jars: [
        {
          fileName: "data-core-2.jar",
          placement: "module-path",
          sources: [
            {
              path: "com/data/core/Store.java",
              content: ["package com.data.core;", "", "public class Store {", "    public static String load() {", "        return \"data\";", "    }", "}"],
            },
          ],
        },
      ],
      sources: [],
      tool: { command: "jar", args: ["--describe-module", "--file", "jars/module-path/data-core-2.jar"] },
    },
    explanation:
      "module-info.java を持たない JAR をモジュール・パスに置くと自動モジュールになり、名前は（マニフェストに Automatic-Module-Name が無ければ）JAR ファイル名から導出されます。拡張子 .jar を除き、末尾の -2 のような「ハイフンに続く数字で始まる部分」をバージョンとして取り除き（ここではバージョン 2 として扱われます）、英数字以外の文字をピリオドに置き換えるので data.core になります。パッケージ名の com.data.core ではない点に注意します。ファイル名に依存する名前は不安定なので、ライブラリの作者はマニフェストで Automatic-Module-Name を指定しておくのが推奨されています。",
  },
  {
    id: 10431,
    topic: "modules",
    variantOf: "gold-modules-automatic",
    question:
      "module-info.java を持たない legacy-util-1.0.jar（次の 2 つのクラスを含む）をモジュール・パスに置き、次のモジュール com.example.app を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "HELLO:5 と出力される",
      "自動モジュールは exports を宣言していないため、Main.java でコンパイルエラーになる",
      "com.legacy.util.internal パッケージは公開されないため、Main.java でコンパイルエラーになる",
      "自動モジュールは requires で指定できないため、module-info.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "HELLO:5" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      jars: [
        {
          fileName: "legacy-util-1.0.jar",
          placement: "module-path",
          sources: [
            {
              path: "com/legacy/util/Strings.java",
              content: ["package com.legacy.util;", "", "public class Strings {", "    public static String shout(String s) {", "        return s.toUpperCase();", "    }", "}"],
            },
            {
              path: "com/legacy/util/internal/Counter.java",
              content: ["package com.legacy.util.internal;", "", "public class Counter {", "    public static int length(String s) {", "        return s.length();", "    }", "}"],
            },
          ],
        },
      ],
      sources: [
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires legacy.util;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import com.legacy.util.Strings;",
            "import com.legacy.util.internal.Counter;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        System.out.println(Strings.shout(\"hello\") + \":\" + Counter.length(\"hello\"));",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "自動モジュールは module-info.java を持たないので、公開範囲をモジュール・システムに伝える手段がありません。そのため、含まれるすべてのパッケージを exports（かつ opens）し、ほかのすべてのモジュールを読み込むモジュールとして扱われます。internal という名前のパッケージであっても公開されるので、Counter も利用できます。自動モジュールは、まだモジュール化されていないライブラリを名前付きモジュールから requires で使うための「橋渡し」で、カプセル化の恩恵は得られない点を理解しておきます。",
  },

  // ------------------------------------------------------------ module-info.java の宣言
  {
    id: 10432,
    topic: "modules",
    variantOf: "gold-modules-declaration-errors",
    question: "次のモジュールをコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "com.example.future が存在しなくても、コンパイルに成功する",
      "exports ... to に指定したモジュール com.example.future が存在しないため、コンパイルエラーになる",
      "同じパッケージを exports と opens の両方に指定しているため、コンパイルエラーになる",
      "exports ... to は requires しているモジュールにしか指定できないため、コンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "" },
    moduleSetup: {
      sources: [
        {
          module: "com.example.lib",
          path: "module-info.java",
          content: ["module com.example.lib {", "    exports com.example.lib to com.example.future;", "    opens com.example.lib;", "}"],
        },
        { module: "com.example.lib", path: "com/example/lib/Api.java", content: ["package com.example.lib;", "", "public class Api {", "}"] },
      ],
    },
    explanation:
      "限定公開（exports ... to / opens ... to）の宛先に、存在しない（コンパイル時に見つからない）モジュールを書いても、javac は警告を出すだけでエラーにはしません。限定公開の宛先は、将来作られるモジュールや別々にビルドされるモジュールを指すことがあるためです。また、同じパッケージを exports しつつ opens することも可能で、コンパイル時の公開とリフレクションの許可を別々に指定できます。一方、exports で指定したパッケージ自体が存在しない場合や、同じモジュールを 2 回 requires した場合などは、宣言の誤りとしてコンパイルエラーになります。",
  },
  {
    id: 10433,
    topic: "modules",
    variantOf: "gold-modules-declaration-errors",
    question: "次のモジュールをコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "Main.java でコンパイルエラーになる",
      "コンパイルに成功し、Main は無名パッケージに属する",
      "module-info.java でコンパイルエラーになる",
      "コンパイルに成功するが、Main はモジュール外のクラスとして扱われる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "}"] },
        {
          module: "com.example.app",
          path: "Main.java",
          content: ["public class Main {", "    public static void main(String[] args) {", "        System.out.println(\"hello\");", "    }", "}"],
        },
      ],
    },
    explanation:
      "名前付きモジュールに含まれるクラスは、必ず名前のあるパッケージに属していなければなりません。package 宣言の無い Main は無名パッケージに属することになり、「名前付きモジュールでは無名パッケージは許可されない」というコンパイルエラーになります。モジュールはパッケージの単位で公開範囲（exports / opens）を管理するので、名前で指定できない無名パッケージを扱えないのです。クラスパスで動かす小さなプログラムでは package 宣言を省略できますが、モジュール化する際には必ずパッケージを付けます。",
  },

  // ------------------------------------------------------------ リフレクションと exports
  {
    id: 10434,
    topic: "modules",
    variantOf: "gold-modules-reflection-access",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "pen denied と出力される",
      "pen secret と出力される",
      "Class.forName で com.example.model.internal.Secret を読み込めないため、pen notfound と出力される",
      "com.example.app の Main.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "pen denied" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.model", path: "module-info.java", content: ["module com.example.model {", "    exports com.example.model;", "}"] },
        { module: "com.example.model", path: "com/example/model/Item.java", content: ["package com.example.model;", "", "public class Item {", "    public String name() {", "        return \"pen\";", "    }", "}"] },
        {
          module: "com.example.model",
          path: "com/example/model/internal/Secret.java",
          content: ["package com.example.model.internal;", "", "public class Secret {", "    public String value() {", "        return \"secret\";", "    }", "}"],
        },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.model;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "public class Main {",
            "    public static void main(String[] args) throws Exception {",
            "        Class<?> item = Class.forName(\"com.example.model.Item\");",
            "        Object name = item.getMethod(\"name\").invoke(item.getConstructor().newInstance());",
            "        String result;",
            "        try {",
            "            Class<?> secret = Class.forName(\"com.example.model.internal.Secret\");",
            "            result = (String) secret.getMethod(\"value\").invoke(secret.getConstructor().newInstance());",
            "        } catch (ClassNotFoundException e) {",
            "            result = \"notfound\";",
            "        } catch (IllegalAccessException e) {",
            "            result = \"denied\";",
            "        }",
            "        System.out.println(name + \" \" + result);",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "リフレクションでも、モジュールの公開範囲の規則は守られます。exports されている com.example.model の Item は、public なコンストラクタやメソッドをリフレクションで呼び出せます。一方 internal パッケージは exports も opens もされていないので、Class.forName でクラス自体は読み込めても、そのコンストラクタを呼ぶ newInstance で IllegalAccessException がスローされ denied が出力されます。コンパイル時に import できないパッケージへは、リフレクションでも抜け道にならないように設計されているのです。リフレクションでの利用を許すには opens を宣言します。",
  },

  // ------------------------------------------------------------ requires の宣言
  {
    id: 10435,
    topic: "modules",
    variantOf: "gold-modules-requires-static",
    question: "次の 2 つのモジュールをまとめてコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "com.example.app の module-info.java でコンパイルエラーになる",
      "コンパイルに成功し、com.example.lib は通常の requires として扱われる",
      "コンパイルに成功し、com.example.lib は requires static として扱われる",
      "com.example.app の Main.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.lib", path: "module-info.java", content: ["module com.example.lib {", "    exports com.example.lib;", "}"] },
        { module: "com.example.lib", path: "com/example/lib/Util.java", content: ["package com.example.lib;", "", "public class Util {", "    public static int one() {", "        return 1;", "    }", "}"] },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.lib;", "    requires static com.example.lib;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        System.out.println(com.example.lib.Util.one());",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "1 つのモジュール宣言の中で、同じモジュールを複数回 requires することはできません。修飾子（static や transitive）が異なっていても重複とみなされ、module-info.java でコンパイルエラーになります。コンパイル時と実行時の両方で必要なら requires、コンパイル時だけなら requires static、利用者にも読み込ませたいなら requires transitive と、1 つの依存について 1 行で性質を指定します（static と transitive は同じ行で併用できます）。モジュールの依存関係は重複や矛盾の無い宣言として検査されるので、依存の記述が曖昧になりません。",
  },

  // ------------------------------------------------------------ java コマンドのモジュール関連オプション
  {
    id: 10436,
    topic: "modules",
    variantOf: "gold-modules-command-options",
    question:
      "次のモジュール構成を out ディレクトリにコンパイルした後、java -p out --add-exports com.example.model/com.example.model.internal=com.example.app -m com.example.app/com.example.app.Main を実行した。結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "secret と出力される",
      "denied と出力される",
      "--add-exports は javac 専用のオプションなので、java コマンドの起動に失敗する",
      "com.example.model の module-info.java を書き換えない限り公開範囲は変えられないため、denied と出力される",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "secret" },
    moduleSetup: {
      sources: [
        { module: "com.example.model", path: "module-info.java", content: ["module com.example.model {", "    exports com.example.model;", "}"] },
        { module: "com.example.model", path: "com/example/model/Item.java", content: ["package com.example.model;", "", "public class Item {", "}"] },
        {
          module: "com.example.model",
          path: "com/example/model/internal/Secret.java",
          content: ["package com.example.model.internal;", "", "public class Secret {", "    public String value() {", "        return \"secret\";", "    }", "}"],
        },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.model;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "public class Main {",
            "    public static void main(String[] args) throws Exception {",
            "        Class<?> c = Class.forName(\"com.example.model.internal.Secret\");",
            "        try {",
            "            Object s = c.getConstructor().newInstance();",
            "            System.out.println(c.getMethod(\"value\").invoke(s));",
            "        } catch (IllegalAccessException e) {",
            "            System.out.println(\"denied\");",
            "        }",
            "    }",
            "}",
          ],
        },
      ],
      tool: {
        command: "java",
        args: ["-p", "out", "--add-exports", "com.example.model/com.example.model.internal=com.example.app", "-m", "com.example.app/com.example.app.Main"],
      },
    },
    explanation:
      "--add-exports 元モジュール/パッケージ=先モジュール は、module-info.java を変更せずに、起動時（java）やコンパイル時（javac）に公開範囲を追加するオプションです。com.example.model.internal は exports されていないので、オプションが無ければリフレクションでのインスタンス化は IllegalAccessException になりますが、このオプションで com.example.app に対して公開されたので secret と出力されます。宛先に ALL-UNNAMED を指定するとクラスパス上のコードに公開できます。ソースを変更できないライブラリの内部 API を移行期間中だけ使い続けるための応急処置で、恒久的な解決策ではありません。",
  },
  {
    id: 10437,
    topic: "modules",
    variantOf: "gold-modules-command-options",
    question:
      "次のモジュール構成を out ディレクトリにコンパイルした後、java -p out --add-opens com.example.model/com.example.model=com.example.app -m com.example.app/com.example.app.Main を実行した。結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "secret と出力される",
      "実行時に InaccessibleObjectException がスローされる",
      "com.example.model パッケージは既に exports されているため、--add-opens を指定すると起動に失敗する",
      "com.example.app の Main.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "secret" },
    moduleSetup: {
      sources: [
        { module: "com.example.model", path: "module-info.java", content: ["module com.example.model {", "    exports com.example.model;", "}"] },
        { module: "com.example.model", path: "com/example/model/User.java", content: ["package com.example.model;", "", "public class User {", "    private String password = \"secret\";", "}"] },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.model;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import java.lang.reflect.Field;",
            "import com.example.model.User;",
            "",
            "public class Main {",
            "    public static void main(String[] args) throws Exception {",
            "        Field f = User.class.getDeclaredField(\"password\");",
            "        f.setAccessible(true);",
            "        System.out.println(f.get(new User()));",
            "    }",
            "}",
          ],
        },
      ],
      tool: {
        command: "java",
        args: ["-p", "out", "--add-opens", "com.example.model/com.example.model=com.example.app", "-m", "com.example.app/com.example.app.Main"],
      },
    },
    explanation:
      "exports されているパッケージでも、private メンバーへのリフレクション（setAccessible(true)）は opens されていなければ InaccessibleObjectException になります。--add-opens は opens を起動時に追加するオプションで、module-info.java に opens com.example.model to com.example.app; と書いたのと同じ効果になるため、private フィールドの値 secret を読み出せます。exports とは別の権限なので、既に exports されているパッケージに追加しても問題ありません。古いライブラリがリフレクションで JDK の内部に触れて動かないときの回避策としてよく使われますが、依存を隠れた形で残すことにもなるので、ライブラリの更新で解消するのが本来の対処です。",
  },
  {
    id: 10438,
    topic: "modules",
    variantOf: "gold-modules-requires-static",
    question:
      "次のモジュール構成を out ディレクトリにコンパイルした後、java -p out --add-modules com.example.debug -m com.example.app/com.example.app.Main を実行した。結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "true と出力される",
      "false と出力される",
      "--add-modules は requires static のモジュールには効かないため、起動に失敗する",
      "com.example.app の module-info.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "true" },
    moduleSetup: {
      sources: [
        { module: "com.example.debug", path: "module-info.java", content: ["module com.example.debug {", "    exports com.example.debug;", "}"] },
        { module: "com.example.debug", path: "com/example/debug/Tracer.java", content: ["package com.example.debug;", "", "public class Tracer {", "}"] },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires static com.example.debug;", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        boolean found = ModuleLayer.boot().findModule(\"com.example.debug\").isPresent();",
            "        System.out.println(found);",
            "    }",
            "}",
          ],
        },
      ],
      tool: {
        command: "java",
        args: ["-p", "out", "--add-modules", "com.example.debug", "-m", "com.example.app/com.example.app.Main"],
      },
    },
    explanation:
      "requires static で指定したモジュールは、ほかに必要とするモジュールが無ければ実行時に解決されません（オプションなしで起動すると false です）。--add-modules は、指定したモジュールを起動時のモジュール・グラフの根（ルート）に追加するオプションで、これによって com.example.debug が解決され、app の requires static の読み込み関係も有効になるので true と出力されます。任意の機能を起動オプションで有効にしたり、クラスパス上のアプリにモジュール（java.sql など）を明示的に追加したりするときに使います。",
  },
];
