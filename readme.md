# Nexus — Agentic RAG Workspace

**Line-by-line description of every file in the project.**

This is a serverless, client-side **Agentic RAG** (Retrieval-Augmented Generation) web app. It is a multi-task AI agent that plans, searches the user's own uploaded documents (PDFs, notes, web pages), calls tools (calculator, web fetch, memory), and answers with inline citations. Built with React 18 + htm (no build step), Tailwind CSS, and the Puter.com platform for auth, cloud KV storage, and free AI model access.

## Project structure

```
.
├── index.html            # Entry point, CDN loads, PWA hooks, loading spinner
├── manifest.json         # PWA manifest (installable app)
├── nginx.conf            # Production static-server / SPA config
├── icon.svg              # App logo (network graph icon)
├── css/styles.css        # Custom styles: prose, citations, animations
├── icons/                # PNG app icons (192, 512, maskable, apple-touch)
├── js/
│   ├── app.js            # Root component: state, auth, KB, chats, layout
│   ├── lib/
│   │   ├── html.js       # htm binding + uid/cx/timeAgo/formatBytes helpers
│   │   ├── rag.js        # Retrieval engine: chunking, BM25 index, extraction
│   │   ├── agent.js      # Agentic loop: tools, prompts, fallback RAG
│   │   ├── storage.js    # Persistence layer over Puter cloud KV
│   │   └── samples.js    # Two built-in sample documents
│   └── components/
│       ├── ui.js         # Primitives: Icon, Button, Markdown, Modal, Toasts
│       ├── Chat.js       # Composer, Welcome, MessageList, Steps, Sources
│       ├── Sidebar.js    # Left navigation: chats list, user, KB entry
│       ├── KnowledgePanel.js # Right drawer: upload/paste/URL, doc list, preview
│       └── Auth.js       # Login / Sign-up page
└── .puter/               # Puter builder screenshots
```

---

## `index.html` (62 lines)

| Lines | Description |
|---|---|
| 1–3 | `<!DOCTYPE html>`, opens `<html lang="en">` and `<head>`. |
| 4–9 | **Inline error-reporting bootstrap script.** |
| 5 | `window.onerror` — catches any uncaught JS error and forwards it to the parent frame as a `postMessage` of type `app-error` (message, source file, line, column, stack). |
| 6 | `window.onunhandledrejection` — same for unhandled promise rejections, prefixing "Unhandled promise rejection:". |
| 7 | Capt-phase `error` listener — detects a `<script>` tag that failed to load and reports `Failed to load script: <url>` to the parent. |
| 8 | **`fetch` monkey-patch** — wraps `window.fetch` so that any HTTP 500 response or network failure is cloned and forwarded to the parent as `fetch-error` with URL, status, and body. The original fetch is still returned unchanged. |
| 10 | Loads `https://builder.puter.com/runtime.js` (deferred) — the Puter builder runtime that hosts the app. |
| 11–14 | Standard meta tags: UTF-8 charset, responsive viewport, brand-indigo `#4f46e5` theme color, and a SEO/description tag for the Agentic RAG workspace. |
| 15 | `<title>Nexus — Agentic RAG</title>` — browser tab title. |
| 16 | Sets the favicon to `icon.svg`. |
| 17–18 | Preconnects to Google Fonts and loads **Inter** (400–700) plus **JetBrains Mono** (400–500) via the CSS2 API. |
| 19 | Loads the **Tailwind CSS CDN** runtime script. |
| 20–29 | Configures Tailwind: extends `fontFamily.sans` with Inter and `fontFamily.mono` with JetBrains Mono, and defines a custom `brand` color scale (50 → 700 indigo shades). |
| 30–42 | **Import map** so bare specifiers resolve to esm.sh CDN modules: `react@18.3.1`, `react/jsx-runtime`, `react-dom/client`, `htm@3.1.1`, `lucide-react@0.460.0`, `marked@12.0.2`, `dompurify@3.1.6`. Enables no-build ESM development. |
| 43 | Loads `https://js.puter.com/v2/` — the Puter.js SDK providing global `puter.auth`, `puter.kv`, `puter.ai`, and `puter.net.fetch`. |
| 44 | Links the app stylesheet `css/styles.css`. |
| 45–52 | **Auto-generated PWA block** (`puter-pwa`): manifest link, Apple touch icon, iOS web-app meta tags (capable, status-bar style, title "Nexus"). |
| 53 | Closes `</head>`. |
| 54 | `<body>` with Tailwind classes: white background, zinc text, Inter font, antialiased rendering. |
| 55–59 | `#root` mount point at full viewport height (`100dvh`) containing a centered **spinning loader** (border ring with rotating indigo top border) shown until React mounts. |
| 60 | Loads the ES module entry point `js/app.js`. |
| 61–62 | Closes `</body>` and `</html>`. |

---

## `manifest.json` (38 lines)

| Lines | Description |
|---|---|
| 1 | Opens the JSON object. |
| 2 | `"display": "standalone"` — installed PWA opens without browser chrome. |
| 3–7 | `"display_override"` fallback ladder: `standalone` → `minimal-ui` → `browser`. |
| 8 | `"orientation": "any"` — no orientation lock. |
| 9 | `"id": "./"` — stable PWA identity relative to origin. |
| 10–12 | App name "Nexus — Agentic RAG", short name "Nexus", and the one-line description. |
| 13–14 | `start_url` and `scope` both `"./"` — app starts and is scoped to its own directory. |
| 15–16 | `background_color` and `theme_color` set to brand indigo `#4f46e5`. |
| 17–36 | **Icons array**: `icon-192.png` (purpose `any`), `icon-512.png` (purpose `any`), and `maskable-512.png` (purpose `maskable`, safe zone for Android adaptive icons). Each entry declares `src`, `sizes`, `type: image/png`. |
| 37 | `"generator": "builder.puter.com"` — marks the file as generated by Puter Builder. |
| 38 | Closes the JSON object. |

---

## `nginx.conf` (104 lines)

