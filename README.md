[English](#en) | [中文](#zh)

---

<a id="en"></a>

# @webc.site/math : The world's smallest and fastest web Markdown formula renderer

- [@webc.site/math : The world's smallest and fastest web Markdown formula renderer](#webcsitemath-the-worlds-smallest-and-fastest-web-markdown-formula-renderer)
  - [1. Features](#1-features)
  - [2. Usage](#2-usage)
    - [Compilation Examples](#compilation-examples)
      - [Render TeX Formulas Directly](#render-tex-formulas-directly)
      - [Replace Formulas in Markdown Text](#replace-formulas-in-markdown-text)
    - [Font and CSS Configuration](#font-and-css-configuration)
      - [CSS Font Styling](#css-font-styling)
  - [3. Design](#3-design)
  - [4. Tech Stack](#4-tech-stack)
  - [5. Code Structure](#5-code-structure)
  - [6. Historical Background](#6-historical-background)

## 1. Features

This project compiles LaTeX math formulas into browser-native MathML Core markup, achieving zero-overhead rendering without client-side layout engines.

- **High Performance**: Compiles TeX formulas directly to native MathML. Processing speed reaches 299,000 operations per second, 3.2 times faster than KaTeX and 46 times faster than MathJax.
- **Lightweight**: Package size is 7.82 KB (3.56 KB gzipped), minimizing page load times.
- **Zero Runtime Dependencies**: Renders math using native browser engine, eliminating client-side JavaScript formatting libraries.
- **Robust Fault Tolerance**: Catches syntax errors automatically, reverting to raw TeX string output to prevent application crashes.
- **Universal Compatibility**: Generates standard MathML tags suitable for Server-Side Rendering (SSR), Static Site Generation (SSG), and Client-Side Rendering (CSR).

## 2. Usage

### Compilation Examples

#### Render TeX Formulas Directly

```javascript
import mathml from "@webc.site/math";

const html = mathml("e^{i\\pi} + 1 = 0", true); // Second parameter sets block style
```

#### Replace Formulas in Markdown Text

```javascript
import mdMath from "@webc.site/math/md.js";
import compile from "@webc.site/math";

const html = mdMath("Euler's identity: $$e^{i\\pi} + 1 = 0$$", compile);
```

### Font and CSS Configuration

To ensure optimal layout, configure math fonts. Use Latin Modern Math font from the `18s` package.

#### CSS Font Styling

```css
math {
  font-family: m, t, math, sans-serif;
}
```

## 3. Design

The compiler extracts TeX math formulas from input Markdown text, performs lexical and syntax analyses, and generates semantic MathML markup.

```mermaid
graph TD
    Input[Input Markdown] --> Scanner[Scanner: Locates Delimiters]
    Scanner -- Plain Text --> Buffer[Output Buffer]
    Scanner -- TeX Formula --> Lexer[Lexer: Tokenizes Input]
    Lexer --> Parser[Parser: Builds AST]
    Parser --> Codegen[Codegen: Translates to MathML Tags]
    Codegen --> Wrapper[Semantic Wrapper]
    Wrapper --> MathML[MathML Output]
    Buffer --> Output[Final HTML]
    MathML --> Output
```

## 4. Tech Stack

- Runtime: Bun, Node.js
- Linter & Formatter: oxlint, oxfmt
- Build Tool: Vite, Rolldown, Lightning CSS

## 5. Code Structure

```
.
├── demo/                # Interactive demo page
├── extract/             # Test cases extraction scripts
├── lib/                 # Compiled distribution files
│   ├── mathml.js        # Core compiler (minified)
│   └── md.js            # Markdown math formula parser (minified)
├── src/                 # Source code
│   ├── const/           # Tokens, AST types, symbols and functions constants
│   ├── lex.js           # LaTeX lexer
│   ├── parse.js         # LaTeX parser (AST builder)
│   ├── mathml.js        # Core TeX-to-MathML compiler
│   └── md.js            # Markdown parser entry
├── sh/                  # Scripts
└── test.sh              # Quality verification and test runner
```

## 6. Historical Background

MathML was proposed as a standard for mathematical notation in HTML5. Implementation complexity caused fragmented browser support. Chromium removed its initial MathML code in 2013, forcing web applications to load JavaScript layout libraries to calculate styles and position symbols.

In January 2023, Chrome 109 reintroduced native support for the MathML Core specification. With WebKit, Gecko, and Blink all supporting MathML Core natively, pages no longer require client-side JavaScript layout calculations. This project compiles LaTeX directly into native MathML tags at compile time, eliminating layout engine dependencies.

---

<a id="zh"></a>

# @webc.site/math : 全球最小最快的网页Markdown公式渲染器

- [@webc.site/math : 全球最小最快的网页Markdown公式渲染器](#webcsitemath-全球最小最快的网页markdown公式渲染器)
  - [1. 功能介绍](#1-功能介绍)
  - [2. 使用演示](#2-使用演示)
    - [编译示例](#编译示例)
      - [直接渲染 TeX 公式](#直接渲染-tex-公式)
      - [替换 Markdown 文本中的公式](#替换-markdown-文本中的公式)
    - [字体与 CSS 配置](#字体与-css-配置)
      - [CSS 字体样式设置](#css-字体样式设置)
  - [3. 设计思路](#3-设计思路)
  - [4. 技术栈](#4-技术栈)
  - [5. 代码结构](#5-代码结构)
  - [6. 历史故事](#6-历史故事)

## 1. 功能介绍

项目将 LaTeX 数学公式编译为浏览器原生支持的 MathML Core 标记。无需前端排版引擎，实现零运行开销渲染。

- **高性能**：直接将 TeX 公式翻译为原生 MathML 标签。处理速度达每秒 299,000 次操作，为 KaTeX 的 3.2 倍，MathJax 的 46 倍。
- **轻量化**：包体积 7.82 KB（Gzip 压缩后 3.56 KB），缩短加载时间。
- **无运行时依赖**：利用浏览器原生 C++ 引擎排版与渲染，无需加载 JavaScript 排版库。
- **健壮容错**：自动捕获语法错误（如未闭合括号），降级输出原始 TeX 字符串，避免程序崩溃。
- **多端兼容**：输出标准 MathML 元素，支持服务端渲染（SSR）、静态网页生成（SSG）及客户端渲染（CSR）。

## 2. 使用演示

### 编译示例

#### 直接渲染 TeX 公式

```javascript
import mathml from "@webc.site/math";

const html = mathml("e^{i\\pi} + 1 = 0", true); // 第二参数设为 true 表示块级公式
```

#### 替换 Markdown 文本中的公式

```javascript
import mdMath from "@webc.site/math/md.js";
import compile from "@webc.site/math";

const html = mdMath("欧拉恒等式：$$e^{i\\pi} + 1 = 0$$", compile);
```

### 字体与 CSS 配置

配置数学字体可确保排版效果。推荐使用 `18s` 字体包中的 Latin Modern Math 字体。

#### CSS 字体样式设置

```css
math {
  font-family: m, t, math, sans-serif;
}
```

## 3. 设计思路

编译器从输入的 Markdown 文本中提取 TeX 公式，执行词法分析与语法分析，生成对应的语义化 MathML 标记。

```mermaid
graph TD
    Input[输入 Markdown] --> Scanner[扫描器: 定位定界符]
    Scanner -- 普通文本 --> Buffer[输出缓冲区]
    Scanner -- TeX 公式 --> Lexer[词法分析: 生成 Token]
    Lexer --> Parser[语法分析: 生成 AST]
    Parser --> Codegen[代码生成: 映射 MathML 标签]
    Codegen --> Wrapper[语义包装]
    Wrapper --> MathML[MathML 输出]
    Buffer --> Output[最终 HTML]
    MathML --> Output
```

## 4. 技术栈

- 运行环境：Bun, Node.js
- 代码规范：oxlint, oxfmt
- 构建工具：Vite, Rolldown, Lightning CSS

## 5. 代码结构

```
.
├── demo/                # 演示页面
├── extract/             # 测试用例提取脚本
├── lib/                 # 编译产物目录
│   ├── mathml.js        # 核心编译器（压缩版）
│   └── md.js            # Markdown 公式解析器（压缩版）
├── src/                 # 源代码
│   ├── const/           # 词法、语法、符号及函数常量定义
│   ├── lex.js           # LaTeX 词法分析器
│   ├── parse.js         # LaTeX 语法分析器
│   ├── mathml.js        # TeX 至 MathML 核心编译器
│   └── md.js            # Markdown 公式解析入口
├── sh/                  # 脚本目录
└── test.sh              # 代码规范与测试运行脚本
```

## 6. 历史故事

MathML 曾被提议为 HTML5 标准数学排版规范。但因实现复杂度高，各浏览器引擎支持程度参差不齐。2013 年，Chromium 项目移除了原有的 MathML 渲染实现。导致网页渲染公式时，必须在前端加载 JavaScript 排版库以计算样式布局和字符位置。

2023 年 1 月，Chrome 109 重新引入对 MathML Core 标准的原生支持。现代浏览器引擎（WebKit、Gecko、Blink）已全面实现该规范。前端无需引入排版引擎，可在编译期直接将 LaTeX 转换为原生 MathML 标签，消除运行时依赖。
