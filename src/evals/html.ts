// A small, readable HTML page for eval reports: light and dark themes, colored results.
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
:root{--bg:#fff;--ink:#1c1917;--muted:#78716c;--line:#e7e5e4;--code:#f5f5f4}
@media (prefers-color-scheme:dark){:root{--bg:#1c1917;--ink:#f5f5f4;--muted:#a8a29e;--line:#44403c;--code:#292524}}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:40px 20px}
main{max-width:720px;margin:0 auto}h1{font-size:24px;margin:0 0 8px}.big{font-size:20px;margin:0 0 28px}
.row{border-top:1px solid var(--line);padding:12px 0}.why{color:var(--muted);font-size:15px}
details summary{cursor:pointer}details>div{color:var(--muted);font-size:15px;margin-top:6px}
pre{background:var(--code);padding:8px 10px;border-radius:6px;white-space:pre-wrap;font-size:13px}
</style></head><body><main>${body}</main></body></html>`;
}
