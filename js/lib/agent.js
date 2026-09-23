// Agentic RAG loop: the model plans, calls tools (retrieval, reading, math, web, memory), then answers with citations.
import { fetchUrlText } from './rag.js';
import { errMsg } from './storage.js';

const DEFAULT_MODEL = 'gpt-4o-mini';

const AI_TIMEOUT = 90000;

function withTimeout(promise, ms, label) {
  let t;
  return Promise.race([
    promise.finally(() => clearTimeout(t)),
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error(label + ' timed out. Please try again.')), ms); }),
  ]);
}

async function callOnce(messages, opts) {
  if (typeof puter === 'undefined' || !puter.ai) throw new Error('Puter AI is not loaded. Check your internet connection and reload.');
  if (!puter.auth.isSignedIn()) throw new Error('You are signed out. Please log in again.');
  const r = await withTimeout(puter.ai.chat(messages, opts), AI_TIMEOUT, 'AI request');
  if (!r) throw new Error('Empty response from AI');
  if (r.success === false) throw r;
  return r;
}

// Call Puter AI; on failure retry with the default model, then with Puter's own default model.
export async function aiChat(messages, opts = {}) {
  const attempts = [opts];
  if (opts.model !== DEFAULT_MODEL) attempts.push({ ...opts, model: DEFAULT_MODEL });
  const { model, ...noModel } = opts;
  attempts.push(noModel);
  let lastErr;
  for (const a of attempts) {
    try { return await callOnce(messages, a); }
    catch (e) {
      lastErr = e;
      const m = errMsg(e).toLowerCase();
      if (m.includes('signed out') || m.includes('not loaded') || m.includes('insufficient') || m.includes('funds') || m.includes('usage limit')) break;
    }
  }
  throw new Error(errMsg(lastErr));
}

export const MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', note: 'Fast' },
  { id: 'gpt-4.1', label: 'GPT-4.1', note: 'Balanced' },
  { id: 'gpt-4o', label: 'GPT-4o', note: 'Capable' },
  { id: 'claude-sonnet-4', label: 'Claude Sonnet 4', note: 'Reasoning (auto-fallback)' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', note: 'Fast (auto-fallback)' },
];

export const TASKS = [
  { id: 'qa', label: 'Research Q&A', icon: 'MessageSquareText', desc: 'Grounded answers with citations',
    prompt: 'Answer the user\'s question accurately using the knowledge base. Search thoroughly (use multiple queries with different phrasings if the first is weak).',
    starters: ['What are the key points across my documents?', 'Find everything about pricing or costs', 'What risks or open questions are mentioned?'] },
  { id: 'summarize', label: 'Summarize', icon: 'ListCollapse', desc: 'Executive summaries & briefs',
    prompt: 'Produce a well-structured summary: a one-line TL;DR, then key points as bullets, then notable details. Read documents fully with read_document when summarizing a whole document.',
    starters: ['Summarize all my documents in one brief', 'Give me a TL;DR of the most recent document', 'Summarize the main decisions and action items'] },
  { id: 'compare', label: 'Compare', icon: 'Columns2', desc: 'Side-by-side analysis',
    prompt: 'Compare and contrast the relevant items. Search for each item separately. Present a markdown comparison table first, then a short analysis and recommendation.',
    starters: ['Compare the documents in a table', 'What do the sources agree and disagree on?', 'Compare options and recommend one'] },
  { id: 'extract', label: 'Extract data', icon: 'Table2', desc: 'Pull entities, facts & tables',
    prompt: 'Extract structured information (names, dates, numbers, entities, requirements) from the knowledge base. Output as clean markdown tables or JSON code blocks as appropriate. Be exhaustive and precise.',
    starters: ['Extract all dates and deadlines as a table', 'List every person and organization mentioned', 'Pull all numbers and metrics into JSON'] },
  { id: 'write', label: 'Draft & write', icon: 'PenLine', desc: 'Emails, reports, posts',
    prompt: 'Write polished content (emails, reports, posts, proposals) grounded in facts from the knowledge base. Match the requested tone. Put the draft first; keep commentary minimal.',
    starters: ['Draft an email summarizing the key findings', 'Write a one-page report from my notes', 'Turn my documents into a blog post outline'] },
  { id: 'study', label: 'Study & quiz', icon: 'GraduationCap', desc: 'Flashcards, quizzes, explanations',
    prompt: 'Act as a tutor. Create quizzes, flashcards, or simple explanations based on the knowledge base. For quizzes, give questions first and an answer key at the end.',
    starters: ['Make a 5-question quiz from my documents', 'Create flashcards for the key concepts', 'Explain the hardest concept simply'] },
  { id: 'code', label: 'Code assist', icon: 'Code2', desc: 'Explain & generate code',
    prompt: 'Help with code. Use documentation in the knowledge base when relevant. Provide complete, runnable code in fenced blocks with the language specified, followed by a brief explanation.',
    starters: ['Explain the code in my documents', 'Write an Express + MongoDB CRUD API', 'Find bugs or improvements in my code'] },
  { id: 'lyrics', label: 'Lyrics', icon: 'Music4', desc: 'Songs in 90 languages',
    prompt: 'You are a professional songwriter. Write original, singable lyrics with labeled sections ([Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro] as they fit), a consistent meter, vivid imagery, and a clear rhyme scheme matching the requested genre, mood and culture. If a target language is given in the instructions, write every word in that language using its native script and natural idiom — localize the rhyme and wordplay instead of translating literally.',
    starters: ['Write a Punjabi pop love song about missing someone', 'Compose a motivational hip-hop anthem about never giving up', 'Write a melancholic acoustic ballad set during monsoon rains'] },
];

