// Persistence layer — Puter cloud KV. All data is private to the signed-in user.
// Document bodies are split into parts to stay well under the KV value size limit.
const P = 'nexus:';
const PART = 60000; // chars per KV entry

function errMsg(e) {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  return e.message || e.error?.message || (typeof e.error === 'string' ? e.error : '') || JSON.stringify(e);
}

async function kvGet(key, fallback) {
  try {
    const v = await puter.kv.get(P + key);
    if (v === null || v === undefined) return fallback;
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return v; }
  } catch (e) {
    console.warn('KV get failed', key, e);
    return fallback;
  }
}
async function kvSet(key, value) {
  try { return await puter.kv.set(P + key, JSON.stringify(value)); }
  catch (e) { throw new Error('Could not save to cloud: ' + errMsg(e)); }
}
async function kvDel(key) { try { await puter.kv.del(P + key); } catch {} }

// ---------- Documents ----------
export const Docs = {
  async list() { const v = await kvGet('docs', []); return Array.isArray(v) ? v : []; },
  async saveIndex(list) { return kvSet('docs', list); },
  async readText(id) {
    const meta = await kvGet('doc:' + id + ':meta', null);
    if (meta && meta.parts) {
      const parts = await Promise.all(Array.from({ length: meta.parts }, (_, i) => kvGet(`doc:${id}:${i}`, '')));
      return parts.join('');
    }
    // legacy: file storage
    try {
      const blob = await puter.fs.read(`nexus/docs/${id}.txt`);
      return await blob.text();
    } catch { return ''; }
  },
  async writeText(id, text) {
    const parts = Math.max(1, Math.ceil(text.length / PART));
    for (let i = 0; i < parts; i++) await kvSet(`doc:${id}:${i}`, text.slice(i * PART, (i + 1) * PART));
    await kvSet('doc:' + id + ':meta', { parts });
  },
  async remove(id) {
    const meta = await kvGet('doc:' + id + ':meta', null);
    if (meta?.parts) for (let i = 0; i < meta.parts; i++) await kvDel(`doc:${id}:${i}`);
    await kvDel('doc:' + id + ':meta');
    try { await puter.fs.delete(`nexus/docs/${id}.txt`); } catch {}
  },
};

// ---------- Conversations ----------
export const Chats = {
  async list() { const v = await kvGet('chats', []); return Array.isArray(v) ? v : []; },
  async saveIndex(list) { return kvSet('chats', list); },
  async load(id) { const v = await kvGet('chat:' + id, []); return Array.isArray(v) ? v : []; },
  async save(id, messages) {
    const slim = messages.map(m => ({
      id: m.id, role: m.role, content: m.content, task: m.task, lang: m.lang, model: m.model, ms: m.ms, error: m.error,
      sources: m.sources?.map(s => ({ docId: s.docId, docName: s.docName, idx: s.idx, score: s.score, url: s.url, text: s.text?.slice(0, 800) })),
      steps: m.steps?.map(s => ({ type: s.type, tool: s.tool, label: s.label, args: s.args, status: s.status, count: s.count })),
    }));
    return kvSet('chat:' + id, slim);
  },
  async remove(id) { return kvDel('chat:' + id); },
};

// ---------- Settings ----------
export const Settings = {
  async get() { return kvGet('settings', { model: 'gpt-4o-mini' }); },
  async set(v) { const cur = await kvGet('settings', {}); const base = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}; return kvSet('settings', { ...base, ...v }); },
};

// ---------- Profile (created at sign up) ----------
export const Profile = {
  async get() { return kvGet('profile', null); },
  async set(v) { return kvSet('profile', { ...v, updatedAt: Date.now() }); },
};

export { errMsg };
