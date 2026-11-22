import type { ReactNode } from "react";
import { safeChecklistUrl } from "@/lib/pops/checklist";

/** Restrained Markdown rendering for short task guidance; never inject raw HTML. */
function inlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const token = /\[([^\]]+)\]\(([^)]+)\)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let cursor = 0;
  for (const match of text.matchAll(token)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    if (match[1] !== undefined) {
      const url = safeChecklistUrl(match[2]);
      nodes.push(url ? <a key={index} href={url} target="_blank" rel="noopener noreferrer nofollow">{inlineMarkdown(match[1])}</a> : match[0]);
    } else if (match[4] !== undefined) nodes.push(<strong key={index}>{match[4]}</strong>);
    else if (match[6] !== undefined) nodes.push(<em key={index}>{match[6]}</em>);
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function PopsRichText({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  const flush = () => {
    if (bullets.length) elements.push(<ul key={elements.length} className="pops-markdown-list">{bullets}</ul>);
    bullets = [];
  };
  lines.forEach((line, index) => {
    const match = line.match(/^\s*[-*]\s+(.+)$/);
    if (match) {
      bullets.push(<li key={index}>{inlineMarkdown(match[1])}</li>);
    } else {
      flush();
      if (line.trim()) elements.push(<p key={index}>{inlineMarkdown(line)}</p>);
    }
  });
  flush();
  return <div className="pops-richtext">{elements}</div>;
}
