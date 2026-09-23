import React from 'react';
import { html, cx } from '../lib/html.js';
import { Icon, Button, Markdown } from './ui.js';
import { TASKS, MODELS, LYRICS_LANGUAGES } from '../lib/agent.js';

const TOOL_META = {
  search_knowledge_base: { icon: 'Search', label: (a) => `Searched knowledge base for “${a.query}”` },
  list_documents: { icon: 'Library', label: () => 'Listed documents' },
  read_document: { icon: 'BookOpen', label: (a) => `Read “${a.name}”${a.page > 1 ? ' · page ' + a.page : ''}` },
  calculator: { icon: 'Calculator', label: (a) => `Calculated ${a.expression}` },
  fetch_webpage: { icon: 'Globe', label: (a) => `Fetched ${a.url}` },
  save_note: { icon: 'BookmarkPlus', label: (a) => `Saved note “${a.title}”` },
  get_current_datetime: { icon: 'Clock', label: () => 'Checked current date & time' },
};

function Steps({ steps, live }) {
  const [open, setOpen] = React.useState(false);
  const tools = steps.filter(s => s.type === 'tool');
  const expanded = live || open;
  if (!steps.length) return null;
  return html`
    <div className="mb-3">
      ${!live && html`<button onClick=${() => setOpen(!open)} className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-800 font-medium">
        <${Icon} name="Workflow" size=${13} />${tools.length ? `Used ${tools.length} tool${tools.length > 1 ? 's' : ''}` : 'Reasoned directly'}
        <${Icon} name=${open ? 'ChevronUp' : 'ChevronDown'} size=${13} /></button>`}
      ${expanded && html`
        <div className=${cx('border-l-2 border-zinc-100 pl-3 space-y-1.5', !live && 'mt-2')}>
          ${steps.map((s, i) => {
            const meta = s.type === 'tool' ? (TOOL_META[s.tool] || { icon: 'Wrench', label: () => s.tool }) : { icon: 'Sparkles', label: () => s.label };
            return html`<div key=${i} className="flex items-start gap-2 text-[12.5px] fade-in">
              <span className=${cx('mt-0.5 shrink-0', s.status === 'error' ? 'text-red-500' : s.status === 'running' ? 'text-brand-600' : 'text-zinc-400')}>
                ${s.status === 'running' ? html`<div className="w-3.5 h-3.5 border-[1.5px] border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>` : html`<${Icon} name=${s.status === 'error' ? 'CircleAlert' : meta.icon} size=${14} />`}
              </span>
              <span className=${cx('min-w-0 break-words', s.status === 'running' ? 'text-zinc-800' : 'text-zinc-500')}>
                ${meta.label(s.args || {})}
                ${s.type === 'tool' && s.status === 'done' && s.count !== undefined && html`<span className="text-zinc-400"> · ${s.count} result${s.count === 1 ? '' : 's'}</span>`}
                ${s.status === 'error' && html`<span className="text-red-500"> · ${String(s.result).slice(0, 120)}</span>`}
              </span>
            </div>`;
          })}
        </div>`}
    </div>`;
}

function Sources({ sources, onOpen, activeCite }) {
  if (!sources?.length) return null;
  return html`
    <div className="mt-4">
      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Sources</div>
      <div className="grid sm:grid-cols-2 gap-2">
        ${sources.map((s, i) => html`
          <button key=${i} id=${'src-' + i} onClick=${() => onOpen(s)}
            className=${cx('text-left rounded-lg border px-3 py-2 hover:bg-zinc-50 transition-colors', activeCite === i + 1 ? 'border-brand-500 bg-brand-50' : 'border-zinc-200')}>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-800">
              <span className="cite !m-0">${i + 1}</span>
              <span className="truncate">${s.docName}</span>
              ${s.idx < 0 ? html`<span className="text-zinc-400 font-normal shrink-0">p.${-s.idx}</span>` : ''}
            </div>
            <div className="text-[11.5px] text-zinc-500 mt-1 line-clamp-2">${s.text?.slice(0, 180)}</div>
          </button>`)}
      </div>
    </div>`;
}

function Message({ m, onOpenSource, onCopy, onRegenerate, isLast }) {
  const [cite, setCite] = React.useState(null);
  if (m.role === 'user') {
    const task = TASKS.find(t => t.id === m.task);
    return html`<div className="flex justify-end fade-in">
      <div className="max-w-[85%]">
        ${task && task.id !== 'qa' && html`<div className="text-right mb-1"><span className="inline-flex items-center gap-1 text-[11px] text-zinc-500"><${Icon} name=${task.icon} size=${12} />${task.label}</span></div>`}
        <div className="bg-zinc-100 rounded-2xl rounded-br-md px-4 py-2.5 text-[14.5px] whitespace-pre-wrap break-words">${m.content}</div>
      </div>
    </div>`;
  }
  const openCite = (n) => {
    setCite(n);
    const s = m.sources?.[n - 1];
    if (s) onOpenSource(s);
  };
  return html`<div className="flex gap-3 fade-in">
    <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 mt-0.5"><${Icon} name="Sparkles" size=${14} className="text-white" /></div>
    <div className="min-w-0 flex-1">
      <${Steps} steps=${m.steps || []} live=${m.pending} />
      ${m.pending && !m.content && html`<div className="dot-pulse py-1"><span></span><span></span><span></span></div>`}
      ${m.error && html`<div className="text-[13.5px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2"><${Icon} name="CircleAlert" size=${15} />${m.error}</div>`}
      ${m.content && html`<${Markdown} text=${m.content} onCite=${openCite} />`}
      ${!m.pending && html`<${Sources} sources=${m.sources} onOpen=${onOpenSource} activeCite=${cite} />`}
      ${!m.pending && (m.content || m.error) && html`
        <div className="flex items-center gap-0.5 mt-2 -ml-1.5">
          ${m.content && html`<button onClick=${() => onCopy(m.content)} className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100" title="Copy"><${Icon} name="Copy" size=${14} /></button>`}
          ${isLast && html`<button onClick=${onRegenerate} className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100" title="Regenerate"><${Icon} name="RefreshCw" size=${14} /></button>`}
          ${m.model && html`<span className="text-[11px] text-zinc-400 ml-1.5">${MODELS.find(x => x.id === m.model)?.label || m.model}${m.ms ? ' · ' + (m.ms / 1000).toFixed(1) + 's' : ''}</span>`}
        </div>`}
    </div>
  </div>`;
}

function Dropdown({ value, options, onChange, icon, align = 'left', up = true }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const cur = options.find(o => o.id === value) || options[0];
  return html`<div ref=${ref} className="relative">
    <button type="button" onClick=${() => setOpen(!open)} className="h-8 px-2.5 rounded-lg text-[12.5px] font-medium text-zinc-600 hover:bg-zinc-100 flex items-center gap-1.5">
      <${Icon} name=${cur.icon || icon} size=${14} /><span className="hidden sm:inline">${cur.label}</span><${Icon} name="ChevronDown" size=${12} />
    </button>
    ${open && html`<div className=${cx('absolute z-20 w-64 bg-white border border-zinc-200 rounded-xl p-1 fade-in max-h-[340px] overflow-y-auto scroll-thin', up ? 'bottom-10' : 'top-10', align === 'right' ? 'right-0' : 'left-0')}>
      ${options.map(o => html`<button type="button" key=${o.id} onClick=${() => { onChange(o.id); setOpen(false); }}
        className=${cx('w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 hover:bg-zinc-50', o.id === value && 'bg-zinc-50')}>
        ${o.icon && html`<${Icon} name=${o.icon} size=${15} className="mt-0.5 text-zinc-500" />`}
        <div className="flex-1 min-w-0"><div className="text-[13px] font-medium">${o.label}</div>${(o.desc || o.note) && html`<div className="text-[11.5px] text-zinc-500">${o.desc || o.note}</div>`}</div>
        ${o.id === value && html`<${Icon} name="Check" size=${14} className="mt-0.5 text-brand-600" />`}
      </button>`)}
    </div>`}
  </div>`;
}

export function Composer({ onSend, onStop, busy, task, setTask, model, setModel, lang, setLang, useKB, setUseKB, docCount }) {
  const [text, setText] = React.useState('');
  const ta = React.useRef(null);
  React.useEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [text]);
  React.useEffect(() => {
    const h = (e) => { if (e.detail) { setText(e.detail); ta.current?.focus(); } };
    window.addEventListener('nexus:prefill', h); return () => window.removeEventListener('nexus:prefill', h);
  }, []);
  const submit = (e) => { e?.preventDefault(); if (!text.trim() || busy) return; onSend(text.trim()); setText(''); };
  return html`
    <form onSubmit=${submit} className="rounded-2xl border border-zinc-200 bg-white focus-within:border-zinc-400 transition-colors">
      <textarea ref=${ta} rows="1" value=${text} onChange=${(e) => setText(e.target.value)}
        onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e); }}
        placeholder=${docCount ? 'Ask anything about your documents…' : 'Ask anything, or add documents to ground answers…'}
        className="w-full px-4 pt-3.5 pb-1 text-[14.5px] outline-none bg-transparent max-h-[200px] scroll-thin"></textarea>
      <div className="flex items-center gap-1 px-2 pb-2">
        <${Dropdown} value=${task} options=${TASKS} onChange=${setTask} />
        ${task === 'lyrics' && html`<${Dropdown} value=${lang || 'auto'} options=${LYRICS_LANGUAGES} onChange=${setLang} icon="Languages" />`}
        <${Dropdown} value=${model} options=${MODELS} onChange=${setModel} icon="Cpu" />
        <button type="button" onClick=${() => setUseKB(!useKB)} title="Toggle knowledge base retrieval"
          className=${cx('h-8 px-2.5 rounded-lg text-[12.5px] font-medium flex items-center gap-1.5', useKB ? 'text-brand-700 bg-brand-50' : 'text-zinc-500 hover:bg-zinc-100')}>
          <${Icon} name="Database" size=${14} /><span className="hidden sm:inline">RAG ${useKB ? 'on' : 'off'}</span>
        </button>
        <div className="flex-1"></div>
        ${busy
          ? html`<${Button} type="button" size="icon" variant="primary" className="rounded-lg" onClick=${onStop} title="Stop"><${Icon} name="Square" size=${13} /></${Button}>`
          : html`<${Button} type="submit" size="icon" variant="brand" className="rounded-lg" disabled=${!text.trim()} title="Send"><${Icon} name="ArrowUp" size=${16} /></${Button}>`}
      </div>
    </form>`;
}

export function Welcome({ task, setTask, docCount, onOpenKB, onStarter, onSample }) {
  const t = TASKS.find(x => x.id === task) || TASKS[0];
  return html`
    <div className="max-w-2xl mx-auto w-full px-4 pt-[8vh] pb-6 fade-in">
      <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4"><${Icon} name="BrainCircuit" size=${22} className="text-brand-600" /></div>
      <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight">What should we work on?</h1>
      <p className="text-zinc-500 mt-1.5 text-[15px]">An autonomous agent that plans, searches your knowledge base, uses tools, and answers with citations.</p>

      ${docCount === 0 && html`
        <div className="mt-6 rounded-xl border border-zinc-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0"><${Icon} name="FolderUp" size=${17} /></div>
          <div className="flex-1">
            <div className="text-sm font-medium">Your knowledge base is empty</div>
            <div className="text-[13px] text-zinc-500">Upload PDFs, notes or web pages — or load a sample to try it out.</div>
          </div>
          <div className="flex gap-2">
            <${Button} variant="outline" size="sm" onClick=${onSample}>Load sample</${Button}>
            <${Button} variant="primary" size="sm" onClick=${onOpenKB}><${Icon} name="Plus" size=${14} />Add docs</${Button}>
          </div>
        </div>`}

      <div className="mt-8">
        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">Task mode</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${TASKS.map(x => html`<button key=${x.id} onClick=${() => setTask(x.id)}
            className=${cx('text-left rounded-xl border p-3 transition-colors', x.id === task ? 'border-brand-500 bg-brand-50/60' : 'border-zinc-200 hover:bg-zinc-50')}>
            <${Icon} name=${x.icon} size=${17} className=${x.id === task ? 'text-brand-600' : 'text-zinc-500'} />
            <div className="text-[13px] font-medium mt-2">${x.label}</div>
            <div className="text-[11.5px] text-zinc-500 leading-snug mt-0.5">${x.desc}</div>
          </button>`)}
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        ${t.starters.map(s => html`<button key=${s} onClick=${() => onStarter(s)} className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-[13.5px] text-zinc-600 border border-transparent hover:border-zinc-200">
          <${Icon} name="CornerDownRight" size=${14} className="text-zinc-400" />${s}</button>`)}
      </div>
    </div>`;
}

export function MessageList({ messages, onOpenSource, onCopy, onRegenerate }) {
  const end = React.useRef(null);
  const last = messages[messages.length - 1];
  React.useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length, last?.steps?.length, last?.content]);
  return html`<div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-7">
    ${messages.map((m, i) => html`<${Message} key=${m.id} m=${m} onOpenSource=${onOpenSource} onCopy=${onCopy} onRegenerate=${onRegenerate} isLast=${i === messages.length - 1} />`)}
    <div ref=${end}></div>
  </div>`;
}
