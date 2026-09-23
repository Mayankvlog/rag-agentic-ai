// Retrieval engine: chunking + BM25 ranking over the user's knowledge base (client-side index).
const STOP = new Set('a an and are as at be but by for from has have he her his i if in into is it its of on or our she so that the their them then there these they this to was we were what when where which who why will with you your not no can do does did been being than too very just about also more most other some such only own same over under again further once here all any both each few how out up down off'.split(' '));

export function tokenize(text) {
  return (text.toLowerCase().normalize('NFKD').match(/[\p{L}\p{N}]+/gu) || [])
    .filter(t => t.length > 1 && !STOP.has(t))
    .map(stem);
}
function stem(w) {
  if (w.length > 5) {
    for (const s of ['ations', 'ation', 'ings', 'ing', 'edly', 'ness', 'ment', 'ies', 'ed', 'es', 'ly']) {
      if (w.endsWith(s) && w.length - s.length >= 3) return s === 'ies' ? w.slice(0, -3) + 'y' : w.slice(0, -s.length);
    }
  }
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function chunkText(text, size = 900, overlap = 150) {
  const clean = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];
  const paras = clean.split(/\n\s*\n/);
  const chunks = []; let buf = '';
  const push = () => { if (buf.trim()) chunks.push(buf.trim()); };
  for (const p of paras) {
    if ((buf + '\n\n' + p).length <= size) { buf = buf ? buf + '\n\n' + p : p; continue; }
    push();
    if (p.length <= size) { buf = (buf.slice(-overlap) ? buf.slice(-overlap) + ' ' : '') + p; if (buf.length > size) buf = p; continue; }
    // split long paragraph by sentences
    const sents = p.match(/[^.!?\n]+[.!?]*\s*/g) || [p];
    buf = '';
    for (const s of sents) {
      if ((buf + s).length > size && buf) { push(); buf = buf.slice(-overlap) + s; }
      else buf += s;
      while (buf.length > size * 1.5) { chunks.push(buf.slice(0, size)); buf = buf.slice(size - overlap); }
    }
  }
  push();
  return chunks;
}

export class Index {
  constructor() { this.chunks = []; this.df = new Map(); this.avgLen = 1; }

  build(docs) { // docs: [{id, name, text}]
    this.chunks = []; this.df = new Map();
    for (const d of docs) {
      chunkText(d.text).forEach((text, i) => {
        const toks = tokenize(d.name + ' ' + text);
        const tf = new Map();
        toks.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
        tf.forEach((_, t) => this.df.set(t, (this.df.get(t) || 0) + 1));
        this.chunks.push({ docId: d.id, docName: d.name, idx: i, text, tf, len: toks.length });
      });
    }
    this.avgLen = this.chunks.reduce((a, c) => a + c.len, 0) / (this.chunks.length || 1);
    return this;
  }

  search(query, k = 6, docIds = null) {
    const q = [...new Set(tokenize(query))];
    if (!q.length || !this.chunks.length) return [];
    const N = this.chunks.length, k1 = 1.4, b = 0.75;
    const scored = [];
    for (const c of this.chunks) {
      if (docIds && !docIds.includes(c.docId)) continue;
      let s = 0, hits = 0;
      for (const t of q) {
        const f = c.tf.get(t); if (!f) continue;
        hits++;
        const df = this.df.get(t) || 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * c.len / this.avgLen));
      }
      if (s > 0) scored.push({ ...c, score: s * (1 + 0.15 * (hits - 1)) });
    }
    scored.sort((a, b) => b.score - a.score);
    // diversify: at most 3 chunks per document
    const per = {}, out = [];
    for (const c of scored) {
      per[c.docId] = (per[c.docId] || 0) + 1;
      if (per[c.docId] <= 3) out.push(c);
      if (out.length >= k) break;
    }
    const max = out[0]?.score || 1;
    return out.map(c => ({ docId: c.docId, docName: c.docName, idx: c.idx, text: c.text, score: +(c.score / max).toFixed(3) }));
  }

  get size() { return this.chunks.length; }
}

// ---------- File text extraction ----------
let pdfjs;
async function loadPdf() {
  if (!pdfjs) {
    pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
  }
  return pdfjs;
}

export async function extractText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const lib = await loadPdf();
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      pages.push(tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
    }
    return pages.join('\n\n');
  }
  const raw = await file.text();
  if (name.endsWith('.html') || name.endsWith('.htm')) return htmlToText(raw);
  if (name.endsWith('.json')) { try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; } }
  return raw;
}

export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript,svg,nav,footer,iframe').forEach(n => n.remove());
  const title = doc.title ? doc.title + '\n\n' : '';
  const text = (doc.body?.innerText || doc.body?.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*/g, '\n\n');
  return (title + text).trim();
}

export async function fetchUrlText(url) {
  let res;
  try {
    if (puter.net?.fetch) res = await puter.net.fetch(url);
  } catch {}
  if (!res) {
    try { res = await fetch(url); } catch {}
  }
  if (!res) res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
  if (!res.ok) throw new Error('Could not fetch URL (' + res.status + ')');
  const body = await res.text();
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('html') || /<html/i.test(body.slice(0, 500))) return htmlToText(body);
  return body;
}
