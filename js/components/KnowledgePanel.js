import React from 'react';
import { html, cx, timeAgo, formatBytes } from '../lib/html.js';
import { Icon, Button, Modal } from './ui.js';

const typeIcon = (n) => {
  const e = n.split('.').pop().toLowerCase();
  if (e === 'pdf') return 'FileText';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'css', 'html'].includes(e)) return 'FileCode2';
  if (['csv', 'json', 'xml', 'yaml', 'yml'].includes(e)) return 'FileSpreadsheet';
  if (n.startsWith('http')) return 'Globe';
  return 'File';
};

export function KnowledgePanel({ open, onClose, docs, chunkCount, onUpload, onAddText, onAddUrl, onDelete, onPreview, busy }) {
  const [tab, setTab] = React.useState('files');
  const [drag, setDrag] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [text, setText] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [q, setQ] = React.useState('');
  const fileRef = React.useRef(null);

  const filtered = docs.filter(d => d.name.toLowerCase().includes(q.toLowerCase()));
  const totalChars = docs.reduce((a, d) => a + (d.chars || 0), 0);

  const drop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) onUpload([...e.dataTransfer.files]); };

  return html`
    <div className=${cx('fixed inset-0 z-40 bg-zinc-900/20', open ? 'block' : 'hidden')} onClick=${onClose}></div>
    <aside className=${cx('fixed z-50 inset-y-0 right-0 w-full sm:w-[420px] bg-white border-l border-zinc-200 flex flex-col transition-transform', open ? 'translate-x-0' : 'translate-x-full')}>
      <div className="h-14 px-5 flex items-center justify-between border-b border-zinc-100 shrink-0">
        <div className="flex items-center gap-2"><${Icon} name="Library" size=${18} /><h2 className="font-semibold text-[15px]">Knowledge base</h2></div>
        <${Button} variant="ghost" size="icon" onClick=${onClose}><${Icon} name="X" /></${Button}>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4 pb-0">
        ${[['Documents', docs.length], ['Chunks', chunkCount], ['Characters', totalChars > 999 ? (totalChars / 1000).toFixed(1) + 'k' : totalChars]].map(([l, v]) => html`
          <div key=${l} className="rounded-lg border border-zinc-200 px-3 py-2">
            <div className="text-[11px] text-zinc-500">${l}</div>
            <div className="text-[17px] font-semibold tabular-nums">${v}</div>
          </div>`)}
      </div>

      <div className="p-4 space-y-3 border-b border-zinc-100">
        <div className="flex p-0.5 bg-zinc-100 rounded-lg text-[13px] font-medium">
          ${[['files', 'Upload', 'Upload'], ['text', 'Paste text', 'ClipboardType'], ['url', 'Web page', 'Link']].map(([id, l, ic]) => html`
            <button key=${id} onClick=${() => setTab(id)} className=${cx('flex-1 h-8 rounded-md flex items-center justify-center gap-1.5', tab === id ? 'bg-white text-zinc-900 border border-zinc-200' : 'text-zinc-500')}>
              <${Icon} name=${ic} size=${14} />${l}</button>`)}
        </div>

        ${tab === 'files' && html`
          <div onDragOver=${(e) => { e.preventDefault(); setDrag(true); }} onDragLeave=${() => setDrag(false)} onDrop=${drop}
            onClick=${() => fileRef.current?.click()}
            className=${cx('rounded-xl border border-dashed px-4 py-7 text-center cursor-pointer transition-colors', drag ? 'border-brand-500 bg-brand-50' : 'border-zinc-300 hover:bg-zinc-50')}>
            <div className="w-10 h-10 mx-auto rounded-full bg-zinc-100 flex items-center justify-center mb-2">
              ${busy ? html`<div className="w-4 h-4 border-2 border-zinc-300 border-t-brand-600 rounded-full animate-spin"></div>` : html`<${Icon} name="CloudUpload" size=${18} />`}
            </div>
            <div className="text-sm font-medium">${busy ? 'Processing…' : 'Drop files or click to browse'}</div>
            <div className="text-[12px] text-zinc-500 mt-0.5">PDF, TXT, MD, CSV, JSON, HTML, code</div>
            <input ref=${fileRef} type="file" multiple className="hidden"
              accept=".pdf,.txt,.md,.markdown,.csv,.json,.html,.htm,.xml,.yaml,.yml,.js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.c,.cpp,.css,.sql,.log"
              onChange=${(e) => { onUpload([...e.target.files]); e.target.value = ''; }} />
          </div>`}

        ${tab === 'text' && html`
          <div className="space-y-2">
            <input value=${title} onChange=${(e) => setTitle(e.target.value)} placeholder="Title (e.g. Meeting notes)" className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-brand-500" />
            <textarea value=${text} onChange=${(e) => setText(e.target.value)} rows="6" placeholder="Paste any text…" className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm outline-none focus:border-brand-500 scroll-thin"></textarea>
            <${Button} variant="brand" className="w-full justify-center" disabled=${!text.trim() || busy}
              onClick=${async () => { await onAddText(title.trim() || 'Untitled note', text); setTitle(''); setText(''); }}>
              <${Icon} name="Plus" />Add to knowledge base</${Button}>
          </div>`}

        ${tab === 'url' && html`
          <form className="space-y-2" onSubmit=${async (e) => { e.preventDefault(); if (url.trim()) { await onAddUrl(url.trim()); setUrl(''); } }}>
            <input value=${url} onChange=${(e) => setUrl(e.target.value)} type="url" placeholder="https://example.com/article" className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-brand-500" />
            <${Button} variant="brand" className="w-full justify-center" disabled=${!url.trim() || busy} type="submit">
              ${busy ? 'Fetching…' : html`<${Icon} name="Download" />Import page`}</${Button}>
          </form>`}
      </div>

      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <${Icon} name="Search" size=${14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value=${q} onChange=${(e) => setQ(e.target.value)} placeholder="Filter documents" className="w-full h-8 pl-8 pr-3 rounded-lg bg-zinc-100 text-[13px] outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-2 pb-4">
        ${docs.length === 0 && html`
          <div className="text-center px-6 py-10">
            <div className="text-sm font-medium text-zinc-700">No documents yet</div>
            <div className="text-[13px] text-zinc-500 mt-1">Add files, notes, or web pages. The agent will search them to ground its answers.</div>
          </div>`}
        ${filtered.map(d => html`
          <div key=${d.id} className="group flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-zinc-50">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0"><${Icon} name=${d.source === 'url' ? 'Globe' : d.source === 'note' ? 'StickyNote' : typeIcon(d.name)} size=${16} /></div>
            <div className="min-w-0 flex-1 cursor-pointer" onClick=${() => onPreview(d)}>
              <div className="text-[13px] font-medium truncate">${d.name}</div>
              <div className="text-[11px] text-zinc-500">${formatBytes(d.size || d.chars)} · ${d.chunks} chunks · ${timeAgo(d.createdAt)}</div>
            </div>
            <button onClick=${() => onPreview(d)} className="p-1.5 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 opacity-0 group-hover:opacity-100" title="Preview"><${Icon} name="Eye" size=${14} /></button>
            <button onClick=${() => onDelete(d.id)} className="p-1.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100" title="Delete"><${Icon} name="Trash2" size=${14} /></button>
          </div>`)}
      </div>
    </aside>`;
}

export function DocPreview({ doc, text, onClose, highlight }) {
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current?.querySelector('mark')?.scrollIntoView({ block: 'center' }); }, [text, highlight]);
  let body = text || '';
  let parts = [body];
  if (highlight && body.includes(highlight)) {
    const i = body.indexOf(highlight);
    parts = [body.slice(0, i), html`<mark key="m" className="bg-yellow-100 text-inherit rounded">${highlight}</mark>`, body.slice(i + highlight.length)];
  }
  return html`<${Modal} open=${!!doc} onClose=${onClose} title=${doc?.name || ''} width="max-w-3xl">
    <div ref=${ref} className="p-5 text-[13px] leading-relaxed whitespace-pre-wrap font-mono text-zinc-700">
      ${text === null ? html`<div className="dot-pulse py-6 text-center"><span></span><span></span><span></span></div>` : parts}
    </div>
  </${Modal}>`;
}