| Lines | Description |
|---|---|
| 1–10 | Header comments: what the file is, install steps (copy app to `/usr/share/nginx/html`, place config at `/etc/nginx/conf.d/nexus.conf`, `nginx -t && systemctl reload`), plus a Docker one-liner mounting the app and this config into `nginx:alpine`. |
| 12–18 | Commented-out server block that would 301-redirect HTTP → HTTPS once a certificate exists. |
| 20–22 | Active `server` block listening on port 80 for IPv4 and IPv6. |
| 23–24 | Commented `listen 443 ssl http2` lines — enable after obtaining TLS cert. |
| 25 | `server_name _;` — catch-all hostname (placeholder for a real domain). |
| 27–29 | Commented Let's Encrypt `ssl_certificate` / `ssl_certificate_key` paths and TLS 1.2/1.3 protocol restriction. |
| 31–33 | Document root `/usr/share/nginx/html`, default file `index.html`, charset UTF-8. |
| 35 | `client_max_body_size 25m;` — mirrors the app's 25 MB upload limit. |
| 37–44 | **gzip** enabled with `vary`, level 6, min length 1024, proxied allowed, and types for text/CSS/JS/JSON/manifest/SVG. |
| 46–52 | **Security headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling camera/mic/geolocation, and `Cross-Origin-Opener-Policy: unsafe-none` (required because Puter sign-in opens a popup that needs `window.opener`). |
| 54–61 | **JS module location** (`\.m?js$`): forces `application/javascript` MIME for `.js`/`.mjs`, 7-day expiry, `Cache-Control: public, max-age=604800`, nosniff, `try_files $uri =404`. |
| 63–70 | **Static assets location** (css/svg/png/jpg/gif/webp/ico/woff/woff2/ttf): 30-day expiry (`max-age=2592000`), nosniff, access log off, 404 fallback. |
| 72–76 | **`index.html` exact match**: `no-cache, no-store, must-revalidate` so new deploys appear immediately; also nosniff. |
| 78–81 | **SPA fallback**: `try_files $uri $uri/ /index.html` so deep links like `/login` or `/chat/123` serve the shell. |
| 83–94 | Commented-out reverse proxy for an optional Express/Node API at `/api/` — includes WebSocket upgrade headers, `X-Real-IP`/`X-Forwarded-For`/`X-Forwarded-Proto`, and a 120 s read timeout for long agent runs. |
| 96–101 | **Block hidden files** (`location ~ /\.`) — denies `.git`, `.env`, etc., with logging off. |
| 103 | Maps 404 errors back to `/index.html` (SPA route handling). |
| 104 | Closes the server block. |

---

## `icon.svg` (8 lines)

| Lines | Description |
|---|---|
| 1 | SVG root with 64×64 `viewBox`. |
| 2 | Indigo rounded-rect background (`rx=14`, fill `#4f46e5`). |
| 3 | Central white circle (r=7) — the "hub" node. |
| 4–6 | Three white satellite circles (r=4.5) at top-left, top-right, and bottom — the "knowledge/tool" nodes. |
| 7 | White stroked paths (width 3.5, round caps) connecting the hub to each satellite — visual metaphor for an agent network / retrieval graph. |

---

## `css/styles.css` (41 lines)

| Lines | Description |
|---|---|
| 1–2 | `html, body { height: 100% }` for full-height layout; `overscroll-behavior: none` stops pull-to-refresh/bounce. |
| 4–6 | `.scroll-thin` — thin 8 px webkit scrollbars: zinc thumb with transparent border + padding-box clip, transparent track. |
| 8 | Comment: Markdown content styles follow. |
| 9 | `.prose-ai` base typography for rendered AI answers: 14.5 px, line-height 1.7, zinc-800 color, word-wrap. |
| 10–11 | Remove top margin on first child and bottom margin on last child of prose blocks. |
| 12 | Paragraph spacing `0.6em`. |
| 13–14 | Headings h1–h4: weight 600, near-black, line-height 1.35; h1 = 1.3em, h2 = 1.15em, h3 = 1.05em. |
| 15–16 | Lists: `0.6em` margins, 1.4em left padding; `ul` = disc, `ol` = decimal. |
| 17–18 | List items `0.25em` apart; markers colored light zinc (`#a1a1aa`). |
| 19 | Links: indigo, underlined with 2 px underline offset. |
| 20 | `strong`: weight 600, near-black. |
| 21 | Inline `code`: JetBrains Mono, 0.85em, light zinc background, 1 px border, 5 px radius. |
| 22–23 | `pre` blocks: dark (`#18181b`) background, light text, 14×16 px padding, 10 px radius, horizontal scroll, 12.5 px font; nested `code` strips its own background/border. |
| 24 | Blockquote: 3 px indigo-tinted left border, 12 px indent, muted text. |
| 25–27 | Tables: full width, collapsed borders, block-level with horizontal scroll, 13 px; cells 6×10 px padded, left-aligned, top-aligned; `th` gets light background and weight 600. |
| 28 | `hr`: single 1 px top border, 1.2em margins. |
| 30–31 | **`.cite` chips**: inline-flex 18 px pill, indigo-50 background/text, 10.5 px semibold, clickable cursor, `!important` no underline; hover darkens to indigo-100. |
| 33–36 | **`.dot-pulse`** typing indicator: three 5 px dots animating opacity/bounce with staggered delays (.15 s / .3 s) via `@keyframes dp`. |
| 38–39 | `.fade-in`: 0.2 s fade + 4 px slide-up entrance animation. |
| 41 | Textareas are non-resizable. |

---

## `js/lib/html.js` (22 lines)

| Lines | Description |
|---|---|
| 1–2 | Imports `React` and `htm`. |
| 4 | **`html`** — `htm.bind(React.createElement)`: tagged-template syntax producing real React elements without JSX or a compiler. |
| 5 | **`uid(p)`** — generates a prefixed unique ID from base-36 timestamp + 6 random base-36 chars (used for chat/message/doc IDs). |
| 6 | **`cx(...a)`** — filters falsy values and joins class names with spaces (mini `classNames`). |
| 8–15 | **`timeAgo(ts)`** — relative timestamps: "just now" (<60 s), "Nm ago", "Nh ago", "Nd ago" (<7 d), else a localized date. |
| 17–22 | **`formatBytes(n)`** — human-readable sizes; divides by 1024 through B/KB/MB/GB, one decimal except for raw bytes; 0 renders "0 B". |

