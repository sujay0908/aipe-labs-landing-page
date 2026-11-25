# AI apps (web)

Each is small enough for a member to ship in 7 days.

1. **Contract red-flagger:** upload an NDA or contract and get risky clauses flagged in plain language.
2. **Resume tailor:** rewrites a resume for one job description and scores the match.
3. **Meeting to tasks:** turns a call transcript into owners, deadlines and a Notion or Linear import.
4. **Landing page roaster:** paste a URL and get a fix list on copy, offer and CTA.
5. **SQL from questions:** connect Postgres, ask in English, and get the query and a chart.

---

## Architecture options

These are request-response web apps: upload or paste, one or a few LLM calls, show a result. The key choices are where files live, how you stream output and how you keep per-user costs down. Costs are rough monthly figures at ~1,000 monthly users, excluding LLM tokens.

### Option A: Vercel + Supabase (Next.js full stack)

```
Browser ──► Next.js on Vercel (Server Actions, streaming UI)
               │            │
               │            └──► LLM API via Vercel AI SDK (streamed)
               ▼
        Supabase: Auth · Postgres + pgvector · Storage (uploads)
        Stripe / Razorpay webhooks ──► Postgres
```

- **Components:** Next.js App Router, Vercel AI SDK for streaming and structured output, Supabase Auth, Postgres, Storage and pgvector, Upstash Redis for rate limits, Stripe or Razorpay for payments.
- **Deployment:** push to GitHub, Vercel builds previews per PR and deploys `main`. Supabase in ap-south-1.
- **Cost:** Vercel Pro $20, Supabase Pro $25, Upstash free tier. About $45.
- **Choose it when:** default for a 7-day build. One repo, previews per PR, fastest to ship.

### Option B: Firebase + GCP (App Hosting + Cloud Functions + Gemini)

```
Browser ──► Firebase App Hosting (Next.js or Angular)
               │
               ├──► Firebase Auth
               ├──► Cloud Storage for Firebase (uploads) ──► Storage trigger
               │                                               │
               ▼                                               ▼
           Firestore ◄──────────────────────────── Cloud Function (2nd gen)
                                                     ├─► Document AI (OCR / parsing)
                                                     └─► Gemini on Vertex AI (via Genkit)
```

- **Components:** Firebase App Hosting, Auth, Firestore, Cloud Storage, Cloud Functions with Genkit for LLM flows, Document AI for PDFs, BigQuery export for analytics.
- **Deployment:** App Hosting builds on push to GitHub; functions via `firebase deploy`.
- **Cost:** pay-as-you-go Blaze plan, mostly free tier at this scale. About $0 to $25, plus Document AI per page.
- **Choose it when:** the work is event-driven on uploaded files, or you want Google's OCR and Gemini's long context for documents.

### Option C: Open source, self-hosted (FastAPI + Postgres + LiteLLM with Docker on a VPS)

```
Browser ──► Caddy (TLS) ──► SvelteKit or React frontend
                         └─► FastAPI ──► Postgres + pgvector
                                   │──► MinIO (S3-compatible file store)
                                   └──► LiteLLM ──► Claude / OpenAI / Ollama (local model)
           All services in docker-compose, managed with Coolify
```

- **Components:** FastAPI, Postgres + pgvector, MinIO, LiteLLM, optional Ollama for a local model on cheap or private requests, Coolify (open-source Heroku-style panel) for deploys, Plausible for analytics.
- **Deployment:** one VPS (Hetzner, DigitalOcean Bangalore or AWS Lightsail Mumbai) with docker-compose; Coolify redeploys on push.
- **Cost:** a 4 GB VPS at $6 to $25. Add a GPU box only if you run local models seriously.
- **Choose it when:** customers want data kept on your server, you connect to their databases, or you want a fixed bill.

### Which option for which idea

| Idea | Option | Idea-specific pieces |
| :--- | :--- | :--- |
| Contract red-flagger | B | Upload to Storage → Function → Document AI for text → Gemini with a clause checklist → flagged clauses in Firestore. |
| Resume tailor | A | Server Action takes resume plus JD → structured output (rewritten bullets, match score) → saved in Postgres. |
| Meeting to tasks | A | Transcript upload → structured task list → Notion and Linear APIs for import. |
| Landing page roaster | A | Route fetches the URL (plus a screenshot via a headless browser service) → model returns a fix list. |
| SQL from questions | C | Read-only connection to the user's Postgres stays on your server; schema in pgvector; LiteLLM generates SQL; results charted in the frontend. |
