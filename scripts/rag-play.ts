// Try retrieval by hand: npm run rag -- "how much does delivery cost?"
// Shows each RAG step: question -> numbers -> nearest pieces -> the text Claude would read.
import { localEmbedder } from "../src/rag/embed.js";
import { createStore } from "../src/rag/store.js";
import { loadPolicyChunks, citation } from "../src/tools/policies.js";

const question = process.argv.slice(2).join(" ").trim() || "how much does delivery cost?";
const embed = localEmbedder();
const chunks = loadPolicyChunks();
const store = await createStore(embed);
await store.add(chunks);

const [numbers] = await embed([question]);
console.log(`\nQuestion: "${question}"\n`);
console.log(`STEP 1. The small model turns the question into ${numbers!.length} numbers:`);
console.log(`        ${numbers!.slice(0, 6).map((x) => x.toFixed(3)).join(", ")}, ...\n`);
console.log(`STEP 2. The database compares them with the numbers of the ${chunks.length} stored pieces.`);
console.log(`        Smaller distance = closer meaning. The 3 closest:`);
const results = await store.search(question, 3);
for (const r of results) console.log(`        ${citation(r.doc, r.index).padEnd(30)} ${r.heading.padEnd(16)} distance ${r.distance.toFixed(2)}`);
console.log(`\nSTEP 3. This TEXT is what Claude would receive to write its answer (no numbers):\n`);
for (const r of results) console.log(`${citation(r.doc, r.index)}\n${r.text}\n`);
await store.close();