---

## `js/lib/rag.js` (143 lines) — Retrieval engine

| Lines | Description |
|---|---|
| 1 | Header comment: chunking + BM25 ranking over the user's knowledge base, fully client-side. |
| 2 | **`STOP`** — a set of ~120 English stop words used to filter tokens. |
| 4–8 | **`tokenize(text)`** — lowercases, NFKD-normalizes, extracts Unicode letter/number runs, drops tokens ≤ 1 char and stop words, then stems each token. |
| 9–17 | **`stem(w)`** — lightweight suffix stripper: for words > 5 chars strips up to 11 suffixes (`ations→ate` base, `ies→y`, `ing`, `ness`, `ment`, `ed`, `es`, `ly`…) only if ≥ 3 chars remain; for words > 3 chars strips a trailing `s` (unless `ss`). |
| 19–40 | **`chunkText(text, size=900, overlap=150)`** — splits documents into retrieval chunks:<br>• **20–21**: normalize CR and 3+ newlines, return `[]` if empty.<br>• **22–24**: split into paragraphs on blank lines; helper `push` flushes buffer.<br>• **25–27**: greedily append paragraphs while ≤ `size`.<br>• **28**: if a paragraph alone fits, carry the last `overlap` chars of the previous buffer as context.<br>• **29–36**: oversized paragraph → sentence-split on `.!?\n`; accumulate sentences, flush on overflow while retaining overlap, and hard-split any buffer exceeding `size * 1.5`.<br>• **38–39**: final flush, return chunks. |
| 42 | **`class Index`** — BM25 index container. |
| 43 | Constructor initializes `chunks[]`, document-frequency map `df`, and `avgLen = 1`. |
| 45–58 | **`build(docs)`** — for each doc `{id,name,text}`: chunk it, tokenize `name + text` (filename boosts match), compute term-frequency map `tf`, increment `df` per distinct term, push chunk record `{docId, docName, idx, text, tf, len}`; finally compute mean chunk length `avgLen`. Returns `this` for chaining. |
| 60–87 | **`search(query, k=6, docIds=null)`** — BM25 retrieval:<br>• **61–62**: unique query tokens; bail if empty.<br>• **63**: `N` = corpus size, standard `k1 = 1.4`, `b = 0.75`.<br>• **65–76**: score each chunk (optionally filtered by doc IDs): for each matching term compute IDF `log(1 + (N-df+0.5)/(df+0.5))` and BM25 term weight `f(k1+1)/(f + k1(1-b+b·len/avgLen))`; multiply final score by `1 + 0.15·(hits-1)` to reward multi-term matches.<br>• **77**: sort descending.<br>• **78–84**: **diversify** — cap at 3 chunks per document while filling top `k`.<br>• **85–86**: normalize scores by the top hit (0–1, 3 decimals) and return lightweight hit objects. |
| 89 | Getter **`size`** → number of indexed chunks (shown in the header UI). |
| 92–100 | **Lazy PDF.js loader**: caches the dynamic import of `pdfjs-dist@4.4.168` from jsDelivr and sets its worker source. |
| 102–119 | **`extractText(file)`** — file → plain text:<br>• **104–114**: PDFs (by extension or MIME) → load pdf.js, open document from `ArrayBuffer`, iterate pages, join each page's text items (honoring `hasEOL` newlines), separate pages with blank lines.<br>• **115**: other files read via `file.text()`.<br>• **116**: HTML → `htmlToText`.<br>• **117**: JSON → pretty-printed (raw on parse failure).<br>• **118**: everything else (txt, md, csv, code…) returned as-is. |
| 121–127 | **`htmlToText(html)`** — parses with `DOMParser`, removes `script/style/noscript/svg/nav/footer/iframe`, prepends the document `<title>`, extracts body text, collapses spaces/tabs and multi-blank-lines, trims. |
| 129–143 | **`fetchUrlText(url)`** — three-tier fetching:<br>• **131–133**: try `puter.net.fetch` (CORS-friendly on Puter).<br>• **134–136**: fall back to native `fetch`.<br>• **137**: fall back to the `allorigins.win` CORS proxy.<br>• **138–140**: non-OK status throws; read body and content-type.<br>• **141–142**: HTML responses (by content-type or sniffed `<html`) are converted to text; otherwise the raw body is returned. |

---

## `js/lib/storage.js` (86 lines) — Persistence layer

| Lines | Description |
|---|---|
| 1–2 | Header: Puter cloud KV, private per signed-in user; document bodies split into parts to stay under KV size limits. |
| 3 | `P = 'nexus:'` — key namespace prefix. |
| 4 | `PART = 60000` — max characters stored per KV entry. |
| 6–10 | **`errMsg(e)`** — normalizes any error shape (string, `message`, nested `error.message`, string `error`, or JSON dump) into a readable string; re-exported at line 86. |
| 12–22 | **`kvGet(key, fallback)`** — reads `nexus:<key>`, returns `fallback` on null/undefined/failure; auto-`JSON.parse`s string values; logs warnings instead of throwing. |
| 23–26 | **`kvSet(key, value)`** — JSON-serializes and writes; wraps failures as "Could not save to cloud: …". |
| 27 | **`kvDel(key)`** — best-effort delete (errors swallowed). |
| 30–56 | **`Docs`** object:<br>• **31 `list()`** — reads the doc index array (or `[]`).<br>• **32 `saveIndex(list)`** — persists the index array.<br>• **33–44 `readText(id)`** — reads `doc:<id>:meta` for a `parts` count, fetches all parts in parallel and concatenates; legacy fallback reads `nexus/docs/<id>.txt` from Puter filesystem (returns `''` on failure).<br>• **45–49 `writeText(id, text)`** — computes `parts = ceil(len/60000)`, writes each slice to `doc:<id>:<i>`, then stores `{parts}` meta.<br>• **50–55 `remove(id)`** — deletes every part + meta, and best-effort deletes the legacy file. |
| 59–72 | **`Chats`** object:<br>• **60–61** index list/save (array of `{id,title,updatedAt}`).<br>• **62 `load(id)`** — full message array for one chat.<br>• **63–70 `save(id, messages)`** — **slims** each message before writing: keeps `id/role/content/task/model/ms/error`, truncates each source's text to 800 chars, and reduces steps to `{type,tool,label,args,status,count}` to save KV space.<br>• **71 `remove(id)`** — deletes the chat key. |
| 75–78 | **`Settings`** — get/set `{model}` with default `gpt-4o-mini`. |
| 81–84 | **`Profile`** — get/set signup profile, stamping `updatedAt` on write. |
| 86 | Re-exports `errMsg` for use by `agent.js` / `app.js`. |

