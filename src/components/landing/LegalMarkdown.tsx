import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ListItem = { depth: number; ordered: boolean; text: string };

function isTableLine(line: string) {
  const t = line.trim();
  return t.startsWith("|") && t.slice(1).includes("|");
}

function parseRow(line: string) {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((cell) => cell.trim());
}

function isSeparator(cells: string[]) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isHeading(line: string) {
  return /^(#{1,6})\s+\S/.test(line.trim());
}

function isRule(line: string) {
  return /^-{3,}$/.test(line.trim());
}

function listMatch(line: string) {
  const ordered = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
  if (ordered) {
    return { depth: Math.floor(ordered[1]!.length / 4), ordered: true, text: ordered[3]! };
  }
  const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line);
  if (bullet) {
    return { depth: Math.floor(bullet[1]!.length / 4), ordered: false, text: bullet[2]! };
  }
  return null;
}

function inline(text: string, key: string): ReactNode[] {
  const pattern = /(<mark>[\s\S]*?<\/mark>|\*\*[^*]+?\*\*|https?:\/\/[^\s<]+)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const token = match[0];
    const id = `${key}-${index++}`;
    if (token.startsWith("<mark>")) {
      nodes.push(<mark key={id}>{inline(token.slice(6, -7), id)}</mark>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={id}>{inline(token.slice(2, -2), id)}</strong>);
    } else {
      nodes.push(
        <a key={id} href={token} className="break-all">
          {token}
        </a>,
      );
    }
    last = start + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderList(items: ListItem[], start: number, depth: number): [ReactNode, number] {
  const ordered = items[start]?.ordered ?? true;
  const children: ReactNode[] = [];
  let i = start;
  while (i < items.length && items[i]!.depth === depth) {
    const item = items[i]!;
    i += 1;
    let nested: ReactNode = null;
    if (i < items.length && items[i]!.depth > depth) {
      const [node, next] = renderList(items, i, items[i]!.depth);
      nested = node;
      i = next;
    }
    children.push(
      <li key={`${depth}-${i}`}>
        {inline(item.text, `li-${depth}-${i}`)}
        {nested}
      </li>,
    );
  }
  const Tag = ordered ? "ol" : "ul";
  return [<Tag key={`list-${depth}-${start}`}>{children}</Tag>, i];
}

/** Renders a legal document without dropping or rewriting its wording. */
export function LegalMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let n = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (isTableLine(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableLine(lines[i] ?? "")) {
        rows.push(parseRow(lines[i] ?? ""));
        i += 1;
      }
      const sep = rows.findIndex(isSeparator);
      const head = sep === 0 ? null : sep > 0 ? rows[0] : null;
      const body = rows.filter((row, index) => index !== sep && !(head && index === 0));
      const columns = Math.max(...rows.map((row) => row.length), 1);
      blocks.push(
        <div key={n++} className="my-6 overflow-x-auto rounded-2xl border border-border">
          <table
            className={cn(
              "w-full border-collapse text-left text-xs sm:text-sm",
              columns > 2 && "min-w-[40rem]",
            )}
          >
            {head && (
              <thead>
                <tr>
                  {head.map((cell, cellIndex) => (
                    <th key={cellIndex}>{inline(cell, `th-${n}-${cellIndex}`)}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(head ? body : rows.filter((_, index) => index !== sep)).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{inline(cell, `td-${n}-${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (isRule(line)) {
      blocks.push(<hr key={n++} />);
      i += 1;
      continue;
    }

    if (isHeading(line)) {
      const match = /^(#{1,6})\s+(.*)$/.exec(line.trim())!;
      const level = Math.min(match[1]!.length + 1, 3);
      const Tag = level === 2 ? "h2" : "h3";
      blocks.push(<Tag key={n++}>{inline(match[2]!, `h-${n}`)}</Tag>);
      i += 1;
      continue;
    }

    if (listMatch(line)) {
      const items: ListItem[] = [];
      while (i < lines.length && listMatch(lines[i] ?? "")) {
        items.push(listMatch(lines[i] ?? "")!);
        i += 1;
      }
      const [node] = renderList(items, 0, items[0]!.depth);
      blocks.push(<Fragment key={n++}>{node}</Fragment>);
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== "" &&
      !isTableLine(lines[i]!) &&
      !isRule(lines[i]!) &&
      !isHeading(lines[i]!) &&
      !listMatch(lines[i]!)
    ) {
      paragraph.push(lines[i]!);
      i += 1;
    }
    blocks.push(
      <p key={n++}>
        {paragraph.map((part, index) => (
          <Fragment key={index}>
            {index > 0 && <br />}
            {inline(part, `p-${n}-${index}`)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <article className="legal-doc space-y-4 text-sm leading-7 sm:text-[0.975rem]">{blocks}</article>;
}
