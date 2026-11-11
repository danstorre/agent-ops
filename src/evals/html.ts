// A small, readable HTML page for eval reports: light and dark themes, colored results.
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
:root{--bg:#fafaf9;--card:#fff;--ink:#1c1917;--muted:#78716c;--line:#e7e5e4;--ok:#15803d;--okbg:#dcfce7;--warn:#a16207;--warnbg:#fef9c3;--bad:#b91c1c;--badbg:#fee2e2;--na:#57534e;--nabg:#f5f5f4;--code:#f5f5f4}
@media (prefers-color-scheme:dark){:root{--bg:#1c1917;--card:#292524;--ink:#f5f5f4;--muted:#a8a29e;--line:#44403c;--ok:#86efac;--okbg:#14532d;--warn:#fde68a;--warnbg:#713f12;--bad:#fca5a5;--badbg:#7f1d1d;--na:#d6d3d1;--nabg:#44403c;--code:#1c1917}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:32px 20px}
main{max-width:880px;margin:0 auto}h1{font-size:26px;margin:0 0 6px}h2{font-size:18px;margin:32px 0 12px}.lead{color:var(--muted);margin:0 0 24px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.stat b{display:block;font-size:26px}.stat span{color:var(--muted);font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:10px 0}
.q{font-weight:600}.meta{color:var(--muted);font-size:13px}.badge{display:inline-block;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:600;margin-right:6px}
.ok{background:var(--okbg);color:var(--ok)}.warn{background:var(--warnbg);color:var(--warn)}.bad{background:var(--badbg);color:var(--bad)}.na{background:var(--nabg);color:var(--na)}
ol{margin:8px 0 0;padding-left:22px}li.hit{font-weight:600}code,pre{background:var(--code);border-radius:6px;font-size:13px}code{padding:1px 5px}
pre{padding:10px 12px;white-space:pre-wrap;margin:6px 0}.step{margin:8px 0}.who{font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--muted)}
details summary{cursor:pointer;color:var(--muted);font-size:13px}
</style></head><body><main>${body}</main></body></html>`;
}