---

## `js/lib/samples.js` (68 lines) — Demo documents

| Lines | Description |
|---|---|
| 1 | Exports the `SAMPLES` array of `{name, text}` documents. |
| 2–36 | **Sample 1 — "MERN Architecture Guide.md"**: a Markdown doc covering the MERN stack overview, MongoDB Atlas tiers/pricing/vector-search indexes, a typical RAG Express API surface, React front-end notes, Node runtime/secret handling, a chunking strategy (500–1000 chars, 10–20% overlap), and a "Risks and open questions" list — deliberately rich in facts, numbers, and dates so Q&A/summarize/extract demos return grounded answers. |
| 37–67 | **Sample 2 — "Project Kickoff Notes.txt"**: plain-text meeting notes for "Atlas Assistant" (date, attendees with roles), the goal, four numbered decisions (stack, task coverage, mandatory citations, $1,200 + $300 budgets), four dated milestones with owners, four action items, and two open questions — ideal for summarize/extract/compare demos. |
| 68 | Closes the array. |

---

## `js/lib/agent.js` (266 lines) — The agentic RAG loop

| Lines | Description |
|---|---|
| 1–3 | Header comment + imports `fetchUrlText` (web tool) and `errMsg` (error formatting). |
| 5 | `DEFAULT_MODEL = 'gpt-4o-mini'` — fallback model. |
| 7 | `AI_TIMEOUT = 90000` — 90-second ceiling per AI call. |
| 9–15 | **`withTimeout(promise, ms, label)`** — `Promise.race` against a rejecting timer; clears the timer when the real promise settles. |
| 17–24 | **`callOnce(messages, opts)`** — single AI request with guards: throws if `puter.ai` is missing ("not loaded") or the user is signed out; wraps `puter.ai.chat` in the timeout; rejects empty responses and `success === false` payloads. |
| 26–42 | **`aiChat(messages, opts)`** — retry cascade:<br>• builds attempts: the requested model → `gpt-4o-mini` (if different) → Puter's own default (no `model` key).<br>• tries each in order; **stops early** on fatal errors containing "signed out", "not loaded", "insufficient", "funds", or "usage limit".<br>• rethrows the last error message. |
| 44–50 | **`MODELS`** — selectable models with labels/notes: GPT-4o mini (Fast), GPT-4.1 (Balanced), GPT-4o (Capable), Claude Sonnet 4 and Gemini 2.0 Flash (auto-fallback). |
| 52–74 | **`TASKS`** — seven task modes, each `{id, label, icon, desc, prompt, starters}`:<br>• **53–55 `qa`** — Research Q&A; prompt mandates thorough multi-query KB search; 3 starter questions.<br>• **56–58 `summarize`** — TL;DR → bullets → details; tells the model to `read_document` for whole-doc summaries.<br>• **59–61 `compare`** — search items separately, output a markdown table then analysis/recommendation.<br>• **62–64 `extract`** — structured entities/dates/numbers as tables or JSON, exhaustive and precise.<br>• **65–67 `write`** — grounded drafts (emails/reports/posts), draft first, minimal commentary.<br>• **68–70 `study`** — tutor mode: quizzes/flashcards, questions first, answer key last.<br>• **71–73 `code`** — code help using KB docs; complete runnable fenced blocks + brief explanation. |
| 76–91 | **`TOOLS`** — OpenAI-style function-calling schema for seven tools:<br>• **77–78 `search_knowledge_base`** (query, top_k 1–10) — semantic search returning citable passages.<br>• **79–80 `list_documents`** — enumerate the KB.<br>• **81–82 `read_document`** (name, page) — paginated full-document read (~6000 chars/page).<br>• **83–84 `calculator`** (expression) — precise arithmetic.<br>• **85–86 `fetch_webpage`** (url) — read a public page.<br>• **87–88 `save_note`** (title, content) — long-term memory write.<br>• **89–90 `get_current_datetime`** — current date/time/timezone. |
| 93–103 | **`calc(expr)`** — safe-ish evaluator: rewrites `^`→`**`, `×`→`*`, `÷`→`/`; verifies every alphabetic token is a member of `Math`; rejects illegal characters; evaluates inside `with(Math){return (…)}`; requires a finite number; rounds to 15 significant digits. |
| 105–112 | **`textOf(msg)`** — extracts plain text from string messages, `{content}` objects, or content-part arrays (`{text}` parts), defaulting to `''`. |
| 114–117 | JSDoc for `runAgent` describing the context contract: `index, docs, readDoc, saveNote, topK, model, task, history, question, useKB, onStep, signal`. |
| 118–123 | **`runAgent(ctx)`** opens: resolves the task mode, creates the `sources[]` citation registry and `steps[]` trace; `emit()` appends a step and pushes a copy to the UI; `update()` patches a step in place and re-emits. |
| 125 | Builds `docList` — bullet list of document names (or `(empty)`). |
| 126–137 | **System prompt**: identity ("Nexus, autonomous agentic RAG assistant"), current task label + its prompt, KB inventory (count + names), and operating rules — plan then use tools; **always search the KB first** when enabled (or note KB disabled/empty); cite facts as `[n]` only with tool-returned numbers; admit KB gaps and label general knowledge; use calculator for non-trivial math; clean concise Markdown. |
| 139–142 | **History handling**: last 10 turns, only user/assistant with non-empty string content, each truncated to 6000 chars; assembled into `messages` as system + history + the new user question. |
| 144 | **Tool gating**: full toolset when KB is on and docs exist; otherwise strips `search_knowledge_base`, `read_document`, and `list_documents`. |
| 146–190 | **`execTool(name, args)`** dispatcher:<br>• **148–158 `search_knowledge_base`** — clamp `top_k` to 1–10, run `index.search`, return a friendly message on no hits; otherwise dedupe/register each hit in `sources` (assigning citation number `[n]`) and join passages with `---` separators, each labeled `[n] (docName, relevance score)`.<br>• **159–160 `list_documents`** — name · chars · date lines.<br>• **161–172 `read_document`** — fuzzy name match (exact → contains → extension-stripped containment), 404-style message listing available docs, paginate 6000-char pages, register the page in `sources` with `idx = -page` so the UI can show "p.N".<br>• **173–174 `calculator`** — runs `calc`.<br>• **175–180 `fetch_webpage`** — fetch, truncate to 8000 chars, register as a `docId: 'web'` source with its URL (opened externally later).<br>• **181–184 `save_note`** — calls `ctx.saveNote`, confirming the save.<br>• **185–186 `get_current_datetime`** — `Date.toString()` + resolved timezone.<br>• **187–188** — unknown-tool message. |
| 192 | `MAX_ITERS = 6` — max agent reasoning turns. |
| 193–205 | **Loop start**: abort check → emit a "think" step ("Planning approach" first, "Reasoning over results" after) → call `aiChat` with tools attached on all but the last iteration → on any AI failure, log a warning, mark the step "Switching to direct retrieval", and jump to `fallback()`. |
| 206–218 | Post-call: re-check abort, mark thinking done, read `res.message`; filter valid `tool_calls`; **if no calls**, extract content via `textOf` (with a `String(res)` fallback), return `fallback()` if still empty, otherwise return `{content, sources, steps}`. |
| 219–230 | **Tool execution**: assign missing call `id`/`type` → push the assistant message with `tool_calls` → for each call: parse JSON arguments (tolerant of objects), emit a "tool" step, execute, update the step to `done` (with result + count) or `error`, and push a `role:'tool'` message truncated to 12000 chars. |
| 232 | If the loop exhausts all 6 iterations, return a step-limit message. |
| 234–258 | **`fallback()`** — classic non-tool RAG:<br>• **236–242**: when KB enabled, emit and run one `search_knowledge_base` on the raw question, capture context text.<br>• **243**: emit a "Composing answer" think step.<br>• **244**: rewrite the system prompt's rules block into a short citation instruction.<br>• **245–253**: single `aiChat` with system + history + a user message embedding `Sources:\n<context ≤14000>` (or just the question); mark step done and return content/sources/steps.<br>• **254–257**: on failure, mark the step as error and rethrow a wrapped message. |
| 261–266 | **`generateTitle(question, model)`** — asks the default model for a 3–6 word conversation title; strips quotes/asterisks/hash marks, trims to 60 chars; on any failure falls back to the first 40 chars of the question. |

