# Agentic SaaS ideas

Each is small enough for a member to ship in 7 days.

1. **GST reconciliation agent:** matches invoices against GSTR-2B and drafts follow-ups to vendors.
2. **PR review agent for small teams:** reviews every pull request against the repo's own conventions and posts fixes.
3. **Lead research agent:** turns a list of company domains into enriched leads with a first-line message for each.
4. **Support triage agent:** reads the support inbox, answers from the docs and escalates the rest with a summary.
5. **Competitor watch agent:** tracks competitors' pricing pages and changelogs, then sends a weekly diff.

---

## Architecture options

Every idea here runs long, multi-step jobs (fetch, reason, call tools, wait, retry). The key choice is where those durable jobs live. Costs are rough monthly figures for the first ~100 paying customers, excluding LLM tokens, which will usually be the largest line.

### Option A: Vercel + Supabase + Inngest (serverless TypeScript)

```
Next.js (Vercel) ──► Supabase Auth / Postgres + pgvector / Storage
       │                         ▲
       ▼                         │
  Inngest functions ──► LLM API (Claude / OpenAI) via Vercel AI SDK
  (durable steps, crons, retries, wait-for-event)
```

- **Components:** Next.js App Router, Vercel AI SDK for tool calling, Inngest for durable multi-step runs and schedules, Supabase for auth, Postgres, row-level security per tenant, pgvector and file storage.
- **Deployment:** `git push` to Vercel; Inngest functions are served from a Next.js route. Supabase in the Mumbai region (ap-south-1) for Indian customer data.
- **Cost:** Vercel Pro $20, Supabase Pro $25, Inngest free tier at first. About $45 to $70.
- **Choose it when:** one TypeScript codebase, fastest path to a demo, jobs finish in minutes, not hours.

### Option B: Firebase + GCP (Cloud Run + Cloud Tasks + Gemini on Vertex AI)

```
Firebase Hosting (web) ──► Firebase Auth
       │
       ▼
Cloud Run API ──► Firestore (tenants, runs) / Cloud Storage (files)
       │
       ├──► Cloud Tasks (queue, retries)  ──► Cloud Run worker ──► Vertex AI (Gemini or Claude)
       └──► Cloud Scheduler (daily / weekly jobs)
```

- **Components:** Firebase Auth and Hosting, Cloud Run for the API and agent workers (any language, up to 60 min per request), Cloud Tasks for the queue, Cloud Scheduler for crons, Firestore, Cloud Storage, Vertex AI for models, Secret Manager for customer API keys.
- **Deployment:** containers via `gcloud run deploy` or Cloud Build on push; region asia-south1 (Mumbai).
- **Cost:** Cloud Run, Tasks and Scheduler mostly inside free tiers at this scale; Firestore and Storage a few dollars. About $5 to $30.
- **Choose it when:** jobs are long or bursty, you want Gemini or Claude billed through one GCP account, or the customer asks for GCP.

### Option C: Open source, self-hosted (LangGraph + FastAPI + Postgres on Fly.io or Railway)

```
React / Next.js frontend (any host)
       │
       ▼
FastAPI (Docker) ──► Postgres + pgvector  (also LangGraph checkpoints)
       │
       ▼
LangGraph agent workers ◄── Redis queue (arq / Celery)
       │
       ▼
LiteLLM proxy ──► Claude / OpenAI / Gemini / local model
Langfuse (self-hosted) for traces and evals
```

- **Components:** LangGraph for stateful agents with human-in-the-loop pauses, FastAPI, Postgres + pgvector, Redis-backed worker queue, LiteLLM to swap model providers, Langfuse for tracing. Alternatives: Mastra (TypeScript) in place of LangGraph, Temporal in place of Redis queues.
- **Deployment:** Docker images on Fly.io (Mumbai region `bom`) or Railway; managed Postgres from the same provider or Neon.
- **Cost:** 2 to 3 small machines plus Postgres and Redis. About $15 to $40.
- **Choose it when:** you need full control of agent state, model portability, or the team is Python-first.

### Which option for which idea

| Idea | Option | Idea-specific pieces |
| :--- | :--- | :--- |
| GST reconciliation agent | B | Cloud Run worker parses GSTR-2B JSON and invoice PDFs (Document AI), Firestore holds match results, Gmail API for vendor follow-ups. Mumbai region for data residency. |
| PR review agent for small teams | A | GitHub App webhook → Inngest function per PR; repo conventions embedded in pgvector. |
| Lead research agent | C | LangGraph graph: fetch site → enrich → score → write first line; batch runs on the Redis queue. |
| Support triage agent | A | Inbox webhook → Inngest; docs in pgvector for retrieval; escalations written to a Supabase table. |
| Competitor watch agent | B | Cloud Scheduler weekly → Cloud Run with headless Chromium snapshots to Cloud Storage → diff → email. |
