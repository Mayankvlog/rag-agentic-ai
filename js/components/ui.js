import React from 'react';
import * as L from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { html, cx } from '../lib/html.js';

export function Icon({ name, size = 16, className = '', strokeWidth = 1.75 }) {
  const C = L[name] || L.Circle;
  return React.createElement(C, { size, className, strokeWidth });
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...p }) {
  const v = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300',
    brand: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-200',
    ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
    outline: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 bg-white',
    danger: 'text-red-600 hover:bg-red-50',
  }[variant];
  const s = { sm: 'h-8 px-2.5 text-[13px] gap-1.5', md: 'h-9 px-3.5 text-sm gap-2', lg: 'h-11 px-5 text-[15px] gap-2', icon: 'h-8 w-8 justify-center' }[size];
  return html`<button ...${p} className=${cx('inline-flex items-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed shrink-0', v, s, className)}>${children}</button>`;
}

marked.setOptions({ gfm: true, breaks: false });

export function Markdown({ text, onCite }) {
  const ref = React.useRef(null);
  const out = React.useMemo(() => {
    let h = DOMPurify.sanitize(marked.parse(text || ''));
    // turn [n] into citation chips, skipping code blocks
    h = h.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/g).map(part =>
      part.startsWith('<pre') || part.startsWith('<code') ? part :
      part.replace(/\[(\d{1,2})\](?!\()/g, '<a class="cite" data-cite="$1">$1</a>')
    ).join('');
    return h;
  }, [text]);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    el.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  }, [out]);
  const click = (e) => {
    const c = e.target.closest('[data-cite]');
    if (c && onCite) { e.preventDefault(); onCite(parseInt(c.dataset.cite)); }
  };
  return html`<div ref=${ref} onClick=${click} className="prose-ai" dangerouslySetInnerHTML=${{ __html: out }}></div>`;
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  React.useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open]);
  if (!open) return null;
  return html`
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-zinc-900/30" onClick=${onClose}></div>
      <div className=${cx('relative bg-white w-full rounded-t-2xl sm:rounded-2xl border border-zinc-200 fade-in max-h-[90dvh] flex flex-col', width)}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-100 shrink-0">
          <h3 className="font-semibold text-[15px]">${title}</h3>
          <${Button} variant="ghost" size="icon" onClick=${onClose}><${Icon} name="X" /></${Button}>
        </div>
        <div className="overflow-y-auto scroll-thin">${children}</div>
      </div>
    </div>`;
}

export function Toasts({ items }) {
  return html`<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
    ${items.map(t => html`<div key=${t.id} className=${cx('fade-in px-3.5 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2', t.type === 'error' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white')}>
      <${Icon} name=${t.type === 'error' ? 'CircleAlert' : 'CircleCheck'} size=${15} />${t.msg}</div>`)}
  </div>`;
}
