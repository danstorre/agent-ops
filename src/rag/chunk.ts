// A chunk is one section of a policy document, small enough to be found and cited on its own.
export interface Chunk {
  doc: string;
  index: number;
  heading: string;
  text: string;
}

// Splits a markdown document at its "## " sections. Each chunk keeps the document title,
// so a chunk like "Costs" still says it is about shipping when it is read alone.
export function chunkMarkdown(doc: string, markdown: string): Chunk[] {
  const lines = markdown.split("\n");
  const title = lines.find((l) => l.startsWith("# "))?.slice(2).trim() ?? doc;
  const sections: Array<{ heading: string; body: string[] }> = [];
  let current: { heading: string; body: string[] } = { heading: title, body: [] };

  for (const line of lines) {
    if (line.startsWith("# ")) continue;
    if (line.startsWith("## ")) {
      sections.push(current);
      current = { heading: line.slice(3).trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push(current);

  return sections
    .map((s) => ({ heading: s.heading, body: s.body.join("\n").trim() }))
    .filter((s) => s.body.length > 0)
    .map((s, index) => ({
      doc,
      index,
      heading: s.heading,
      text: s.heading === title ? `${title}\n${s.body}` : `${title} — ${s.heading}\n${s.body}`,
    }));
}