// Lyrics generator languages: 90 total = 12 Indian (highlighted first) + 78 world (alphabetical).
export const LYRICS_LANGUAGES = [
  { id: 'auto', label: 'Auto-detect', note: 'From your message', icon: 'Languages' },
  { id: 'Hindi', label: 'Hindi', note: 'हिन्दी · Indian' },
  { id: 'Bengali', label: 'Bengali', note: 'বাংলা · Indian' },
  { id: 'Telugu', label: 'Telugu', note: 'తెలుగు · Indian' },
  { id: 'Marathi', label: 'Marathi', note: 'मराठी · Indian' },
  { id: 'Tamil', label: 'Tamil', note: 'தமிழ் · Indian' },
  { id: 'Gujarati', label: 'Gujarati', note: 'ગુજરાતી · Indian' },
  { id: 'Kannada', label: 'Kannada', note: 'ಕನ್ನಡ · Indian' },
  { id: 'Malayalam', label: 'Malayalam', note: 'മലയാളം · Indian' },
  { id: 'Odia', label: 'Odia', note: 'ଓଡ଼ିଆ · Indian' },
  { id: 'Punjabi', label: 'Punjabi', note: 'ਪੰਜਾਬੀ · Indian' },
  { id: 'Assamese', label: 'Assamese', note: 'অসমীয়া · Indian' },
  { id: 'Urdu', label: 'Urdu', note: 'اردو · Indian' },
  { id: 'Afrikaans', label: 'Afrikaans', note: 'Africa' },
  { id: 'Albanian', label: 'Albanian', note: 'Europe' },
  { id: 'Amharic', label: 'Amharic', note: 'Africa' },
  { id: 'Arabic', label: 'Arabic', note: 'Middle East' },
  { id: 'Armenian', label: 'Armenian', note: 'Caucasus' },
  { id: 'Azerbaijani', label: 'Azerbaijani', note: 'Caucasus' },
  { id: 'Basque', label: 'Basque', note: 'Europe' },
  { id: 'Belarusian', label: 'Belarusian', note: 'Europe' },
  { id: 'Bosnian', label: 'Bosnian', note: 'Europe' },
  { id: 'Bulgarian', label: 'Bulgarian', note: 'Europe' },
  { id: 'Burmese', label: 'Burmese', note: 'Southeast Asia' },
  { id: 'Catalan', label: 'Catalan', note: 'Europe' },
  { id: 'Cebuano', label: 'Cebuano', note: 'Southeast Asia' },
  { id: 'Chinese (Mandarin)', label: 'Chinese (Mandarin)', note: 'East Asia' },
  { id: 'Croatian', label: 'Croatian', note: 'Europe' },
  { id: 'Czech', label: 'Czech', note: 'Europe' },
  { id: 'Danish', label: 'Danish', note: 'Europe' },
  { id: 'Dhivehi', label: 'Dhivehi', note: 'South Asia' },
  { id: 'Dutch', label: 'Dutch', note: 'Europe' },
  { id: 'English', label: 'English', note: 'Europe' },
  { id: 'Estonian', label: 'Estonian', note: 'Europe' },
  { id: 'Filipino (Tagalog)', label: 'Filipino (Tagalog)', note: 'Southeast Asia' },
  { id: 'Finnish', label: 'Finnish', note: 'Europe' },
  { id: 'French', label: 'French', note: 'Europe' },
  { id: 'Galician', label: 'Galician', note: 'Europe' },
  { id: 'Georgian', label: 'Georgian', note: 'Caucasus' },
  { id: 'German', label: 'German', note: 'Europe' },
  { id: 'Greek', label: 'Greek', note: 'Europe' },
  { id: 'Hausa', label: 'Hausa', note: 'Africa' },
  { id: 'Hebrew', label: 'Hebrew', note: 'Middle East' },
  { id: 'Hungarian', label: 'Hungarian', note: 'Europe' },
  { id: 'Icelandic', label: 'Icelandic', note: 'Europe' },
  { id: 'Igbo', label: 'Igbo', note: 'Africa' },
  { id: 'Indonesian', label: 'Indonesian', note: 'Southeast Asia' },
  { id: 'Irish', label: 'Irish', note: 'Europe' },
  { id: 'Italian', label: 'Italian', note: 'Europe' },
  { id: 'Japanese', label: 'Japanese', note: 'East Asia' },
  { id: 'Javanese', label: 'Javanese', note: 'Southeast Asia' },
  { id: 'Kazakh', label: 'Kazakh', note: 'Central Asia' },
  { id: 'Khmer', label: 'Khmer', note: 'Southeast Asia' },
  { id: 'Korean', label: 'Korean', note: 'East Asia' },
  { id: 'Kyrgyz', label: 'Kyrgyz', note: 'Central Asia' },
  { id: 'Lao', label: 'Lao', note: 'Southeast Asia' },
  { id: 'Latin', label: 'Latin', note: 'Europe' },
  { id: 'Latvian', label: 'Latvian', note: 'Europe' },
  { id: 'Lithuanian', label: 'Lithuanian', note: 'Europe' },
  { id: 'Luxembourgish', label: 'Luxembourgish', note: 'Europe' },
  { id: 'Macedonian', label: 'Macedonian', note: 'Europe' },
  { id: 'Malay', label: 'Malay', note: 'Southeast Asia' },
  { id: 'Maltese', label: 'Maltese', note: 'Europe' },
  { id: 'Montenegrin', label: 'Montenegrin', note: 'Europe' },
  { id: 'Mongolian', label: 'Mongolian', note: 'East Asia' },
  { id: 'Nepali', label: 'Nepali', note: 'South Asia' },
  { id: 'Norwegian', label: 'Norwegian', note: 'Europe' },
  { id: 'Persian (Farsi)', label: 'Persian (Farsi)', note: 'Middle East' },
  { id: 'Polish', label: 'Polish', note: 'Europe' },
  { id: 'Portuguese', label: 'Portuguese', note: 'Europe' },
  { id: 'Romanian', label: 'Romanian', note: 'Europe' },
  { id: 'Russian', label: 'Russian', note: 'Europe' },
  { id: 'Serbian', label: 'Serbian', note: 'Europe' },
  { id: 'Sinhala', label: 'Sinhala', note: 'South Asia' },
  { id: 'Slovak', label: 'Slovak', note: 'Europe' },
  { id: 'Slovenian', label: 'Slovenian', note: 'Europe' },
  { id: 'Somali', label: 'Somali', note: 'Africa' },
  { id: 'Spanish', label: 'Spanish', note: 'Europe' },
  { id: 'Swahili', label: 'Swahili', note: 'Africa' },
  { id: 'Swedish', label: 'Swedish', note: 'Europe' },
  { id: 'Tajik', label: 'Tajik', note: 'Central Asia' },
  { id: 'Thai', label: 'Thai', note: 'Southeast Asia' },
  { id: 'Turkish', label: 'Turkish', note: 'Middle East' },
  { id: 'Ukrainian', label: 'Ukrainian', note: 'Europe' },
  { id: 'Uzbek', label: 'Uzbek', note: 'Central Asia' },
  { id: 'Vietnamese', label: 'Vietnamese', note: 'Southeast Asia' },
  { id: 'Welsh', label: 'Welsh', note: 'Europe' },
  { id: 'Xhosa', label: 'Xhosa', note: 'Africa' },
  { id: 'Yiddish', label: 'Yiddish', note: 'Europe' },
  { id: 'Yoruba', label: 'Yoruba', note: 'Africa' },
  { id: 'Zulu', label: 'Zulu', note: 'Africa' },
];

