import assert from "node:assert/strict";
import { test } from "node:test";
import { getProcessor } from "bytemd";
import gfm from "@bytemd/plugin-gfm";
import gemoji from "@bytemd/plugin-gemoji";
import math from "@bytemd/plugin-math";
import breaks from "@bytemd/plugin-breaks";
import rehypeSlug from "rehype-slug-custom-id";
import {
  markdownExtensionsPlugin,
  sanitizeMarkdownExtensions,
} from "../src/plugins/markdown-extensions.ts";

const slug = { rehype: (p) => p.use(rehypeSlug, { enableCustomId: true }) };
const plugins = [
  gfm({ singleTilde: false }),
  slug,
  markdownExtensionsPlugin(),
  gemoji(),
  math(),
  breaks(),
];
const render = (source) =>
  getProcessor({ plugins, sanitize: sanitizeMarkdownExtensions })
    .processSync(source)
    .toString();

for (const kind of ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]) {
  test(`renders ${kind} with rich content and removes the marker`, () => {
    const html = render(
      `> [!${kind}]\n> 提示 **加粗** [链接](https://example.com)\n>\n> - 列表\n>\n> \`\`\`js\n> const value = 1;\n> \`\`\``
    );
    assert.match(html, new RegExp(`lensmd-alert-${kind.toLowerCase()}`));
    assert.equal((html.match(/lensmd-alert-title/g) ?? []).length, 1);
    assert.match(html, /<strong>加粗<\/strong>/);
    assert.match(html, /<li>列表<\/li>/);
    assert.match(html, /<code class="language-js">/);
    assert.doesNotMatch(html, /\[!/);
  });
}

test("handles CRLF, hard breaks, nested alerts and empty bodies", () => {
  assert.match(render("> [!TIP]  \r\n> 内容"), /<p>内容<\/p>/);
  const nested = render("> [!NOTE]\n> 外层\n>\n> > [!WARNING]\n> > 内层");
  assert.match(nested, /lensmd-alert-note/);
  assert.match(nested, /lensmd-alert-warning/);
  assert.doesNotMatch(render("> [!TIP]"), /<p><\/p>|\[!TIP\]/);
});

test("leaves escaped, inline, unknown and misplaced markers alone", () => {
  for (const source of [
    "> \\[!TIP]\n> 原样",
    "> `[!TIP]`\n> 原样",
    "> [!UNKNOWN]\n> 原样",
    "> 普通引文\n>\n> [!TIP]\n> 原样",
    "> [!TIP] 仍在同一行",
  ]) {
    assert.doesNotMatch(render(source), /class="lensmd-alert/);
  }
});

test("supports highlighting, subscript, superscript and emoji together", () => {
  const html = render("==重要 **文字**==，H~2~O，x^2^，~~删除~~，:smile:");
  assert.match(
    html,
    /<mark class="lensmd-highlight">重要 <strong>文字<\/strong><\/mark>/
  );
  assert.match(html, /H<sub>2<\/sub>O/);
  assert.match(html, /x<sup>2<\/sup>/);
  assert.match(html, /<del>删除<\/del>/);
  assert.match(html, /😄/u);
});

test("preserves literal delimiters in code, escapes and URLs", () => {
  const html = render(
    "`==x== H~2~O x^2^ :smile:`\n\n\\==literal== \\^literal^ \\~literal~\n\n[链接](https://example.com/a~b~c?q=x^2^)"
  );
  assert.match(html, /<code>==x== H~2~O x\^2\^ :smile:<\/code>/);
  assert.doesNotMatch(html, /<mark[ >]|<sup>|<sub>/);
  assert.match(html, /href="https:\/\/example.com\/a~b~c\?q=x%5E2%5E"/);
});

test("TOC follows real heading IDs, hierarchy and duplicate headings", () => {
  const html = render(
    "[TOC]\n\n# 标题 {#custom}\n\n### 子标题\n\n## 标题\n\n## 标题"
  );
  assert.match(html, /<nav class="markdown-toc" aria-label="文章目录">/);
  assert.match(html, /href="#custom"/);
  assert.match(html, /href="#%E6%A0%87%E9%A2%98-1"/);
  assert.doesNotMatch(html, /\[TOC\]|<ul><\/ul>/);
  assert.doesNotMatch(render("\\[TOC]\n\n# 标题"), /<nav/);
  assert.doesNotMatch(render("`[TOC]`\n\n# 标题"), /<nav/);
});

test("retains the existing HTML sanitizer", () => {
  const html = render(
    '> [!WARNING]\n> ==<img src="x" onerror="alert(1)">==\n> <svg onload="alert(1)"><script>alert(1)</script></svg>\n> [链接](javascript:alert(1))'
  );
  assert.match(html, /lensmd-alert-warning/);
  assert.doesNotMatch(html, /<script|<svg|onerror=|onload=|href="javascript:/);
});

test("existing Markdown produces the same HTML as the official plugin", () => {
  const original = getProcessor({ plugins: [gfm(), slug, math(), breaks()] });
  const cases = [
    "# 旧文章\n\n普通 **加粗**、*斜体*、~~删除~~ 和 `代码`。\n换行",
    "- [x] 完成\n- [ ] 待办\n\n| 列一 | 列二 |\n| --- | --- |\n| A | B |",
    "> 普通引文\n> 第二行\n\n---\n\n[链接](https://example.com)\n\n![图片](https://example.com/a.png)",
    "注释[^1]\n\n[^1]: 脚注内容\n\n公式 $x^2$\n\n$$\nx^2+y^2=z^2\n$$",
    "```mermaid\ngraph LR\nA-->B\n```\n\n```javascript\nconst x = 1;\n```",
  ];
  for (const source of cases) {
    assert.equal(render(source), original.processSync(source).toString());
  }
});
