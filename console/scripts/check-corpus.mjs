import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import process from "node:process";
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

const corpus = JSON.parse(readFileSync(process.argv[2], "utf8"));
const slug = { rehype: (p) => p.use(rehypeSlug, { enableCustomId: true }) };
const old = getProcessor({ plugins: [gfm(), slug, math(), breaks()] });
const updated = getProcessor({
  plugins: [
    gfm({ singleTilde: false }),
    slug,
    markdownExtensionsPlugin(),
    gemoji(),
    math(),
    breaks(),
  ],
  sanitize: sanitizeMarkdownExtensions,
});
let changed = 0;
for (const post of corpus) {
  try {
    assert.equal(
      updated.processSync(post.raw).toString(),
      old.processSync(post.raw).toString()
    );
    process.stdout.write(`UNCHANGED ${post.title}\n`);
  } catch (error) {
    if (!(error instanceof assert.AssertionError)) throw error;
    changed += 1;
    process.stdout.write(`REVIEW_REQUIRED ${post.title}\n`);
  }
}
process.stdout.write(
  `Checked ${corpus.length} published posts; ${changed} parser differences.\n`
);
process.exitCode = changed ? 1 : 0;