---

## `js/components/ui.js` (73 lines) — UI primitives

| Lines | Description |
|---|---|
| 1–5 | Imports React, all lucide icons (`* as L`), `marked`, `DOMPurify`, and the `html`/`cx` helpers. |
| 7–10 | **`Icon`** — resolves a lucide icon by name (falls back to `Circle`) and renders it with size/strokeWidth/className. |
| 12–22 | **`Button`** — variant map (`primary` zinc-900, `brand` indigo-600, `ghost`, `outline`, `danger`) and size map (`sm`, `md`, `lg`, `icon` 32×32); spreads remaining props via htm's `...${p}` and merges classes with `cx`. |
| 24 | Configures `marked` with GitHub-flavored Markdown, no forced line breaks. |
| 26–46 | **`Markdown`** — renders an AI answer:<br>• **28–36** memoized pipeline: `marked.parse` → `DOMPurify.sanitize` → split HTML on `<pre>`/`<code>` boundaries and turn `[n]` (not followed by `(`) into `<a class="cite" data-cite="n">` chips **outside code only**.<br>• **37–40** effect: force `target="_blank" rel="noopener noreferrer"` on external links.<br>• **41–44** click handler: nearest `[data-cite]` triggers `onCite(n)` and prevents default navigation.<br>• **45** renders sanitized HTML in a `.prose-ai` container. |
| 48–66 | **`Modal`** — Escape-key close listener while open (49–53); null when closed (54); fixed overlay with dim backdrop that closes on click, bottom-sheet on mobile / centered card on `sm+`, scrollable body. |
| 68–73 | **`Toasts`** — fixed bottom-center stack (pointer-events-none); each toast is an indigo/zinc pill (red for errors) with a check/alert icon and message, fading in. |

---

## `js/components/Sidebar.js` (52 lines)

| Lines | Description |
|---|---|
| 1–2 | Imports helpers and `Icon`/`Button`. |
| 4 | Signature: chats, active id, select/new/delete callbacks, user/profile, sign-out, doc count, open-KB, and mobile open/close props. |
| 6 | Mobile scrim: fixed dim backdrop shown only below `lg` when `open`, closes on click. |
| 7 | `<aside>` — fixed on mobile, static on `lg+`, 268 px wide, zinc-50 background, right border, slide transition (`translate-x` toggled by `open`). |
| 8–17 | **Header row** (h-14): logo `icon.svg` + "Nexus / Agentic RAG" wordmark; a ghost close button visible only below `lg`. |
| 19–25 | **Action buttons**: full-width "New chat" outline button; "Knowledge base" button with a right-aligned count badge showing `docCount`. |
| 27 | "CONVERSATIONS" uppercase section label. |
| 28–41 | **Scrollable chat list**:<br>• **29**: empty state "No conversations yet".<br>• **30–40**: each row shows title (or "New chat") + `timeAgo(updatedAt)`; active chat gets a white card style, others hover-zinc; a hover-revealed trash button (`e.stopPropagation`) deletes. |
| 43–50 | **Footer user card**: circular avatar with the first letter of profile/username, name, "Synced to cloud" with a green dot, and a ghost sign-out icon button. |
| 51–52 | Closes `</aside>` and the component. |

