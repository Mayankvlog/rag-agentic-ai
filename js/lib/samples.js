export const SAMPLES = [
  {
    name: 'MERN Architecture Guide.md',
    text: `# MERN Stack Architecture Guide

## Overview
MERN is a JavaScript stack made of MongoDB, Express.js, React and Node.js. It lets a team write the database queries, the API server and the user interface in one language.

## MongoDB Atlas
MongoDB Atlas is the managed cloud version of MongoDB. The free M0 cluster provides 512 MB of storage and shared RAM, and is fine for prototypes. The M10 dedicated tier starts at roughly $57 per month and adds dedicated RAM, backups and performance advisor. Atlas Vector Search lets you store embeddings alongside documents and run approximate nearest-neighbour ($vectorSearch) queries, which makes it a popular store for retrieval-augmented generation (RAG).

Recommended indexes for a RAG collection:
- A vector index on the "embedding" field (cosine similarity, 1536 dimensions for OpenAI text-embedding-3-small).
- A regular index on "userId" and "docId" for filtering and deletes.

## Express.js API
Express handles routing and middleware. A typical RAG API exposes:
- POST /api/documents — upload and chunk a document, create embeddings, insert chunks.
- POST /api/chat — run the agent loop: retrieve, call tools, answer.
- GET /api/conversations — list a user's chat history.
Use helmet, express-rate-limit and a JWT auth middleware in production.

## React front end
The React client renders the chat, streams tokens and shows citations. State can be managed with React hooks; TanStack Query is recommended for server state.

## Node.js runtime
Use Node 20 LTS or newer. Keep secrets (MONGODB_URI, OPENAI_API_KEY) in environment variables, never in the repository.

## Chunking strategy
Split documents into chunks of 500 to 1000 characters with 10 to 20 percent overlap. Smaller chunks improve precision; larger chunks preserve context. Store the source document name and chunk index to support citations.

## Risks and open questions
- Cost of embedding very large corpora.
- Latency when the agent performs many tool calls in a row.
- Keeping the vector index in sync when documents are edited or deleted.`,
  },
  {
    name: 'Project Kickoff Notes.txt',
    text: `Project Kickoff — "Atlas Assistant"
Date: March 4, 2025
Attendees: Priya Raman (Product Lead), Marcus Chen (Backend Engineer), Sofia Alvarez (Frontend Engineer), Daniel Okafor (Data Scientist)

Goal
Build an internal agentic RAG assistant that answers employee questions from company handbooks, engineering docs and meeting notes.

Decisions
1. Stack: MERN with MongoDB Atlas Vector Search as the knowledge store.
2. The agent will support multiple tasks: Q&A, summarization, data extraction, drafting emails and generating quizzes for onboarding.
3. Answers must include citations to the source passage.
4. Budget: $1,200 per month for LLM usage and $300 per month for Atlas (M20 tier).

Milestones
- March 21, 2025 — Document ingestion pipeline complete (owner: Marcus).
- April 11, 2025 — Chat UI with citations (owner: Sofia).
- April 25, 2025 — Evaluation set of 200 questions, target 85% answer accuracy (owner: Daniel).
- May 9, 2025 — Internal beta for 50 employees (owner: Priya).

Action items
- Marcus: prototype chunking with 800-character chunks and 120-character overlap.
- Sofia: design the tool-call trace view so users can see what the agent did.
- Daniel: compare BM25 keyword search vs vector search vs hybrid retrieval.
- Priya: collect 30 real employee questions for the evaluation set.

Open questions
- Should the assistant be allowed to browse the public web?
- How long should conversation history be retained? Proposal: 90 days.`,
  },
];
