import type { GoldQuestion } from "../quizTypes";

/**
 * Gold SE 17（1Z0-826-JPN）: Java モジュール・システム（id 10401-10499）。
 * モジュールの宣言とアクセス、無名モジュール・自動モジュール、ServiceLoader。
 *
 * ここの問題は code を持たず、moduleSetup のソース一式をそのまま画面に表示する。
 * 表示しているファイルと実機で検証したファイルが一致するようにするため。
 */
export const goldModulesQuestions: GoldQuestion[] = [
  // ---------------------------------------------------- 限定的な exports
  {
    id: 10401,
    topic: "modules",
    variantOf: "gold-modules-qualified-exports",
    question:
      "次の 3 つのモジュールをまとめてコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "com.example.report の Main.java でコンパイルエラーになる",
      "com.example.admin の Main.java でコンパイルエラーになる",
      "com.example.lib の module-info.java でコンパイルエラーになる",
      "3 つのモジュールともコンパイルに成功する",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.lib", path: "module-info.java", content: ["module com.example.lib {", "    exports com.example.lib.api to com.example.admin;", "}"] },
        { module: "com.example.lib", path: "com/example/lib/api/Config.java", content: ["package com.example.lib.api;", "", "public class Config {", "    public static String get() {", '        return "config";', "    }", "}"] },
        { module: "com.example.admin", path: "module-info.java", content: ["module com.example.admin {", "    requires com.example.lib;", "}"] },
        { module: "com.example.admin", path: "com/example/admin/Main.java", content: ["package com.example.admin;", "", "import com.example.lib.api.Config;", "", "public class Main {", "    public static void main(String[] args) {", "        System.out.println(Config.get());", "    }", "}"] },
        { module: "com.example.report", path: "module-info.java", content: ["module com.example.report {", "    requires com.example.lib;", "}"] },
        { module: "com.example.report", path: "com/example/report/Main.java", content: ["package com.example.report;", "", "import com.example.lib.api.Config;", "", "public class Main {", "    public static void main(String[] args) {", "        System.out.println(Config.get());", "    }", "}"] },
      ],
    },
    explanation:
      "exports パッケージ名 to モジュール名 は「限定的なエクスポート」で、to の後に列挙したモジュールにだけパッケージを公開します。com.example.admin は公開先に含まれているので Config を使えますが、com.example.report は requires com.example.lib と書いていても公開先に含まれないため、import した時点で「パッケージが見えない」コンパイルエラーになります。requires は依存を宣言するだけで、何が見えるかは提供側の exports が決めます。フレームワークや同じ製品の内部モジュールにだけ API を開きたい場合に、公開範囲を必要最小限に絞るための仕組みです。",
  },
  {
    id: 10402,
    topic: "modules",
    variantOf: "gold-modules-qualified-exports",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "ok と出力される",
      "com.example.app の Main.java でコンパイルエラーになる",
      "com.example.lib の module-info.java でコンパイルエラーになる",
      "実行時に IllegalAccessError がスローされる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "ok" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.lib", path: "module-info.java", content: ["module com.example.lib {", "    exports com.example.lib.api to com.example.app, com.example.test;", "}"] },
        { module: "com.example.lib", path: "com/example/lib/api/Status.java", content: ["package com.example.lib.api;", "", "public class Status {", "    public static String ok() {", '        return "ok";', "    }", "}"] },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.lib;", "}"] },
        { module: "com.example.app", path: "com/example/app/Main.java", content: ["package com.example.app;", "", "import com.example.lib.api.Status;", "", "public class Main {", "    public static void main(String[] args) {", "        System.out.println(Status.ok());", "    }", "}"] },
      ],
    },
    explanation:
      "限定的なエクスポートの公開先には複数のモジュールをカンマ区切りで書けます。ここでは公開先の com.example.test がモジュールとして存在しませんが、javac は警告を出すだけでエラーにはしません。公開先はそのモジュールと一緒に配布されるとは限らない（テスト用モジュールなど）ため、存在しないことを許しているのです。com.example.app は公開先に含まれているので Status を使え、ok と出力されます。",
  },

  // ---------------------------------------------------- opens とリフレクション
  {
    id: 10403,
    topic: "modules",
    variantOf: "gold-modules-opens",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "実行時に InaccessibleObjectException がスローされる",
      "secret と出力される",
      "com.example.app の Main.java でコンパイルエラーになる",
      "実行時に ClassNotFoundException がスローされる",
    ],
    correct: [0],
    expected: { kind: "exception", type: "java.lang.reflect.InaccessibleObjectException" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.model", path: "module-info.java", content: ["module com.example.model {", "    exports com.example.model;", "}"] },
        { module: "com.example.model", path: "com/example/model/User.java", content: ["package com.example.model;", "", "public class User {", '    private String password = "secret";', "}"] },
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
            '        Field f = User.class.getDeclaredField("password");',
            "        f.setAccessible(true);",
            "        System.out.println(f.get(new User()));",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "exports はパッケージの public 型を「コンパイル時と実行時の通常のアクセス」に公開するだけで、リフレクションによる private メンバーへのアクセス（深いリフレクション）は許可しません。そのため setAccessible(true) の呼び出しで InaccessibleObjectException がスローされます。深いリフレクションを許すには、提供側で opens com.example.model; と宣言するか、モジュール全体を open module にする必要があります。JSON マッピングや DI のようにフレームワークが private フィールドを読み書きする場合に、どのパッケージを開くかをモジュールの作者が明示的に決められるようにした仕組みです。",
  },
  {
    id: 10404,
    topic: "modules",
    variantOf: "gold-modules-opens",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "secret と出力される",
      "実行時に InaccessibleObjectException がスローされる",
      "com.example.app の Main.java でコンパイルエラーになる",
      "com.example.model の module-info.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "secret" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.model", path: "module-info.java", content: ["module com.example.model {", "    exports com.example.model;", "    opens com.example.model to com.example.app;", "}"] },
        { module: "com.example.model", path: "com/example/model/User.java", content: ["package com.example.model;", "", "public class User {", '    private String password = "secret";', "}"] },
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
            '        Field f = User.class.getDeclaredField("password");',
            "        f.setAccessible(true);",
            "        System.out.println(f.get(new User()));",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "opens パッケージ名 to モジュール名 は、指定したモジュールにだけ実行時の深いリフレクションを許可します。com.example.app は許可先に含まれるため、setAccessible(true) が成功し private フィールドの値 secret を読み出せます。exports と opens は独立した宣言で、exports はコンパイル時の型の参照、opens は実行時のリフレクションを許可します。opens だけではコンパイル時に型を参照できないため、ここでは User を import するために exports も併せて宣言しています。",
  },

  // ---------------------------------------------------------- ServiceLoader
  {
    id: 10405,
    topic: "modules",
    variantOf: "gold-modules-serviceloader",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "Hello from impl と出力される",
      "com.example.impl が com.example.impl パッケージを exports していないため、コンパイルエラーになる",
      "com.example.app が com.example.impl を requires していないため、コンパイルエラーになる",
      "none と出力される",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "Hello from impl" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.api", path: "module-info.java", content: ["module com.example.api {", "    exports com.example.api;", "}"] },
        { module: "com.example.api", path: "com/example/api/Greeter.java", content: ["package com.example.api;", "", "public interface Greeter {", "    String greet();", "}"] },
        { module: "com.example.impl", path: "module-info.java", content: ["module com.example.impl {", "    requires com.example.api;", "    provides com.example.api.Greeter with com.example.impl.ImplGreeter;", "}"] },
        { module: "com.example.impl", path: "com/example/impl/ImplGreeter.java", content: ["package com.example.impl;", "", "import com.example.api.Greeter;", "", "public class ImplGreeter implements Greeter {", "    public String greet() {", '        return "Hello from impl";', "    }", "}"] },
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
            '                .orElse("none");',
            "        System.out.println(s);",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "サービスの利用側は uses でサービスのインタフェースを宣言し、提供側は provides インタフェース with 実装クラス で実装を登録します。ServiceLoader はモジュールパス上の provides 宣言から実装を見つけてインスタンス化するので、利用側は実装モジュールを requires する必要も、実装クラスの名前を知る必要もありません。また実装のパッケージを exports しなくても、ServiceLoader 経由でのインスタンス化は許可されます。利用側と実装側が API モジュールにだけ依存する形にでき、実装の差し替えをモジュールの入れ替えだけで実現できるのがこの仕組みの狙いです。",
  },
  {
    id: 10406,
    topic: "modules",
    variantOf: "gold-modules-serviceloader",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "実行時に ServiceConfigurationError がスローされる",
      "Hello from impl と出力される",
      "none と出力される",
      "com.example.app の Main.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "exception", type: "java.util.ServiceConfigurationError" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      sources: [
        { module: "com.example.api", path: "module-info.java", content: ["module com.example.api {", "    exports com.example.api;", "}"] },
        { module: "com.example.api", path: "com/example/api/Greeter.java", content: ["package com.example.api;", "", "public interface Greeter {", "    String greet();", "}"] },
        { module: "com.example.impl", path: "module-info.java", content: ["module com.example.impl {", "    requires com.example.api;", "    provides com.example.api.Greeter with com.example.impl.ImplGreeter;", "}"] },
        { module: "com.example.impl", path: "com/example/impl/ImplGreeter.java", content: ["package com.example.impl;", "", "import com.example.api.Greeter;", "", "public class ImplGreeter implements Greeter {", "    public String greet() {", '        return "Hello from impl";', "    }", "}"] },
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
            '                .orElse("none");',
            "        System.out.println(s);",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "名前付きモジュールから ServiceLoader.load を呼ぶには、そのモジュールの module-info.java で uses によってサービスの型を宣言しておく必要があります。com.example.app には uses com.example.api.Greeter; が無いため、コンパイルは通りますが、実行時に load を呼んだ時点で「uses を宣言していない」という ServiceConfigurationError がスローされます。「実装が見つからない」ときは例外ではなく空の結果（ここでは none）になるのと区別してください。どのモジュールがどのサービスを使うかを宣言させることで、モジュール構成の解決時にサービスの利用関係を把握できるようにしています。",
  },
  {
    id: 10407,
    topic: "modules",
    variantOf: "gold-modules-serviceloader",
    question:
      "次のモジュール構成で、com.example.app/com.example.app.Main を実行した場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "provider Hello と出力される",
      "ImplGreeter に public な引数なしコンストラクタが無いため、コンパイルエラーになる",
      "実行時に ServiceConfigurationError がスローされる",
      "Hello と出力される",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "provider Hello" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
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
            "public class ImplGreeter {",
            "    private ImplGreeter() {}",
            "",
            "    public static Greeter provider() {",
            '        System.out.print("provider ");',
            '        return () -> "Hello";',
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
            "        for (Greeter g : ServiceLoader.load(Greeter.class)) {",
            "            System.out.println(g.greet());",
            "        }",
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "モジュールとして提供するサービス実装は、public な引数なしコンストラクタを持つか、public static な provider() メソッドを持つ必要があります。provider() がある場合は ServiceLoader がコンストラクタの代わりにそれを呼び出し、その戻り値をサービスの実装として使います。ここでは ImplGreeter 自体は Greeter を実装していませんが、provider() がラムダ式で Greeter を返しているため問題ありません。provider() を使うと、シングルトンを返したり、生成時に初期化処理を挟んだりと、実装の生成方法を提供側で制御できます。",
  },

  // ---------------------------------------------------- 自動モジュールと無名モジュール
  {
    id: 10408,
    topic: "modules",
    variantOf: "gold-modules-automatic",
    question:
      "module-info.java を持たない legacy-util-1.0.jar（com.legacy.util.Strings を含む）をモジュールパスに置き、次のモジュール com.example.app から利用したい。module-info.java の空欄に入るモジュール名として正しいものはどれか。1つ選びなさい。",
    choices: ["legacy.util", "legacy-util", "legacy.util.1.0", "com.legacy.util", "legacy_util"],
    correct: [0],
    expected: { kind: "output", stdout: "HELLO" },
    moduleSetup: {
      main: "com.example.app/com.example.app.Main",
      jars: [
        {
          fileName: "legacy-util-1.0.jar",
          placement: "module-path",
          sources: [
            {
              path: "com/legacy/util/Strings.java",
              content: [
                "package com.legacy.util;",
                "",
                "public class Strings {",
                "    public static String shout(String s) {",
                "        return s.toUpperCase();",
                "    }",
                "}",
              ],
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
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            '        System.out.println(Strings.shout("hello"));',
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "module-info.java を持たない JAR をモジュールパスに置くと、自動モジュールとして扱われます。マニフェストに Automatic-Module-Name が無い場合、モジュール名は JAR ファイル名から導出されます。拡張子 .jar を除き、末尾のバージョン番号（-1.0）を取り除き、英数字以外の文字（-）をドットに置き換えるので legacy.util になります。自動モジュールはすべてのパッケージを exports し、他のすべてのモジュールを読み込むため、まだモジュール化されていないライブラリをそのまま使い始められます。ファイル名に依存する名前は変わりやすいので、ライブラリ側で Automatic-Module-Name を定めておくのが望ましいとされます。",
  },
  {
    id: 10409,
    topic: "modules",
    variantOf: "gold-modules-automatic",
    question:
      "module-info.java を持たない legacy-util-1.0.jar（com.legacy.util.Strings を含む）をクラスパスに置き、次のモジュール com.example.app をモジュールパスからコンパイルした。結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "名前付きモジュールは無名モジュールを読み込めないため、Main.java でコンパイルエラーになる",
      "クラスパス上の JAR は自動モジュールとして扱われるため、コンパイルに成功する",
      "requires を書かなくてもクラスパス上のクラスは参照できるため、コンパイルに成功する",
      "module-info.java で requires legacy.util; と書けばコンパイルに成功する",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      jars: [
        {
          fileName: "legacy-util-1.0.jar",
          placement: "class-path",
          sources: [
            {
              path: "com/legacy/util/Strings.java",
              content: [
                "package com.legacy.util;",
                "",
                "public class Strings {",
                "    public static String shout(String s) {",
                "        return s.toUpperCase();",
                "    }",
                "}",
              ],
            },
          ],
        },
      ],
      sources: [
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "import com.legacy.util.Strings;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            '        System.out.println(Strings.shout("hello"));',
            "    }",
            "}",
          ],
        },
      ],
    },
    explanation:
      "クラスパス上のクラスはすべて 1 つの無名モジュールに属します。無名モジュールには名前が無いので requires で指定することができず、名前付きモジュールは無名モジュールを読み込めません。そのため com.example.app から com.legacy.util パッケージは見えず、コンパイルエラーになります。名前付きモジュールの依存関係をすべて module-info.java から把握できるようにするため、「どこかのクラスパスにあるもの」への暗黙の依存を禁じているのです。モジュールから従来型の JAR を使うには、モジュールパスに置いて自動モジュールにします。",
  },

  // ---------------------------------------------------- 依存関係の制約
  {
    id: 10410,
    topic: "modules",
    variantOf: "gold-modules-dependency-rules",
    question: "次の 2 つのモジュールをまとめてコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "モジュール間の依存が循環しているため、コンパイルエラーになる",
      "コンパイルに成功する",
      "com.example.order が com.example.order パッケージを exports していないため、コンパイルエラーになる",
      "コンパイルには成功するが、実行時にモジュールの解決に失敗する",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.order", path: "module-info.java", content: ["module com.example.order {", "    requires com.example.stock;", "    exports com.example.order;", "}"] },
        { module: "com.example.order", path: "com/example/order/Order.java", content: ["package com.example.order;", "", "public class Order {", "}"] },
        { module: "com.example.stock", path: "module-info.java", content: ["module com.example.stock {", "    requires com.example.order;", "    exports com.example.stock;", "}"] },
        { module: "com.example.stock", path: "com/example/stock/Stock.java", content: ["package com.example.stock;", "", "public class Stock {", "}"] },
      ],
    },
    explanation:
      "モジュール間の requires は循環してはならず、order が stock を、stock が order を requires するこの構成は「cyclic dependence」としてコンパイルエラーになります。循環を認めると、どちらを先に解決・初期化すべきか決まらず、片方だけを取り出して再利用することもできなくなるためです。クラスどうしの相互参照は同じモジュール内であれば問題ありません。循環が生じたら、共通して必要な型を第 3 のモジュールに切り出すか、インタフェースとサービスで依存の向きを一方向にそろえます。",
  },
  {
    id: 10411,
    topic: "modules",
    variantOf: "gold-modules-dependency-rules",
    question: "次の 3 つのモジュールをまとめてコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "com.example.app が同じパッケージを公開する 2 つのモジュールを読み込むため、コンパイルエラーになる",
      "コンパイルに成功し、パッケージの内容は 2 つのモジュールで統合される",
      "コンパイルに成功し、requires で先に書いたモジュールのパッケージが優先される",
      "com.example.a の module-info.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.a", path: "module-info.java", content: ["module com.example.a {", "    exports com.example.util;", "}"] },
        { module: "com.example.a", path: "com/example/util/Alpha.java", content: ["package com.example.util;", "", "public class Alpha {", "}"] },
        { module: "com.example.b", path: "module-info.java", content: ["module com.example.b {", "    exports com.example.util;", "}"] },
        { module: "com.example.b", path: "com/example/util/Beta.java", content: ["package com.example.util;", "", "public class Beta {", "}"] },
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "    requires com.example.a;", "    requires com.example.b;", "}"] },
        { module: "com.example.app", path: "com/example/app/Main.java", content: ["package com.example.app;", "", "public class Main {", "}"] },
      ],
    },
    explanation:
      "1 つのモジュールが、同じ名前のパッケージを公開する 2 つのモジュールを読み込むことはできず（分割パッケージ）、com.example.app の宣言がコンパイルエラーになります。モジュールシステムでは「1 つのパッケージは 1 つのモジュールに属する」ことが前提で、それによってクラスの読み込み元が一意に決まります。クラスパスではパッケージが複数の JAR に分散しても先に見つかったクラスが使われ、どの JAR のクラスが読み込まれるかが並び順に左右されていました。その不確かさをなくすための制約です。",
  },
  {
    id: 10412,
    topic: "modules",
    variantOf: "gold-modules-implied-readability",
    question: "次の 3 つのモジュールをまとめてコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "コンパイルに成功する",
      "com.example.app が com.example.money を requires していないため、Main.java でコンパイルエラーになる",
      "com.example.bank の module-info.java でコンパイルエラーになる",
      "com.example.app の module-info.java でコンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "" },
    moduleSetup: {
      sources: [
        { module: "com.example.money", path: "module-info.java", content: ["module com.example.money {", "    exports com.example.money;", "}"] },
        { module: "com.example.money", path: "com/example/money/Yen.java", content: ["package com.example.money;", "", "public record Yen(long amount) {", "}"] },
        { module: "com.example.bank", path: "module-info.java", content: ["module com.example.bank {", "    requires transitive com.example.money;", "    exports com.example.bank;", "}"] },
        { module: "com.example.bank", path: "com/example/bank/Account.java", content: ["package com.example.bank;", "", "import com.example.money.Yen;", "", "public class Account {", "    public Yen balance() {", "        return new Yen(1000);", "    }", "}"] },
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
      "com.example.bank は requires transitive com.example.money と宣言しているため、bank を requires したモジュールは money も暗黙に読み込みます（暗黙の可読性）。そのため com.example.app は money を requires していなくても Yen を import して使えます。Account.balance() のように公開 API の戻り値に別モジュールの型が現れる場合、利用側がその型を読めないと戻り値を受け取れません。API の一部として他モジュールの型を公開するときは transitive を付け、利用側に依存の追加を強いないようにします。",
  },
  // ------------------------------------------------------ jdeps とコマンドライン
  {
    id: 10414,
    topic: "modules",
    variantOf: "gold-modules-jdeps",
    question:
      "次のクラスだけを含む report-1.0.jar に対して、jdeps --list-deps report-1.0.jar を実行した。出力されるモジュールの組み合わせとして正しいものはどれか。1つ選びなさい。",
    choices: [
      "java.base、java.logging、java.sql",
      "java.logging、java.sql（java.base は含まれない）",
      "java.base のみ",
      "java.se",
      "report-1.0.jar は module-info.java を持たないため、jdeps はエラーになる",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "   java.base\n   java.logging\n   java.sql" },
    moduleSetup: {
      jars: [
        {
          fileName: "report-1.0.jar",
          placement: "class-path",
          sources: [
            {
              path: "com/example/report/Report.java",
              content: [
                "package com.example.report;",
                "",
                "import java.sql.Connection;",
                "import java.util.logging.Logger;",
                "",
                "public class Report {",
                '    private static final Logger LOG = Logger.getLogger("report");',
                "",
                "    public void print(Connection con) {",
                '        LOG.info("print " + con);',
                "    }",
                "}",
              ],
            },
          ],
        },
      ],
      sources: [],
      tool: { command: "jdeps", args: ["--list-deps", "jars/class-path/report-1.0.jar"] },
    },
    explanation:
      "jdeps はクラスファイルを解析して、どのパッケージやモジュールに依存しているかを表示するツールです。--list-deps を付けると、依存している JDK のモジュールの一覧を出力します。Report は Connection（java.sql）と Logger（java.logging）を使い、すべてのクラスは Object などを含む java.base に依存するので、この 3 つが表示されます。module-info.java を持たない従来型の JAR でも解析でき、モジュール化する際に requires に書くべきモジュールを洗い出すのが代表的な使い方です。",
  },
  {
    id: 10415,
    topic: "modules",
    variantOf: "gold-modules-jdeps",
    question:
      "次のクラスだけを含む report-1.0.jar に対して、jdeps -summary report-1.0.jar を実行した。出力として正しいものはどれか。1つ選びなさい。",
    choices: [
      "report-1.0.jar -> java.base、report-1.0.jar -> java.logging、report-1.0.jar -> java.sql の 3 行が出力される",
      "java.base、java.logging、java.sql の 3 行が、依存元を付けずに出力される",
      "依存しているパッケージごとに、依存元のクラス名とともに 1 行ずつ出力される",
      "report-1.0.jar -> java.logging、report-1.0.jar -> java.sql の 2 行だけが出力される",
    ],
    correct: [0],
    expected: {
      kind: "output",
      stdout: "report-1.0.jar -> java.base\nreport-1.0.jar -> java.logging\nreport-1.0.jar -> java.sql",
    },
    moduleSetup: {
      jars: [
        {
          fileName: "report-1.0.jar",
          placement: "class-path",
          sources: [
            {
              path: "com/example/report/Report.java",
              content: [
                "package com.example.report;",
                "",
                "import java.sql.Connection;",
                "import java.util.logging.Logger;",
                "",
                "public class Report {",
                '    private static final Logger LOG = Logger.getLogger("report");',
                "",
                "    public void print(Connection con) {",
                '        LOG.info("print " + con);',
                "    }",
                "}",
              ],
            },
          ],
        },
      ],
      sources: [],
      tool: { command: "jdeps", args: ["-summary", "jars/class-path/report-1.0.jar"] },
    },
    explanation:
      "jdeps -summary（短縮形は -s）は、解析対象のアーカイブがどのモジュールに依存しているかを「依存元 -> 依存先」の形式で 1 行ずつ要約して出力します。オプションを付けずに実行すると、さらにパッケージ単位の依存関係（どのパッケージがどのパッケージを使っているか）まで詳細に表示されます。要約で全体像をつかみ、必要に応じて詳細や -verbose:class によるクラス単位の出力で掘り下げる、という使い分けができます。java.base への依存はすべてのコードが持つため、どの形式でも必ず現れます。",
  },
  {
    id: 10416,
    topic: "modules",
    variantOf: "gold-modules-automatic",
    question:
      "module-info.java を持たない次の legacy-util-1.0.jar に対して、jar --describe-module --file legacy-util-1.0.jar を実行した。出力の内容として正しいものはどれか。1つ選びなさい。",
    choices: [
      "自動モジュール legacy.util@1.0 として、java.base への依存と com.legacy.util パッケージを含むことが表示される",
      "モジュール記述子が無いため、何も表示されずにエラーになる",
      "無名モジュールとして、名前を持たないモジュールであることが表示される",
      "自動モジュール legacy-util-1.0 として、パッケージを何も exports しないことが表示される",
    ],
    correct: [0],
    expected: {
      kind: "output",
      stdout:
        "No module descriptor found. Derived automatic module.\n\nlegacy.util@1.0 automatic\nrequires java.base mandated\ncontains com.legacy.util",
    },
    moduleSetup: {
      jars: [
        {
          fileName: "legacy-util-1.0.jar",
          placement: "module-path",
          sources: [
            {
              path: "com/legacy/util/Strings.java",
              content: [
                "package com.legacy.util;",
                "",
                "public class Strings {",
                "    public static String shout(String s) {",
                "        return s.toUpperCase();",
                "    }",
                "}",
              ],
            },
          ],
        },
      ],
      sources: [],
      tool: { command: "jar", args: ["--describe-module", "--file", "jars/module-path/legacy-util-1.0.jar"] },
    },
    explanation:
      "jar --describe-module（短縮形は -d）は、JAR をモジュールとして扱った場合の記述子を表示します。module-info.class が無い JAR では「モジュール記述子が無いので自動モジュールとして導出した」と表示され、ファイル名から導いた名前 legacy.util とバージョン 1.0、java.base への必須の依存、含まれるパッケージが示されます。自動モジュールはすべてのパッケージを公開するため、contains に並ぶパッケージがそのまま他のモジュールから使えるものになります。requires に書くべきモジュール名を確かめたいときに便利なコマンドです。",
  },
  {
    id: 10417,
    topic: "modules",
    variantOf: "gold-modules-run-command",
    question:
      "次のモジュールを javac -d out --module-source-path src -m com.example.app でコンパイルした。このアプリケーションを実行するコマンドとして正しいものはどれか。1つ選びなさい。",
    choices: [
      "java -p out -m com.example.app/com.example.app.Main",
      "java -cp out -m com.example.app/com.example.app.Main",
      "java -p out com.example.app.Main",
      "java -p out -m com.example.app.Main",
      "java -m out/com.example.app/com.example.app.Main",
    ],
    correct: [0],
    expected: { kind: "output", stdout: "running in com.example.app" },
    moduleSetup: {
      sources: [
        { module: "com.example.app", path: "module-info.java", content: ["module com.example.app {", "}"] },
        {
          module: "com.example.app",
          path: "com/example/app/Main.java",
          content: [
            "package com.example.app;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            '        System.out.println("running in " + Main.class.getModule().getName());',
            "    }",
            "}",
          ],
        },
      ],
      tool: { command: "java", args: ["-p", "out", "-m", "com.example.app/com.example.app.Main"] },
    },
    explanation:
      "モジュールを実行するときは、-p（--module-path の短縮形）でモジュールを探す場所を、-m（--module）で「モジュール名/メインクラスの完全修飾名」を指定します。-m にメインクラスだけを書くとモジュール名として解釈され、-m を付けずにクラス名だけを書くとクラスパスから探すことになり、どちらも起動できません。-cp はクラスパスの指定で、モジュールパスの代わりにはなりません。モジュールとして起動されると、Main.class.getModule().getName() は無名モジュールではなく com.example.app を返します。",
  },
  {
    id: 10413,
    topic: "modules",
    variantOf: "gold-modules-declaration-errors",
    question: "次のモジュールをコンパイルした場合の結果として正しいものはどれか。1つ選びなさい。",
    choices: [
      "exports に指定した com.example.shop.internal パッケージが存在しないため、コンパイルエラーになる",
      "コンパイルに成功し、com.example.shop.internal は空のパッケージとして公開される",
      "コンパイルに成功するが、実行時に例外がスローされる",
      "exports は 1 つのモジュールに 1 つしか書けないため、コンパイルエラーになる",
    ],
    correct: [0],
    expected: { kind: "compile-error" },
    moduleSetup: {
      sources: [
        { module: "com.example.shop", path: "module-info.java", content: ["module com.example.shop {", "    exports com.example.shop.api;", "    exports com.example.shop.internal;", "}"] },
        { module: "com.example.shop", path: "com/example/shop/api/Cart.java", content: ["package com.example.shop.api;", "", "public class Cart {", "}"] },
      ],
    },
    explanation:
      "exports や opens に指定するパッケージは、そのモジュール内に実際に存在し、少なくとも 1 つの型を含んでいなければなりません。com.example.shop.internal には型が 1 つも無いので「package is empty or does not exist」というコンパイルエラーになります。exports は複数書けますが、存在しないパッケージの公開を許すと、綴りの誤りなどで意図したパッケージが公開されていないことに気付けません。モジュール宣言をコンパイル時に厳密に検査することで、公開範囲の誤りを早期に発見できるようにしています。",
  },
];