---

## `js/components/KnowledgePanel.js` (123 lines)

| Lines | Description |
|---|---|
| 1–3 | Imports React, helpers, and `Icon`/`Button`/`Modal`. |
| 5–12 | **`typeIcon(n)`** — maps file extension → lucide icon: `pdf→FileText`, code extensions → `FileCode2`, data extensions (`csv/json/xml/yaml`) → `FileSpreadsheet`, URLs → `Globe`, else `File`. |
| 14 | Props: `open, onClose, docs, chunkCount, onUpload, onAddText, onAddUrl, onDelete, onPreview, busy`. |
| 15–21 | Local state: active tab (`files`/`text`/`url`), drag-over flag, note title/text, URL, filter query, and a hidden file input ref. |
| 23–24 | Derived: `filtered` docs by case-insensitive name match; `totalChars` summed across docs. |
| 26 | **`drop`** — prevents default, clears drag state, forwards dropped files to `onUpload`. |
| 29–30 | Dim backdrop (click to close) + right drawer (`fixed z-50`, full width on mobile / 420 px on `sm+`, slide transition). |
| 31–34 | Header: Library icon + "Knowledge base" title + X close button. |
| 36–42 | **Stats grid** (3 cards): Documents count, Chunks (`chunkCount`), Characters (auto-formatted to `k` above 999). |
| 44–49 | **Tab switcher**: segmented control with Upload / Paste text / Web page (each with icon), active tab styled as a white pill. |
| 51–63 | **Upload tab**: dashed drop zone — `onDragOver`/`onDragLeave`/`onDrop` handlers, click opens the hidden `<input type="file" multiple>`; shows a spinner with "Processing…" while `busy`, else a cloud icon + "Drop files or click to browse" + supported-type hints; the input accepts pdf/txt/md/csv/json/html/xml/yaml/code/sql/log extensions and resets `value` after selection so re-uploading the same file works. |
| 65–72 | **Paste-text tab**: title input (placeholder "Meeting notes"), 6-row textarea, full-width "Add to knowledge base" button (disabled when empty/busy) that submits and clears both fields. |
| 74–79 | **URL tab**: form with `type="url"` input and "Import page" submit button ("Fetching…" while busy) calling `onAddUrl` then clearing the field. |
| 82–87 | **Filter row**: search icon + "Filter documents" input bound to `q`. |
| 89–105 | **Document list** (scrollable):<br>• **90–94**: empty state inviting files/notes/web pages.<br>• **95–104**: each row = type icon (source-aware: Globe/StickyNote/typeIcon), name + meta line (`formatBytes(size‖chars) · N chunks · timeAgo`), click or Eye button → `onPreview`, hover-revealed Trash button → `onDelete`. |
| 106–107 | Closes the aside and the component. |
| 109–123 | **`DocPreview`** modal:<br>• **110–111** ref + effect that scrolls any `<mark>` into center view when text/highlight changes.<br>• **112–117** splits the body into `[before, <mark>highlight</mark>, after]` when the highlight string is present.<br>• **118–122** `Modal` (max-w-3xl, doc name as title) rendering `null`-text as a dot-pulse loader, otherwise the (possibly highlighted) pre-wrapped mono text. |

---

## `js/components/Auth.js` (127 lines)

| Lines | Description |
|---|---|
| 1–3 | Imports. |
| 5–10 | **`FEATURES`** — four selling points shown on the right panel: Agentic reasoning, Retrieval over your docs, Multiple task modes, Private cloud storage (each = icon, title, description). |
| 12 | **`USE_CASES`** — signup dropdown options: Research & study, Work documents, Software development, Content writing, Other. |
| 14–23 | **`Field`** — labeled input wrapper: label, bordered container (red on error, indigo on focus-within), optional left icon slot, and error/hint text underneath. |
| 25 | `inputCls` — shared input class string (h-10, 9 px left padding for the icon, transparent bg). |
| 27–33 | **`AuthPage({onAuth, loading})`** state: mode (`login`/`signup`), name, email, useCase, agree checkbox, errors map. |
| 35 | `switchMode` — changes mode and clears errors. |
| 37–47 | **`submit`**: login → immediate `onAuth({mode})`; signup → validate name ≥ 2 chars, optional email regex, and terms acceptance; only dispatch `onAuth({mode, profile:{name,email,useCase}})` when error-free. |
| 49–59 | Layout shell: two-column (form left, marketing right on `lg+`); logo + "Nexus / Agentic RAG workspace" brand block. |
| 61–62 | Dynamic heading/subheading: "Welcome back" vs "Create your account" and matching copy. |
| 64–68 | **Login/Signup segmented tab control** (two buttons, active = white pill). |
| 70 | `<form noValidate>` with `space-y-4`. |
| 71–90 | **Signup-only fields**: Full name (required, error slot), Email (optional with hint), use-case `<select>` with chevron overlay, and the Terms checkbox + conditional agreement error. |
| 92–96 | **Login-only info card**: key icon + "You'll log in through a secure Puter window. Your password is never shared with this app." |
| 98–102 | **Submit button**: disabled while `loading`; shows a white spinner + "Logging in…/Creating account…" or an icon + "Log in with Puter/Create account". |
| 105–110 | Footer toggle link switching between login and signup. |
| 111 | Trust line: lock icon + "Free · Secure · No API keys required". |
| 115–125 | **Right panel** (hidden below `lg`): "WHY NEXUS" heading and the four `FEATURES` as icon-card + title + description rows. |
| 126–127 | Closes the layout and the component. |

---

## `js/components/Chat.js` (203 lines)

