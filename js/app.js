import React from 'react';
import { createRoot } from 'react-dom/client';
import { html, uid } from './lib/html.js';
import { Icon, Button, Toasts } from './components/ui.js';
import { Sidebar } from './components/Sidebar.js';
import { KnowledgePanel, DocPreview } from './components/KnowledgePanel.js';
import { Composer, Welcome, MessageList } from './components/Chat.js';
import { Docs, Chats, Settings, Profile, errMsg } from './lib/storage.js';
import { AuthPage } from './components/Auth.js';

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (!this.state.err) return this.props.children;
    return html`<div className="h-full flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-lg font-semibold">Something went wrong</div>
        <div className="text-sm text-zinc-500 mt-1 break-words">${String(this.state.err?.message || this.state.err)}</div>
        <button onClick=${() => location.reload()} className="mt-4 h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium">Reload</button>
      </div>
    </div>`;
  }
}
import { Index, chunkText, extractText, fetchUrlText } from './lib/rag.js';
import { runAgent, generateTitle } from './lib/agent.js';
import { SAMPLES } from './lib/samples.js';

function App() {
  const [authState, setAuthState] = React.useState('checking'); // checking | out | in
  const [signingIn, setSigningIn] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState(null);

  const [docs, setDocs] = React.useState([]);
  const texts = React.useRef({});
  const [index, setIndex] = React.useState(() => new Index());
  const [chats, setChats] = React.useState([]);
  const [activeId, setActiveId] = React.useState(null);
  const [messages, setMessages] = React.useState([]);

  const [task, setTask] = React.useState('qa');
  const [model, setModelState] = React.useState('gpt-4o-mini');
  const [lang, setLangState] = React.useState('auto');
  const [useKB, setUseKB] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [kbBusy, setKbBusy] = React.useState(false);
  const abortRef = React.useRef(null);

  const [sideOpen, setSideOpen] = React.useState(false);
  const [kbOpen, setKbOpen] = React.useState(false);
  const [preview, setPreview] = React.useState(null); // {doc, text, highlight}
  const [toasts, setToasts] = React.useState([]);

  const toast = (msg, type = 'ok') => {
    const id = uid();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  };

  // ---------- Auth ----------
  React.useEffect(() => {
    (async () => {
      try {
        if (puter.auth.isSignedIn()) { setUser(await puter.auth.getUser()); setAuthState('in'); }
        else setAuthState('out');
      } catch { setAuthState('out'); }
    })();
  }, []);

  const signIn = async ({ mode, profile } = {}) => {
    setSigningIn(true);
    try {
      await puter.auth.signIn();
      if (!puter.auth.isSignedIn()) throw new Error(mode === 'signup' ? 'Sign up was cancelled' : 'Log in was cancelled');
      const u = await puter.auth.getUser();
      if (mode === 'signup' && profile) {
        await Profile.set({ ...profile, createdAt: Date.now() }).catch(() => {});
        toast(`Welcome to Nexus, ${profile.name.split(' ')[0]}!`);
      } else {
        toast('Logged in successfully');
      }
      setUser(u); setAuthState('in');
    }
    catch (e) { toast(errMsg(e) || 'Log in was cancelled', 'error'); }
    finally { setSigningIn(false); }
  };
  const signOut = () => { puter.auth.signOut(); setAuthState('out'); setUser(null); setProfile(null); setDocs([]); setChats([]); setMessages([]); setActiveId(null); texts.current = {}; };

  // ---------- Load data ----------
  const rebuild = React.useCallback((list) => {
    setIndex(new Index().build(list.map(d => ({ id: d.id, name: d.name, text: texts.current[d.id] || '' }))));
  }, []);

  React.useEffect(() => {
    if (authState !== 'in') return;
    (async () => {
      const [d, c, s, p] = await Promise.all([Docs.list(), Chats.list(), Settings.get(), Profile.get()]);
      setProfile(p);
      setChats(c.sort((a, b) => b.updatedAt - a.updatedAt));
      if (s?.model) setModelState(s.model);
      if (s?.lang) setLangState(s.lang);
      setDocs(d); docsRef.current = d;
      await Promise.all(d.map(async doc => { try { texts.current[doc.id] = await Docs.readText(doc.id); } catch { texts.current[doc.id] = ''; } }));
      rebuild(d);
    })().catch(e => toast('Failed to load data: ' + errMsg(e), 'error'));
  }, [authState]);

  const setModel = (m) => { setModelState(m); Settings.set({ model: m }).catch(() => {}); };
  const setLang = (l) => { setLangState(l); Settings.set({ lang: l }).catch(() => {}); };

  // ---------- Knowledge base ----------
  const addDoc = async (name, text, meta = {}) => {
    const clean = text.trim();
    if (!clean) throw new Error(`"${name}" has no readable text`);
    const id = uid('d_');
    await Docs.writeText(id, clean);
    texts.current[id] = clean;
    const doc = { id, name, chars: clean.length, chunks: chunkText(clean).length, createdAt: Date.now(), ...meta };
    return doc;
  };
  const commitDocs = async (newDocs) => {
    const list = [...newDocs, ...docsRef.current];
    setDocs(list); docsRef.current = list;
    await Docs.saveIndex(list);
    rebuild(list);
  };
  const docsRef = React.useRef(docs);
  React.useEffect(() => { docsRef.current = docs; }, [docs]);

  const upload = async (files) => {
    if (!files.length) return;
    setKbBusy(true);
    const added = [];
    for (const f of files) {
      try {
        if (f.size > 25 * 1024 * 1024) throw new Error(`${f.name} exceeds 25 MB`);
        const text = await extractText(f);
        added.push(await addDoc(f.name, text, { size: f.size, source: 'file' }));
      } catch (e) { toast(errMsg(e) || 'Failed to process ' + f.name, 'error'); }
    }
    try {
      if (added.length) { await commitDocs(added); toast(`Added ${added.length} document${added.length > 1 ? 's' : ''}`); }
    } catch (e) { toast(errMsg(e), 'error'); }
    setKbBusy(false);
  };
  const addText = async (title, text) => {
    setKbBusy(true);
    try { await commitDocs([await addDoc(title, text, { source: 'note' })]); toast('Note added'); }
    catch (e) { toast(e.message, 'error'); }
    setKbBusy(false);
  };
  const addUrl = async (url) => {
    setKbBusy(true);
    try {
      const text = await fetchUrlText(url);
      const name = url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 80);
      await commitDocs([await addDoc(name, text, { source: 'url', url })]);
      toast('Web page imported');
    } catch (e) { toast(e.message || 'Could not import page', 'error'); }
    setKbBusy(false);
  };
  const deleteDoc = async (id) => {
    const list = docsRef.current.filter(d => d.id !== id);
    setDocs(list); docsRef.current = list;
    delete texts.current[id];
    rebuild(list);
    try { await Promise.all([Docs.saveIndex(list), Docs.remove(id)]); toast('Document removed'); }
    catch (e) { toast(errMsg(e), 'error'); }
  };
  const loadSamples = async () => {
    setKbBusy(true);
    try {
      const added = [];
      for (const s of SAMPLES) added.push(await addDoc(s.name, s.text, { source: 'file', size: s.text.length }));
      await commitDocs(added);
      toast('Sample documents loaded');
    } catch (e) { toast(e.message, 'error'); }
    setKbBusy(false);
  };

  const openPreview = async (doc, highlight) => {
    setPreview({ doc, text: texts.current[doc.id] ?? null, highlight });
    if (texts.current[doc.id] === undefined) {
      const t = await Docs.readText(doc.id); texts.current[doc.id] = t;
      setPreview(p => p && p.doc.id === doc.id ? { ...p, text: t } : p);
    }
  };
  const openSource = (s) => {
    if (s.docId === 'web' && s.url) { window.open(s.url, '_blank', 'noopener'); return; }
    const d = docs.find(x => x.id === s.docId);
    if (d) openPreview(d, s.idx >= 0 ? s.text : null);
    else toast('That document was deleted', 'error');
  };

  // ---------- Chats ----------
  const selectChat = async (id) => {
    if (busy) abortRef.current?.abort();
    setActiveId(id); setSideOpen(false);
    try { setMessages(await Chats.load(id)); } catch { setMessages([]); }
  };
  const newChat = () => { if (busy) abortRef.current?.abort(); setActiveId(null); setMessages([]); setSideOpen(false); };
  const deleteChat = async (id) => {
    const list = chats.filter(c => c.id !== id);
    setChats(list);
    if (id === activeId) newChat();
    try { await Promise.all([Chats.saveIndex(list), Chats.remove(id)]); } catch {}
  };

  const send = async (question, baseMessages = messages) => {
    let chatId = activeId;
    const isNew = !chatId;
    if (isNew) chatId = uid('c_');
    const userMsg = { id: uid('m_'), role: 'user', content: question, task, lang };
    const botId = uid('m_');
    const botMsg = { id: botId, role: 'assistant', content: '', steps: [], pending: true, model };
    const history = baseMessages.filter(m => !m.pending && !m.error);
    setMessages([...baseMessages, userMsg, botMsg]);
    setActiveId(chatId);
    setBusy(true);

    const patch = (p) => setMessages(ms => ms.map(m => m.id === botId ? { ...m, ...p } : m));
    const ac = new AbortController(); abortRef.current = ac;
    const t0 = Date.now();

    let chatList = chats;
    if (isNew) {
      chatList = [{ id: chatId, title: question.slice(0, 48), updatedAt: Date.now() }, ...chats];
      setChats(chatList);
      generateTitle(question).then(title => {
        setChats(cs => { const n = cs.map(c => c.id === chatId ? { ...c, title } : c); Chats.saveIndex(n).catch(() => {}); return n; });
      }).catch(() => {});
    }

    let final;
    try {
      const res = await runAgent({
        index, docs: docsRef.current, model, task, useKB, question, history, topK: 6, lang, signal: ac.signal,
        readDoc: async (id) => texts.current[id] ?? (texts.current[id] = await Docs.readText(id)),
        saveNote: async (title, content) => { const d = await addDoc(title, content, { source: 'note' }); await commitDocs([d]); },
        onStep: (steps) => { if (!ac.signal.aborted) patch({ steps }); },
      });
      if (ac.signal.aborted) return;
      final = { ...botMsg, content: res.content, sources: res.sources, steps: res.steps, pending: false, ms: Date.now() - t0 };
    } catch (e) {
      if (e.name === 'AbortError' || ac.signal.aborted) {
        final = { ...botMsg, pending: false, error: 'Stopped.', steps: [] };
      } else {
        console.error('Agent error', e);
        final = { ...botMsg, pending: false, error: errMsg(e) || 'Something went wrong. Please try again.' };
      }
    } finally {
      setBusy(false);
    }
    if (!final) return;
    const all = [...baseMessages, userMsg, final];
    setMessages(ms => ms.some(m => m.id === botId) ? all : ms);
    await Chats.save(chatId, all).catch(() => {});
    setChats(cs => {
      const n = cs.map(c => c.id === chatId ? { ...c, updatedAt: Date.now() } : c).sort((a, b) => b.updatedAt - a.updatedAt);
      Chats.saveIndex(n).catch(() => {}); return n;
    });
  };

  const stop = () => abortRef.current?.abort();
  const regenerate = () => {
    const lastUserIdx = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserIdx < 0 || busy) return;
    const q = messages[lastUserIdx];
    if (q.task) setTask(q.task);
    if (q.lang) setLangState(q.lang);
    send(q.content, messages.slice(0, lastUserIdx));
  };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast('Copied to clipboard'); } catch { toast('Copy failed', 'error'); } };
  const starter = (s) => window.dispatchEvent(new CustomEvent('nexus:prefill', { detail: s }));

  if (authState === 'checking') return html`<div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-zinc-200 border-t-brand-600 rounded-full animate-spin"></div></div>`;
  if (authState === 'out') return html`<${AuthPage} onAuth=${signIn} loading=${signingIn} /><${Toasts} items=${toasts} />`;

  const activeChat = chats.find(c => c.id === activeId);

  return html`
    <div className="h-full flex">
      <${Sidebar} chats=${chats} activeId=${activeId} onSelect=${selectChat} onNew=${newChat} onDelete=${deleteChat}
        user=${user} profile=${profile} onSignOut=${signOut} docCount=${docs.length} onOpenKB=${() => { setKbOpen(true); setSideOpen(false); }}
        open=${sideOpen} onClose=${() => setSideOpen(false)} />

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 px-3 sm:px-4 flex items-center gap-2 border-b border-zinc-100 shrink-0">
          <${Button} variant="ghost" size="icon" className="lg:hidden" onClick=${() => setSideOpen(true)}><${Icon} name="Menu" /></${Button}>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium truncate">${activeChat?.title || 'New conversation'}</div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-zinc-500 mr-1">
            <span className=${'w-1.5 h-1.5 rounded-full ' + (docs.length ? 'bg-emerald-500' : 'bg-zinc-300')}></span>
            ${index.size} chunks indexed
          </div>
          <${Button} variant="outline" size="sm" onClick=${() => setKbOpen(true)}><${Icon} name="Library" size=${14} /><span className="hidden sm:inline">Knowledge</span></${Button}>
          <${Button} variant="ghost" size="icon" onClick=${newChat} title="New chat"><${Icon} name="SquarePen" size=${16} /></${Button}>
        </header>

        <div className="flex-1 overflow-y-auto scroll-thin">
          ${messages.length === 0
            ? html`<${Welcome} task=${task} setTask=${setTask} docCount=${docs.length} onOpenKB=${() => setKbOpen(true)} onStarter=${starter} onSample=${loadSamples} />`
            : html`<${MessageList} messages=${messages} onOpenSource=${openSource} onCopy=${copy} onRegenerate=${regenerate} />`}
        </div>

        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            <${Composer} onSend=${(q) => send(q)} onStop=${stop} busy=${busy} task=${task} setTask=${setTask}
              model=${model} setModel=${setModel} lang=${lang} setLang=${setLang} useKB=${useKB} setUseKB=${setUseKB} docCount=${docs.length} />
            <div className="text-[11px] text-zinc-400 text-center mt-2">The agent can make mistakes. Check the cited sources.</div>
          </div>
        </div>
      </main>

      <${KnowledgePanel} open=${kbOpen} onClose=${() => setKbOpen(false)} docs=${docs} chunkCount=${index.size}
        onUpload=${upload} onAddText=${addText} onAddUrl=${addUrl} onDelete=${deleteDoc} onPreview=${(d) => openPreview(d)} busy=${kbBusy} />
      <${DocPreview} doc=${preview?.doc} text=${preview?.text} highlight=${preview?.highlight} onClose=${() => setPreview(null)} />
      <${Toasts} items=${toasts} />
    </div>`;
}

createRoot(document.getElementById('root')).render(html`<${ErrorBoundary}><${App} /></${ErrorBoundary}>`);
