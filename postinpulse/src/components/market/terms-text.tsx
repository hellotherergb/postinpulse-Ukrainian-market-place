import { Fragment } from "react";
import { TERMS_MARKDOWN } from "@/lib/terms";

type Block =
  | { kind: "h1" | "h2" | "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "rule" };

function parse(markdown: string): Block[] {
  const blocks: Block[] = [];
  let list: string[] | null = null;
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      if (!list) blocks.push({ kind: "list", items: (list = []) });
      list.push(line.slice(2));
      continue;
    }
    list = null;
    if (!line) continue;
    if (line === "---") blocks.push({ kind: "rule" });
    else if (line.startsWith("## ")) blocks.push({ kind: "h2", text: line.slice(3) });
    else if (line.startsWith("# ")) blocks.push({ kind: "h1", text: line.slice(2) });
    else blocks.push({ kind: "p", text: line });
  }
  return blocks;
}

function Inline({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

const BLOCKS = parse(TERMS_MARKDOWN);

export function TermsText() {
  return (
    <div className="space-y-3 text-sm leading-relaxed break-words text-muted-foreground">
      {BLOCKS.map((block, i) => {
        switch (block.kind) {
          case "h1":
            return (
              <h2 key={i} className="text-xl font-extrabold tracking-tight text-foreground">
                {block.text}
              </h2>
            );
          case "h2":
            return (
              <h3 key={i} className="pt-3 text-base font-bold text-foreground">
                {block.text}
              </h3>
            );
          case "list":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "rule":
            return <hr key={i} className="my-4" />;
          default:
            return (
              <p key={i}>
                <Inline text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