| Lines | Description |
|---|---|
| 1–4 | Imports React, helpers, `Icon`/`Button`/`Markdown`, and `TASKS`/`MODELS`. |
| 6–14 | **`TOOL_META`** — per-tool display metadata: icon + human label for `search_knowledge_base` ("Searched knowledge base for …"), `list_documents`, `read_document` (with page), `calculator`, `fetch_webpage`, `save_note`, `get_current_datetime`. |
| 16–43 | **`Steps`** — agent trace UI:<br>• **17–19** local open toggle; always expanded while `live` (message pending).<br>• **20** renders nothing with no steps.<br>• **23–25** collapsed header button: Workflow icon + "Used N tool(s)" or "Reasoned directly" + chevron.<br>• **26–41** expanded timeline on a left border: each row shows a spinner (running), alert (error), or the tool's icon (done); tool rows use `TOOL_META` labels, think rows use `s.label`; completed tools append "· N results", errors append a 120-char snippet in red. |
| 45–63 | **`Sources`** — citation card grid (2 cols on `sm+`): "SOURCES" label; each button shows a numbered `.cite` chip, document name, `p.N` badge for read-document pages (`idx < 0`), and a 2-line/180-char snippet; the actively clicked citation gets an indigo border/bg; `id="src-i"` allows anchor targeting. |
| 65–97 | **`Message`**:<br>• **66** local `cite` highlight state.<br>• **67–75** **user branch**: right-aligned zinc bubble (max 85%) with optional task-mode chip above it (hidden for default `qa`).<br>• **76–80** `openCite(n)` — sets active citation and opens source `n-1`.<br>• **81–96** **assistant branch**: brand avatar (sparkles), then `<Steps>` (live while pending), a dot-pulse placeholder when pending with no content yet, an error banner (`CircleAlert` in red-50 box), the `<Markdown>` body with clickable citations, `<Sources>` once settled, and an action row: copy button, regenerate button (only on the last message), plus model label + elapsed seconds. |
| 99–120 | **`Dropdown`** — generic popover select: outside-click closes (101–105); trigger shows current item icon/label + chevron; panel opens up (`bottom-10`) by default, lists options with icon, label, description/note, and a check on the active one. |
| 122–153 | **`Composer`**:<br>• **123–128** textarea state + auto-grow effect (max 200 px).<br>• **129–132** listens for the `nexus:prefill` custom event to fill and focus (used by Welcome starters).<br>• **133** `submit` — ignores empty/busy, sends trimmed text, clears the box.<br>• **136–139** textarea: Enter sends, Shift+Enter newline, IME-composition aware; placeholder changes when docs exist.<br>• **140–146** toolbar: task `Dropdown`, model `Dropdown`, and a "RAG on/off" toggle button (indigo when on).<br>• **148–150** trailing button: Stop (square icon) while busy, else Send (arrow, disabled when empty). |
| 155–193 | **`Welcome`** empty state:<br>• **156** resolves the active task.<br>• **159–161** brain icon, "What should we work on?" headline, and the agent description.<br>• **163–174** when `docCount === 0`: empty-KB card with "Load sample" (calls `onSample`) and "Add docs" buttons.<br>• **176–186** "TASK MODE" grid of all 7 tasks (2/4 columns), active card highlighted indigo.<br>• **188–191** the active task's starter prompts, each firing `nexus:prefill` via `onStarter`. |
| 195–203 | **`MessageList`** — centered column of `<Message>`s with a scroll anchor `<div ref>`; effect auto-scrolls to bottom when message count, last step count, or last content changes. |

---

## `js/app.js` (321 lines) — Root component & orchestration

