# App ideas

15 product ideas, each small enough for a member to ship in 7 days. Each file also has three architecture options and maps every idea to one.

| File | Option A | Option B | Option C (open source) |
| :--- | :--- | :--- | :--- |
| [Agentic SaaS](agentic-saas.md) | Vercel + Supabase + Inngest | Cloud Run + Cloud Tasks + Vertex AI | LangGraph + FastAPI on Fly.io / Railway |
| [AI apps (web)](ai-apps.md) | Next.js on Vercel + Supabase | Firebase App Hosting + Functions + Gemini | FastAPI + Postgres + LiteLLM, Docker on a VPS |
| [Mobile AI apps](mobile-ai-apps.md) | Expo + Supabase + Vercel proxy | Flutter + Firebase AI Logic | Expo + PocketBase on Fly.io + on-device models |

## Pick for demo day

**GST reconciliation agent.** It's a real Indian pain point and businesses will pay for it.

This folder is excluded from Vercel deploys via `.vercelignore`, so it never ships with the landing page.
