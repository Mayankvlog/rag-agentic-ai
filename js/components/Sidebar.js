import { html, cx, timeAgo } from '../lib/html.js';
import { Icon, Button } from './ui.js';

export function Sidebar({ chats, activeId, onSelect, onNew, onDelete, user, profile, onSignOut, docCount, onOpenKB, open, onClose }) {
  return html`
    <div className=${cx('fixed inset-0 z-30 bg-zinc-900/20 lg:hidden', open ? 'block' : 'hidden')} onClick=${onClose}></div>
    <aside className=${cx('fixed lg:static z-40 inset-y-0 left-0 w-[268px] bg-zinc-50 border-r border-zinc-200 flex flex-col transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
      <div className="h-14 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="icon.svg" className="w-7 h-7" alt="" />
          <div className="leading-tight">
            <div className="font-semibold text-[14px]">Nexus</div>
            <div className="text-[11px] text-zinc-500">Agentic RAG</div>
          </div>
        </div>
        <${Button} variant="ghost" size="icon" className="lg:hidden" onClick=${onClose}><${Icon} name="PanelLeftClose" /></${Button}>
      </div>

      <div className="px-3 space-y-1">
        <${Button} variant="outline" className="w-full justify-start" onClick=${onNew}><${Icon} name="SquarePen" />New chat</${Button}>
        <button onClick=${onOpenKB} className="w-full h-9 px-3.5 flex items-center gap-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-100 font-medium">
          <${Icon} name="Library" />Knowledge base
          <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-200/70 text-zinc-600 font-semibold">${docCount}</span>
        </button>
      </div>

      <div className="px-4 pt-5 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Conversations</div>
      <div className="flex-1 overflow-y-auto scroll-thin px-2 pb-2">
        ${chats.length === 0 && html`<div className="px-3 py-6 text-[13px] text-zinc-400 text-center">No conversations yet</div>`}
        ${chats.map(c => html`
          <div key=${c.id} onClick=${() => onSelect(c.id)}
            className=${cx('group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer', c.id === activeId ? 'bg-white border border-zinc-200' : 'hover:bg-zinc-100 border border-transparent')}>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium truncate text-zinc-800">${c.title || 'New chat'}</div>
              <div className="text-[11px] text-zinc-400">${timeAgo(c.updatedAt)}</div>
            </div>
            <button onClick=${(e) => { e.stopPropagation(); onDelete(c.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50" title="Delete">
              <${Icon} name="Trash2" size=${14} />
            </button>
          </div>`)}
      </div>

      <div className="p-3 border-t border-zinc-200 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-[13px] font-semibold uppercase">${(profile?.name || user?.username || '?')[0]}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate">${profile?.name || user?.username}</div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Synced to cloud</div>
        </div>
        <${Button} variant="ghost" size="icon" onClick=${onSignOut} title="Sign out"><${Icon} name="LogOut" size=${15} /></${Button}>
      </div>
    </aside>`;
}
