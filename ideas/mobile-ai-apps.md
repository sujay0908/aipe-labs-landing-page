# Mobile AI apps

Each is small enough for a member to ship in 7 days.

1. **Receipt to expense:** snap a receipt and it is categorized, split and logged.
2. **Voice journal coach:** a 2-minute daily voice note with weekly patterns and prompts.
3. **Plate to macros:** photo a meal and get calories and macros for Indian dishes.
4. **Bill and document explainer:** photo a bill, prescription or notice and get what it means and what to do.
5. **Language tutor by voice:** speaking practice in Hindi, Telugu or English with corrections.

---

## Architecture options

Mobile adds two constraints: never ship model API keys in the app, and camera and audio uploads must stay small and fast. Every option puts a thin backend between the app and the model. Costs are rough monthly figures at ~1,000 monthly users, excluding LLM tokens and store fees (Apple $99 per year, Google Play $25 once).

### Option A: Expo (React Native) + Supabase + Vercel

```
Expo app (iOS / Android)
   ├──► Supabase Auth · Postgres · Storage (photos, audio)
   └──► Vercel API route or Supabase Edge Function ──► LLM API (vision / speech)
             (holds keys, rate-limits per user)
   EAS Build + EAS Update for store builds and over-the-air fixes
```

- **Components:** Expo with Expo Router, expo-camera and expo-audio, Supabase for auth, data and file storage, an Edge Function or Vercel route as the model proxy, RevenueCat for subscriptions.
- **Deployment:** EAS Build to App Store and Play Store; EAS Update ships JavaScript fixes without store review.
- **Cost:** Supabase Pro $25, Vercel Pro $20 or Edge Functions only, EAS free tier. About $25 to $45.
- **Choose it when:** you know React and want one codebase for both stores in 7 days.

### Option B: Flutter + Firebase + Gemini (Firebase AI Logic)

```
Flutter app
   ├──► Firebase Auth · Firestore · Cloud Storage
   ├──► Firebase AI Logic ──► Gemini (multimodal: image, audio)   [protected by App Check]
   └──► Cloud Functions for heavier jobs (weekly summaries, push via FCM)
```

- **Components:** Flutter, Firebase Auth, Firestore with offline sync, Cloud Storage, Firebase AI Logic for calling Gemini from the client without exposing keys, App Check, Cloud Messaging for reminders, Crashlytics.
- **Deployment:** Codemagic or GitHub Actions to build and upload; backend via `firebase deploy`.
- **Cost:** Blaze plan, mostly inside the free tier at this scale. About $0 to $20.
- **Choose it when:** offline-first matters, you want Gemini's native image and audio input, or the team knows Dart.

### Option C: Expo + PocketBase on Fly.io + on-device models

```
Expo app
   ├──► On-device: whisper.cpp (speech to text), small local model where enough
   └──► PocketBase (single Go binary, SQLite, auth, files, realtime) on Fly.io
             └──► Hono proxy ──► OpenRouter (pick model per task)
```

- **Components:** Expo, whisper.rn (whisper.cpp) or the OS speech APIs for on-device transcription, PocketBase as an open-source backend, a small Hono proxy for model calls, OpenRouter to route to cheap or strong models.
- **Deployment:** PocketBase and the proxy as Docker images on Fly.io (Mumbai `bom`) with a persistent volume; EAS for app builds.
- **Cost:** one small Fly machine plus a volume. About $5 to $10, and lower token spend because transcription runs on the phone.
- **Choose it when:** privacy is the pitch (journals, health), or audio volume would make cloud transcription expensive.

### Which option for which idea

| Idea | Option | Idea-specific pieces |
| :--- | :--- | :--- |
| Receipt to expense | A | Photo → Storage → Edge Function with a vision model → structured expense row; splits stored in Postgres. |
| Voice journal coach | C | On-device transcription keeps raw audio on the phone; only text goes to PocketBase; weekly patterns job on the proxy. |
| Plate to macros | B | Gemini vision with a Firestore table of Indian dishes and portions for grounding; offline log syncs later. |
| Bill and document explainer | B | Image to Gemini with a per-document-type prompt (bill, prescription, notice); reminders for due dates via FCM. |
| Language tutor by voice | A | Record → speech-to-text and a realtime voice API through the Vercel proxy; progress and corrections in Supabase. |
