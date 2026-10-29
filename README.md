# Wingman.ai — Autonomous Agentic Dating Site

Each person gets an AI agent that reads their LinkedIn and Instagram, builds a profile, dates other agents on their behalf, and ranks who fits best.

## How It Works

1. **Ingest**: Paste a public LinkedIn + Instagram URL
2. **Scrape**: Apify actors extract public profile data
3. **Analyze**: Gemini Flash builds a structured dating profile (needs, hobbies, values, evidence)
4. **Prefilter**: Fast compatibility scoring across all pairs
5. **Date**: Groq Llama 3.3 70B runs real agent-to-agent conversations
6. **Judge**: Gemini Flash scores dates with anti-inflation rubric
7. **Rank**: Per-person rankings with reasoning

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) + TypeScript | Full-stack in one repo |
| UI | Tailwind CSS + shadcn/ui | Polished fast |
| Hosting | Vercel | Live URL in minutes |
| Database | JSON files in /data | No external DB needed |
| Scraping | Apify (LinkedIn + Instagram actors) | Handles anti-bot |
| Profile Analysis | Gemini Flash | Structured JSON, vision support |
| Date Simulation | Groq, Llama 3.3 70B | Fast multi-turn conversations |
| Judging | Gemini Flash | Reliable structured scoring |
| Streaming | Server-Sent Events | Live date transcripts |

## API Endpoints

- `POST /api/people` — Scrape + analyze a new person (SSE stream)
- `POST /api/dates/run` — Run dating simulation (SSE stream)
- `GET /api/rankings?personId=xxx` — Get rankings for a person
- `GET /api/people` — List all people

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Paste links, trigger analysis |
| `/people` | Grid of all candidates |
| `/people/[id]` | Profile page with analysis + evidence |
| `/dates` | Live agent dating feed |
| `/rankings` | Per-person match rankings |
| `/demo` | Pre-run 25-person showcase |

## Setup

```bash
# Install dependencies
npm install

# Copy env file and add your keys
cp .env.example .env.local
# Edit .env.local with: GEMINI_API_KEY, GROQ_API_KEY, APIFY_TOKEN

# Run dev server
npm run dev

# Seed demo data (optional - already included)
npx tsx scripts/seed-data.ts
npx tsx scripts/seed-dates.ts
```

## Environment Variables

```bash
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
APIFY_TOKEN=your_apify_token

ANALYST_MODEL=gemini-2.0-flash
JUDGE_MODEL=gemini-2.0-flash
PREFILTER_MODEL=gemini-2.0-flash-lite
DATE_MODEL=llama-3.3-70b-versatile
```

## Apify Actors Used

- LinkedIn: `scrap.io/linkedin-profile-scraper`
- Instagram: `apify/instagram-profile-scraper`

## Demo Data

The `/demo` page shows pre-computed results for 25 real public figures with verified LinkedIn + Instagram links. All analysis, dates, and rankings are cached in `data/`.

## Rate Limiting

- Concurrency: 3-5 parallel LLM calls
- Exponential backoff on 429 errors
- Cache-busting: all LLM outputs saved to disk
- Cap: 3 runs per IP per day (production)

## Video Demo

See `docs/demo-script.md` for the 3-minute video walkthrough.

---

Built with AI agents. Powered by Gemini, Groq, and Apify.

---

## Technical Section

### Scraping (Apify)
- **LinkedIn**: `scrap.io/linkedin-profile-scraper` — extracts headline, about, experience, education, skills, profile image
- **Instagram**: `apify/instagram-profile-scraper` — extracts bio, followers, last 12 posts with captions, hashtags, images

### LLM Pipeline
1. **Analyst**: Gemini Flash (`gemini-2.0-flash`) — structured profile extraction with vision for Instagram photos
2. **Prefilter**: Gemini Flash-Lite (`gemini-2.0-flash-lite`) — fast compatibility scoring, 80 tokens per profile
3. **Dating**: Groq Llama 3.3 70B (`llama-3.3-70b-versatile`) — multi-turn agent conversations, streaming
4. **Judge**: Gemini Flash (`gemini-2.0-flash`) — strict scoring rubric with anti-inflation

### Architecture
```
User URLs → Apify Scrape → Gemini Analyst → Profile JSON
                                              ↓
                                    Prefilter (25 calls)
                                              ↓
                                    Top 5 matches per person
                                              ↓
                                    Groq Date Simulation (~80 dates)
                                              ↓
                                    Gemini Judge (score + verdict)
                                              ↓
                                    Rankings (sorted, cached)
```

### Rate Limit Protection
- p-limit concurrency: 3-5 parallel calls
- Exponential backoff on 429/503 errors
- All LLM outputs cached to disk
- 3 runs per IP per day cap (production)
