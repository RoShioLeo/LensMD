import type { BytemdPlugin, ViewerProps } from "bytemd";
import type { Root as MarkdownRoot } from "mdast";
import type { Element, ElementContent, Root as HtmlRoot } from "hast";
import { visit } from "unist-util-visit";
import { remarkHighlightMark } from "remark-highlight-mark";
import { supersub } from "micromark-extension-lemmy-supersub";
import { supersubFromMarkdown } from "mdast-util-lemmy-supersub";

type Processor = Parameters<NonNullable<BytemdPlugin["remark"]>>[0];

function remarkSupersub(this: Processor) {
  const data = this.data() as {
    micromarkExtensions?: unknown[];
    fromMarkdownExtensions?: unknown[];
  };
  // GFM must get the first attempt at double tildes (~~strikethrough~~).
  (data.micromarkExtensions ??= []).unshift(supersub);
  (data.fromMarkdownExtensions ??= []).push(supersubFromMarkdown());
}

function remarkExtendedNodes() {
  return (tree: MarkdownRoot, file: { value: unknown }) => {
    visit(tree, "highlight", (node) => {
      node.data = {
        ...node.data,
        hName: "mark",
        hProperties: { className: ["lensmd-highlight"] },
      };
    });

    visit(tree, "blockquote", (node) => {
      const paragraph = node.children[0];
      if (paragraph?.type !== "paragraph") return;
      const first = paragraph.children[0];
      if (first?.type !== "text") return;

      // Check the original source as well: an escaped marker is ordinary text.
      const offset = first.position?.start.offset;
      if (offset === undefined) return;
      const source = String(file.value).slice(offset);
      const marker =
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n|$)/i;
      const match = source.match(marker);
      const textMatch = first.value.match(marker);
      if (!match || !textMatch) return;

      const kind = match[1].toLowerCase();
      first.value = first.value.slice(textMatch[0].length);
      if (!first.value) {
        paragraph.children.shift();
        if (paragraph.children[0]?.type === "break") paragraph.children.shift();
      }
      if (!paragraph.children.length) node.children.shift();

      node.data = {
        ...node.data,
        hName: "div",
        hProperties: {
          className: ["lensmd-alert", `lensmd-alert-${kind}`],
        },
      };
      node.children.unshift({
        type: "paragraph",
        data: { hProperties: { className: ["lensmd-alert-title"] } },
        children: [
          { type: "text", value: kind.charAt(0).toUpperCase() + kind.slice(1) },
        ],
      });
    });
  };
}

function element(
  tagName: string,
  children: ElementContent[],
  properties: Element["properties"] = {}
): Element {
  return { type: "element", tagName, properties, children };
}

function textContent(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element") return "";
  if (node.tagName === "img") return String(node.properties?.alt ?? "");
  return node.children.map(textContent).join("");
}

// Run after the existing slug plugin so links use the actual heading IDs,
// including custom {#id} values and repeated headings.
function rehypeTableOfContents() {
  return (tree: HtmlRoot, file: { value: unknown }) => {
    const list = element("ul", []);
    const stack = [{ depth: 0, list }];
    for (const heading of tree.children) {
      if (heading.type !== "element" || !/^h[1-6]$/.test(heading.tagName)) {
        continue;
      }
      const id = heading.properties?.id;
      if (typeof id !== "string") continue;
      const depth = Number(heading.tagName.slice(1));
      while (stack.length > 1 && stack.at(-1)!.depth >= depth) stack.pop();
      const parent = stack.at(-1)!;
      const item = element("li", [
        element("a", [{ type: "text", value: textContent(heading) }], {
          href: `#${encodeURIComponent(id)}`,
        }),
      ]);
      parent.list.children.push(item);
      const nested = element("ul", []);
      item.children.push(nested);
      stack.push({ depth, list: nested });
    }

    visit(list, "element", (node) => {
      node.children = node.children.filter(
        (child) =>
          child.type !== "element" ||
          child.tagName !== "ul" ||
          child.children.length > 0
      );
    });

    tree.children = tree.children.map((node) => {
      if (
        node.type !== "element" ||
        node.tagName !== "p" ||
        node.children.length !== 1 ||
        node.children[0].type !== "text" ||
        !/^\[toc\]$/i.test(node.children[0].value.trim())
      ) {
        return node;
      }
      const { start, end } = node.position ?? {};
      if (start?.offset === undefined || end?.offset === undefined) return node;
      const raw = String(file.value).slice(start.offset, end.offset).trim();
      if (!/^\[toc\]$/i.test(raw)) return node;
      return element("nav", [structuredClone(list)], {
        className: ["markdown-toc"],
        ariaLabel: "文章目录",
      });
    });
  };
}

export function markdownExtensionsPlugin(): BytemdPlugin {
  return {
    remark: (processor) =>
      processor
        .use(remarkHighlightMark)
        .use(remarkSupersub)
        .use(remarkExtendedNodes),
    rehype: (processor) => processor.use(rehypeTableOfContents),
  };
}

export const sanitizeMarkdownExtensions: NonNullable<
  ViewerProps["sanitize"]
> = (schema) => ({ ...schema, tagNames: [...(schema.tagNames ?? []), "mark"] });