const TOOLS = [
  { type: 'function', function: { name: 'search_knowledge_base', description: 'Semantic keyword search over the user\'s uploaded documents. Returns numbered source passages to cite as [n]. Call multiple times with different queries for complex questions.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Focused search query' }, top_k: { type: 'integer', description: 'Number of passages (1-10)', default: 6 } }, required: ['query'] } } },
  { type: 'function', function: { name: 'list_documents', description: 'List all documents in the knowledge base with names, sizes and dates.',
    parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'read_document', description: 'Read the full text of one document (paginated). Use for summarizing or when search passages are insufficient.',
    parameters: { type: 'object', properties: { name: { type: 'string', description: 'Document name (or part of it)' }, page: { type: 'integer', description: '1-based page, each ~6000 chars', default: 1 } }, required: ['name'] } } },
  { type: 'function', function: { name: 'calculator', description: 'Evaluate a math expression precisely. Supports + - * / ^ % parentheses and Math functions (sqrt, log, round, etc).',
    parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] } } },
  { type: 'function', function: { name: 'fetch_webpage', description: 'Fetch and read the text of a public web page URL.',
    parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'save_note', description: 'Save a note or generated artifact into the knowledge base for future retrieval (long-term memory). Only use when the user asks to save/remember something.',
    parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] } } },
  { type: 'function', function: { name: 'get_current_datetime', description: 'Get the current date, time and timezone.',
    parameters: { type: 'object', properties: {} } } },
];