| Lines | Description |
|---|---|
| 1–9 | Imports: React, `createRoot`, `html`/`uid`, UI primitives, `Sidebar`, `KnowledgePanel`/`DocPreview`, chat components, storage APIs, and `AuthPage`. |
| 11–25 | **`ErrorBoundary`** — class component: captures derived error state (13), logs to console (14), renders children normally (16) or a centered "Something went wrong" card with the error message and a Reload button (17–23). |
| 26–28 | More imports (placed after the class): `Index/chunkText/extractText/fetchUrlText`, `runAgent/generateTitle`, and `SAMPLES`. |
| 30–53 | **`App` state**:<br>• **31–34** auth (`checking/out/in`), `signingIn`, `user`, `profile`.<br>• **36–41** `docs[]`, `texts` ref (id → full text cache), `Index` instance, `chats[]`, `activeId`, `messages[]`.<br>• **43–48** `task`, `model`, `useKB`, `busy`, `kbBusy`, `abortRef` (AbortController).<br>• **50–53** `sideOpen`, `kbOpen`, `preview {doc,text,highlight}`, `toasts[]`. |
| 55–59 | **`toast(msg, type)`** — pushes an id'd toast and auto-removes it after 3.2 s. |
| 61–69 | **Auth bootstrap effect**: if `puter.auth.isSignedIn()` load the user and go `in`, else `out`; any failure → `out`. |
| 71–87 | **`signIn({mode, profile})`** — sets `signingIn`, runs `puter.auth.signIn()`, throws if still signed out ("cancelled"), fetches the user; on signup stores the profile (`createdAt`) and greets by first name; on login just confirms; errors toast `errMsg`; `finally` clears `signingIn`. |
| 88 | **`signOut()`** — Puter sign-out + wipes every piece of local state (user, profile, docs, chats, messages, active id, text cache). |
| 91–93 | **`rebuild(list)`** (useCallback) — constructs a fresh `Index` from the doc list using cached texts and replaces `index` state. |
| 95–106 | **Data-load effect** (on `authState === 'in'`): parallel-fetches docs, chats, settings, profile; sorts chats by `updatedAt` desc; applies saved model; stores docs in `docsRef`; loads every document's full text into `texts.current`; then `rebuild()`s the index; failures toast. |
| 108 | **`setModel`** — updates state and persists to Settings. |
| 111–119 | **`addDoc(name, text, meta)`** — trims text, throws if empty, writes via `Docs.writeText`, caches text, and returns a doc record `{id, name, chars, chunks: chunkText(...).length, createdAt, ...meta}`. |
| 120–125 | **`commitDocs(newDocs)`** — prepends new docs to the list, updates state + `docsRef`, saves the index, and rebuilds the search index. |
| 126–127 | `docsRef` mirror kept in sync with `docs` state via effect. |
| 129–144 | **`upload(files)`** — sets `kbBusy`; per file: reject > 25 MB, `extractText`, `addDoc` with `{size, source:'file'}` (errors toast); then `commitDocs` with an "Added N document(s)" toast; finally clears `kbBusy`. |
| 145–150 | **`addText(title, text)`** — paste-note flow: `addDoc` with `source:'note'`, commit, "Note added" toast. |
| 151–160 | **`addUrl(url)`** — `fetchUrlText`, derives a display name by stripping the protocol/www prefix (≤ 80 chars), `addDoc` with `{source:'url', url}`, commit, "Web page imported" toast. |
| 161–168 | **`deleteDoc(id)`** — filters the list, drops the cached text, rebuilds, then persists (`Docs.saveIndex` + `Docs.remove`) with "Document removed" toast. |
| 169–178 | **`loadSamples()`** — iterates `SAMPLES`, `addDoc`s each with file-like meta, commits, toasts "Sample documents loaded". |
| 180–186 | **`openPreview(doc, highlight)`** — sets preview immediately with cached text (or `null` for loader); if text missing, fetches `Docs.readText` and patches the preview only if the same doc is still open. |
| 187–192 | **`openSource(s)`** — `docId === 'web'` sources open `s.url` in a new tab; otherwise find the doc and preview it with the cited passage as highlight; missing docs toast "That document was deleted". |
| 195–199 | **`selectChat(id)`** — aborts any in-flight run, sets active id, closes the mobile sidebar, loads messages (empty on error). |
| 200 | **`newChat()`** — abort, clear active id + messages, close sidebar. |
| 201–206 | **`deleteChat(id)`** — removes from list; if it was active, starts a new chat; persists index + removal (errors ignored). |
| 208–261 | **`send(question, baseMessages)`** — the core send pipeline:<br>• **209–214** create chat id if new; append the user message and a pending empty assistant message (`steps: []`, model recorded).<br>• **215–218** filter history to settled messages, update UI, set `busy`.<br>• **220–222** `patch()` helper to stream step updates into the pending message; new `AbortController`; start timer.<br>• **224–231** if new: prepend a chat entry titled with the first 48 chars, then asynchronously `generateTitle` and persist the improved title.<br>• **235–240** invoke **`runAgent`** with full context (`index`, docs, model, task, useKB, question, history, `topK: 6`, signal, `readDoc` reading through the text cache, `saveNote` creating + committing a note doc, `onStep` patching steps).<br>• **241–249** success → final message with content/sources/steps/`ms`; abort → "Stopped." error message; other errors → console + `errMsg` message.<br>• **250–252** always clears `busy`.<br>• **253–260** replaces the pending message with the final one (guarding against races), saves the chat via `Chats.save`, and bumps + re-sorts the chat index. |
| 263 | **`stop()`** — aborts the current agent run. |
| 264–270 | **`regenerate()`** — finds the last user message; if not busy, restores its task mode and re-`send`s its content against the truncated history. |
| 271 | **`copy(t)`** — clipboard write with success/failure toasts. |
| 272 | **`starter(s)`** — dispatches `nexus:prefill` so the Composer fills itself. |
| 274 | While **checking auth** → centered spinner. |
| 275 | While **signed out** → `<AuthPage>` + toasts. |
| 277 | Resolves `activeChat` for the header title. |
| 279–318 | **Main layout**:<br>• **281–283** `<Sidebar>` with chats, selection handlers, user/profile, sign-out, doc count, KB opener, mobile open/close.<br>• **285–297** header: mobile menu button, chat title (or "New conversation"), a green/zinc status dot with "`N` chunks indexed", a "Knowledge" button, and a new-chat icon button.<br>• **299–303** scroll area: `<Welcome>` when no messages (passing task setters, doc count, starters, sample loader) else `<MessageList>`.<br>• **305–311** composer area: centered `max-w-3xl` `<Composer>` wired to `send`/`stop`/task/model/useKB, plus the disclaimer "The agent can make mistakes. Check the cited sources."<br>• **314–317** `<KnowledgePanel>` (upload/paste/URL/delete/preview), `<DocPreview>`, and `<Toasts>`. |
| 321 | Entry point: `createRoot(#root).render(<ErrorBoundary><App/></ErrorBoundary>)`. |

---

## How the pieces fit together

1. **`index.html`** loads CDNs (Tailwind, Puter.js, esm.sh import map) and mounts the spinner, then boots **`js/app.js`**.
2. **`app.js`** checks Puter auth → shows **`Auth.js`** or the workspace; on sign-in it loads docs/chats/settings from **`storage.js`** (Puter KV) and builds the BM25 **`Index`** from **`rag.js`**.
3. The user adds documents through **`KnowledgePanel.js`** (files via `extractText`, pasted notes, or URLs via `fetchUrlText`); text is chunked (900/150) and indexed client-side.
4. Sending a message runs **`runAgent`** in **`agent.js`**: a system prompt embeds the task mode + doc list, then up to 6 model turns may call `search_knowledge_base`, `read_document`, `list_documents`, `calculator`, `fetch_webpage`, `save_note`, or `get_current_datetime`.
5. Search hits are registered in a `sources[]` registry and returned as numbered `[n]` passages; **`Chat.js`** renders the step trace, **`Markdown`** turns `[n]` into clickable chips, and clicking one opens the source passage highlighted in **`DocPreview`**.
6. Non-tool models (or AI failures) degrade to the classic one-shot RAG **`fallback()`** with the same citation format.
7. Conversations are slimmed and persisted per chat; titles are generated asynchronously; everything syncs privately to the signed-in user's Puter cloud account.
8. For production, **`nginx.conf`** serves the static app with SPA fallback, correct JS MIME types, gzip, cache tiers, and security headers; **`manifest.json`** makes it installable as a PWA.
#   r a g - a g e n t i c - a i  
 # rag-agentic-ai
