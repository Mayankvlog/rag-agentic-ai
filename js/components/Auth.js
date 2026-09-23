import React from 'react';
import { html, cx } from '../lib/html.js';
import { Icon, Button } from './ui.js';

const FEATURES = [
  ['Workflow', 'Agentic reasoning', 'Plans, calls tools and iterates until the task is done'],
  ['Database', 'Retrieval over your docs', 'PDFs, notes, code and web pages with inline citations'],
  ['LayoutGrid', 'Multiple task modes', 'Q&A, summaries, comparisons, extraction, writing, quizzes, code'],
  ['ShieldCheck', 'Private cloud storage', 'Your knowledge base and chats are synced to your account'],
];

const USE_CASES = ['Research & study', 'Work documents', 'Software development', 'Content writing', 'Other'];

function Field({ label, icon, error, children, hint }) {
  return html`<label className="block">
    <div className="text-[13px] font-medium text-zinc-700 mb-1.5">${label}</div>
    <div className=${cx('relative flex items-center rounded-lg border bg-white transition-colors focus-within:border-brand-500', error ? 'border-red-400' : 'border-zinc-200')}>
      ${icon && html`<${Icon} name=${icon} size=${15} className="absolute left-3 text-zinc-400 pointer-events-none" />`}
      ${children}
    </div>
    ${error ? html`<div className="text-[12px] text-red-600 mt-1">${error}</div>` : hint ? html`<div className="text-[12px] text-zinc-400 mt-1">${hint}</div>` : null}
  </label>`;
}

const inputCls = 'w-full h-10 pl-9 pr-3 bg-transparent text-sm outline-none rounded-lg';

export function AuthPage({ onAuth, loading }) {
  const [mode, setMode] = React.useState('login'); // login | signup
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [useCase, setUseCase] = React.useState(USE_CASES[0]);
  const [agree, setAgree] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  const switchMode = (m) => { setMode(m); setErrors({}); };

  const submit = (e) => {
    e.preventDefault();
    if (mode === 'login') return onAuth({ mode });
    const errs = {};
    if (name.trim().length < 2) errs.name = 'Please enter your name';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    if (!agree) errs.agree = 'Please accept the terms to continue';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onAuth({ mode, profile: { name: name.trim(), email: email.trim(), useCase } });
  };

  return html`
    <div className="h-full flex flex-col lg:flex-row overflow-y-auto">
      <div className="flex-1 flex items-center justify-center p-6 py-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <img src="icon.svg" className="w-9 h-9" alt="" />
            <div className="leading-tight">
              <div className="font-semibold text-[15px]">Nexus</div>
              <div className="text-[12px] text-zinc-500">Agentic RAG workspace</div>
            </div>
          </div>

          <h1 className="text-[24px] font-semibold tracking-tight">${mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="text-zinc-500 mt-1 text-[14px]">${mode === 'login' ? 'Log in to open your knowledge base and conversations.' : 'Set up your workspace in a few seconds.'}</p>

          <div className="flex p-0.5 bg-zinc-100 rounded-lg text-[13px] font-medium mt-6">
            ${[['login', 'Log in'], ['signup', 'Sign up']].map(([id, l]) => html`
              <button key=${id} type="button" onClick=${() => switchMode(id)}
                className=${cx('flex-1 h-9 rounded-md transition-colors', mode === id ? 'bg-white text-zinc-900 border border-zinc-200' : 'text-zinc-500 hover:text-zinc-800')}>${l}</button>`)}
          </div>

          <form onSubmit=${submit} className="mt-5 space-y-4" noValidate>
            ${mode === 'signup' && html`
              <${Field} label="Full name" icon="User" error=${errors.name}>
                <input value=${name} onChange=${(e) => setName(e.target.value)} placeholder="Jane Doe" className=${inputCls} autoComplete="name" />
              </${Field}>
              <${Field} label="Email" icon="Mail" error=${errors.email} hint="Optional — used for your profile only">
                <input value=${email} onChange=${(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className=${inputCls} autoComplete="email" />
              </${Field}>
              <${Field} label="What will you use Nexus for?" icon="Target">
                <select value=${useCase} onChange=${(e) => setUseCase(e.target.value)} className=${inputCls + ' appearance-none cursor-pointer'}>
                  ${USE_CASES.map(u => html`<option key=${u} value=${u}>${u}</option>`)}
                </select>
                <${Icon} name="ChevronDown" size=${14} className="absolute right-3 text-zinc-400 pointer-events-none" />
              </${Field}>
              <div>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked=${agree} onChange=${(e) => setAgree(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-600" />
                  <span className="text-[13px] text-zinc-600">I agree to the Terms of Service and Privacy Policy</span>
                </label>
                ${errors.agree && html`<div className="text-[12px] text-red-600 mt-1 ml-6">${errors.agree}</div>`}
              </div>`}

            ${mode === 'login' && html`
              <div className="rounded-xl border border-zinc-200 p-4 flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0"><${Icon} name="KeyRound" size=${16} className="text-brand-600" /></div>
                <div className="text-[13px] text-zinc-600 leading-relaxed">You'll log in through a secure Puter window. Your password is never shared with this app.</div>
              </div>`}

            <${Button} type="submit" variant="brand" size="lg" className="w-full justify-center" disabled=${loading}>
              ${loading
                ? html`<div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>${mode === 'login' ? 'Logging in…' : 'Creating account…'}`
                : html`<${Icon} name=${mode === 'login' ? 'LogIn' : 'UserPlus'} size=${17} />${mode === 'login' ? 'Log in with Puter' : 'Create account'}`}
            </${Button}>
          </form>

          <p className="text-[13px] text-zinc-500 mt-6 text-center">
            ${mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick=${() => switchMode(mode === 'login' ? 'signup' : 'login')} className="text-brand-600 font-medium hover:underline">
              ${mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
          <p className="text-[12px] text-zinc-400 mt-3 text-center flex items-center justify-center gap-1.5"><${Icon} name="Lock" size=${12} />Free · Secure · No API keys required</p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-zinc-50 border-l border-zinc-200 items-center justify-center p-10">
        <div className="max-w-md">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-6">Why Nexus</div>
          <div className="space-y-6">
            ${FEATURES.map(([ic, t, d]) => html`<div key=${t} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0"><${Icon} name=${ic} size=${18} className="text-brand-600" /></div>
              <div><div className="font-medium text-[15px]">${t}</div><div className="text-[13.5px] text-zinc-500 mt-0.5">${d}</div></div>
            </div>`)}
          </div>
        </div>
      </div>
    </div>`;
}