function calc(expr) {
  const e = String(expr).replace(/\^/g, '**').replace(/×/g, '*').replace(/÷/g, '/');
  const words = e.match(/[a-zA-Z_]+/g) || [];
  const allowed = new Set(Object.getOwnPropertyNames(Math));
  for (const w of words) if (!allowed.has(w)) throw new Error('Unsupported token: ' + w);
  if (!/^[\d\s+\-*/().,%a-zA-Z_]*$/.test(e)) throw new Error('Invalid characters in expression');
  // eslint-disable-next-line no-new-func
  const r = Function('with(Math){return (' + e + ')}')();
  if (typeof r !== 'number' || !isFinite(r)) throw new Error('Result is not a finite number');
  return +r.toPrecision(15);
}

export function textOf(msg) {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  const c = msg.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(p => (typeof p === 'string' ? p : p.text || '')).join('');
  return '';
}

/**
 * Run the agent.
 * ctx: { index, docs, readDoc(id), saveNote(title, content), topK, model, task, history, question, useKB, onStep(step), signal }
 */
export async function runAgent(ctx) {
  const task = TASKS.find(t => t.id === ctx.task) || TASKS[0];
  const sources = []; // registry for citations
  const steps = [];
  const emit = (s) => { steps.push(s); ctx.onStep?.([...steps]); return s; };
  const update = (s, patch) => { Object.assign(s, patch); ctx.onStep?.([...steps]); };

  const langLine = task.id === 'lyrics' && ctx.lang && ctx.lang !== 'auto'
    ? `\nTarget language: ${ctx.lang}. Write the entire song in ${ctx.lang}.`
    : '';

  const docList = ctx.docs.map(d => `- ${d.name}`).join('\n') || '(empty)';
  const system = `You are Nexus, an autonomous agentic RAG assistant. Current task mode: ${task.label}.
${task.prompt}${langLine}

Knowledge base (${ctx.docs.length} documents):
${docList}

Operating rules:
- Plan briefly, then use tools. ${ctx.useKB && ctx.docs.length ? 'For any question that could relate to the documents, ALWAYS call search_knowledge_base first.' : 'The knowledge base is ' + (ctx.docs.length ? 'disabled for this message' : 'empty') + '; answer from general knowledge and tools.'}
- Cite facts from sources inline using their number in square brackets, e.g. [1] or [2][3]. Only cite numbers returned by tools.
- If the knowledge base lacks the answer, say so clearly, then answer from general knowledge labeled as such.
- Use the calculator for any non-trivial arithmetic.
- Format responses in clean Markdown. Be concise but complete.`;

  const history = (ctx.history || []).slice(-10)
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));
  const messages = [{ role: 'system', content: system }, ...history, { role: 'user', content: ctx.question }];

  const tools = ctx.useKB && ctx.docs.length ? TOOLS : TOOLS.filter(t => !['search_knowledge_base', 'read_document', 'list_documents'].includes(t.function.name));

  async function execTool(name, args) {
    switch (name) {
      case 'search_knowledge_base': {
        const k = Math.min(Math.max(parseInt(args.top_k) || ctx.topK || 6, 1), 10);
        const hits = ctx.index.search(args.query || '', k);
        if (!hits.length) return { text: 'No matching passages found. Try different keywords or read_document.', count: 0 };
        const lines = hits.map(h => {
          let n = sources.findIndex(s => s.docId === h.docId && s.idx === h.idx) + 1;
          if (!n) { sources.push(h); n = sources.length; }
          return `[${n}] (${h.docName}, relevance ${h.score})\n${h.text}`;
        });
        return { text: lines.join('\n\n---\n\n'), count: hits.length };
      }
      case 'list_documents':
        return { text: ctx.docs.map(d => `- ${d.name} · ${d.chars.toLocaleString()} chars · added ${new Date(d.createdAt).toLocaleDateString()}`).join('\n') || 'No documents.', count: ctx.docs.length };
      case 'read_document': {
        const q = String(args.name || '').toLowerCase();
        const d = ctx.docs.find(x => x.name.toLowerCase() === q) || ctx.docs.find(x => x.name.toLowerCase().includes(q)) || ctx.docs.find(x => q.includes(x.name.toLowerCase().replace(/\.[a-z0-9]+$/, '')));
        if (!d) return { text: 'Document not found. Available: ' + ctx.docs.map(x => x.name).join(', ') };
        const full = await ctx.readDoc(d.id);
        const size = 6000, pages = Math.max(1, Math.ceil(full.length / size));
        const p = Math.min(Math.max(parseInt(args.page) || 1, 1), pages);
        const text = full.slice((p - 1) * size, p * size);
        let n = sources.findIndex(s => s.docId === d.id && s.idx === -p) + 1;
        if (!n) { sources.push({ docId: d.id, docName: d.name, idx: -p, text, score: 1 }); n = sources.length; }
        return { text: `[${n}] ${d.name} — page ${p} of ${pages}\n\n${text}`, count: 1 };
      }
      case 'calculator':
        return { text: String(calc(args.expression)) };
      case 'fetch_webpage': {
        const t = await fetchUrlText(args.url);
        const text = t.slice(0, 8000);
        sources.push({ docId: 'web', docName: args.url, idx: 0, text, score: 1, url: args.url });
        return { text: `[${sources.length}] ${args.url}\n\n${text}` };
      }
      case 'save_note': {
        await ctx.saveNote(args.title, args.content);
        return { text: `Saved "${args.title}" to the knowledge base.` };
      }
      case 'get_current_datetime':
        return { text: new Date().toString() + ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')' };
      default:
        return { text: 'Unknown tool' };
    }
  }

  const MAX_ITERS = 6;
  for (let i = 0; i < MAX_ITERS; i++) {
    if (ctx.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const thinking = emit({ type: 'think', label: i === 0 ? 'Planning approach' : 'Reasoning over results', status: 'running' });
    let res;
    try {
      const opts = { model: ctx.model };
      if (i < MAX_ITERS - 1) opts.tools = tools;
      res = await aiChat(messages, opts);
    } catch (err) {
      console.warn('Agent tool loop failed, falling back', err);
      update(thinking, { status: 'done', label: 'Switching to direct retrieval' });
      return fallback();
    }
    if (ctx.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    update(thinking, { status: 'done' });
    const msg = res?.message || res;
    const calls = (msg?.tool_calls || []).filter(c => c?.function?.name);
    if (!calls.length) {
      let content = textOf(msg);
      if (!content && res && typeof res.toString === 'function') {
        const s = String(res);
        if (s && s !== '[object Object]') content = s;
      }
      if (!content) return fallback();
      return { content, sources, steps };
    }
    calls.forEach((c, k) => { if (!c.id) c.id = 'call_' + i + '_' + k; if (!c.type) c.type = 'function'; });
    messages.push({ role: 'assistant', content: textOf(msg) || '', tool_calls: calls });
    for (const call of calls) {
      const name = call.function?.name;
      let args = {};
      try { args = typeof call.function?.arguments === 'string' ? JSON.parse(call.function.arguments || '{}') : (call.function?.arguments || {}); } catch {}
      const step = emit({ type: 'tool', tool: name, args, status: 'running' });
      let out;
      try { out = await execTool(name, args); update(step, { status: 'done', result: out.text, count: out.count }); }
      catch (e) { out = { text: 'Error: ' + (e.message || e) }; update(step, { status: 'error', result: out.text }); }
      messages.push({ role: 'tool', tool_call_id: call.id, content: String(out.text || '').slice(0, 12000) });
    }
  }
  return { content: 'I reached my reasoning step limit. Please try a more specific request.', sources, steps };

  // Classic RAG fallback when the model does not support tools
  async function fallback() {
    let context = '';
    if (ctx.useKB && ctx.docs.length) {
      const s = emit({ type: 'tool', tool: 'search_knowledge_base', args: { query: ctx.question }, status: 'running' });
      const r = await execTool('search_knowledge_base', { query: ctx.question, top_k: ctx.topK });
      update(s, { status: 'done', result: r.text, count: r.count });
      context = r.text;
    }
    const t = emit({ type: 'think', label: 'Composing answer', status: 'running' });
    const sys = system.replace(/Operating rules:[\s\S]*/, 'Answer using the provided sources when relevant and cite them inline like [1]. Format in clean Markdown.');
    try {
      const res = await aiChat([
        { role: 'system', content: sys },
        ...history,
        { role: 'user', content: context ? `Sources:\n${context.slice(0, 14000)}\n\nTask: ${ctx.question}` : ctx.question },
      ], { model: ctx.model });
      update(t, { status: 'done' });
      const content = textOf(res?.message) || textOf(res) || String(res);
      return { content, sources, steps };
    } catch (e) {
      update(t, { status: 'error', result: errMsg(e) });
      throw new Error('AI request failed: ' + errMsg(e));
    }
  }
}

export async function generateTitle(question, model) {
  try {
    const r = await aiChat(`Write a short 3-6 word title for a conversation starting with: "${question.slice(0, 300)}". Reply with the title only, no quotes.`, { model: DEFAULT_MODEL });
    return (textOf(r?.message) || textOf(r) || question.slice(0, 40)).replace(/["'*#]/g, '').trim().slice(0, 60) || question.slice(0, 40);
  } catch { return question.slice(0, 40); }
}
