# Nexus — Agentic RAG Workspace

A serverless, fully client-side **Agentic RAG** web app. Upload your own documents, run an AI agent loop that plans, searches, reads, calculates, and fetches the web — and get answers with **inline numbered citations** that link back to the exact source passage.

**Free · Secure · No API keys required** — auth, storage, and AI models are provided by [Puter.js](https://puter.com).

## Features

- **Agentic loop (plan → tools → answer)** — up to 6 reasoning iterations with 7 tools: knowledge-base search, list/read documents, calculator, web fetch, save notes (long-term memory), and current datetime.
- **8 task modes** — Research Q&A, Summarize, Compare, Extract data, Draft & write, Study & quiz, Code assist, and **Lyrics** (songwriting in 90 languages).
- **Personal knowledge base** — drag-drop upload (PDF, txt, md, csv, json, html, code…), paste notes, or import web pages. PDF parsing via `pdfjs-dist`.
- **Client-side BM25 retrieval** — custom index (k1=1.4, b=0.75) with stemming, stop-word removal, and chunking (900 chars / 150 overlap). No server needed.
- **Clickable citations** — tool hits become `[n]` chips; clicking opens the source with the cited passage highlighted.
- **Live agent step trace** — collapsible workflow timeline of the model's thinking and tool calls per message.
- **5 AI models** — `gpt-4o-mini` (default), `gpt-4.1`, `gpt-4o`, `claude-sonnet-4`, `gemini-2.0-flash`, with automatic fallback.
- **Cloud persistence** — documents, chats, and settings saved to private per-user Puter KV storage.
- **PWA** — installable; production-ready `nginx.conf` with SPA fallback, gzip, caching, and security headers.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + [htm](https://github.com/developit/htm) (no build step) |
| Styling | Tailwind CSS (CDN) + custom CSS |
| Markdown | marked + DOMPurify |
| PDF | pdfjs-dist (lazy-loaded) |
| Platform | Puter.js v2 (auth, KV, AI, fetch) |
| Retrieval | Custom client-side BM25 |

No `package.json`, no bundler, no backend — static files only.

## Getting Started

Requires internet access (CDN modules + Puter.js).

```bash
# any static server works
npx serve .
# or
python -m http.server 8000
```

Open the URL in your browser, sign in with Puter when prompted, and start uploading documents or click **Load sample** for an instant demo.

## Deployment

### nginx

1. Copy app files to `/usr/share/nginx/html`
2. Place `nginx.conf` at `/etc/nginx/conf.d/nexus.conf`
3. `nginx -t && systemctl reload nginx`

### Docker

```bash
docker run -d -p 80:80 \
  -v $(pwd):/usr/share/nginx/html:ro \
  -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

Also deployable as-is on [Puter Builder](https://builder.puter.com).

## Project Structure

```
├── index.html                 # Entry: CDN loads, import map, Tailwind, PWA
├── manifest.json              # PWA manifest
├── nginx.conf                 # Production static/SPA server config
├── css/styles.css             # Prose/citation/animation styles
├── icons/                     # PWA icons
└── js/
    ├── app.js                 # Root component: auth, state, chat/doc CRUD
    ├── lib/
    │   ├── agent.js           # Agentic loop, 8 tasks, 7 tools, models
    │   ├── rag.js             # BM25 index, chunking, text extraction
    │   ├── storage.js         # Puter cloud KV persistence
    │   ├── samples.js         # Built-in sample documents
    │   └── html.js            # htm binding + helpers
    └── components/
        ├── Chat.js            # Composer, messages, steps trace, sources
        ├── Sidebar.js         # Chat list, user card, KB entry
        ├── KnowledgePanel.js  # Upload/paste/URL drawer, doc preview
        ├── Auth.js            # Login/sign-up page
        └── ui.js              # Buttons, modals, toasts, markdown renderer
```

## How It Works

1. User signs in via Puter auth (popup).
2. Documents are chunked, indexed with BM25, and stored in Puter KV.
3. On send, the agent loop runs: the model plans and calls tools (`search_knowledge_base`, `read_document`, `calculator`, `fetch_webpage`, …).
4. Tool results are registered in a sources registry and returned to the model.
5. The final answer is rendered as sanitized Markdown with clickable `[n]` citations.
6. Clicking a citation opens the document preview with the passage highlighted.
7. Non-tool models or AI failures fall back to one-shot classic RAG with the same citation format.

## Development

There is no build or test toolchain — the project is dependency-free static files. Verify changes by serving the folder and exercising the app in a browser.

## License

No license file is present in this repository.
