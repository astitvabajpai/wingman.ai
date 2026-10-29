// ──────────────────────────────────────────────────────────────────────────────
// Dating Engine
// Pipeline: Prefilter (Gemini Flash-Lite) → Dates (Groq) → Judge (Gemini Flash)
//
// Token optimization:
//   • Prefilter: passes only profile summaries (~80 tokens/person), not full profiles
//   • Date prompt: persona card is ~200 tokens, not 2000
//   • Judge: receives trimmed transcript + profile summaries only
//   • All outputs cached to disk — never re-run for demo
// ──────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import pLimit from "p-limit";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { v4 as uuid } from "uuid";
import type { Person, Profile, DateRecord, Ranking, RankingEntry } from "./types";

function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_groq_key" });
}

function getGeminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_gemini_key" });
}

const DATES_DIR = path.join(process.cwd(), "data", "dates");
const RANKINGS_DIR = path.join(process.cwd(), "data", "rankings");

const DATE_MODEL = process.env.DATE_MODEL ?? "llama-3.3-70b-versatile";
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? "gemini-2.0-flash";
const PREFILTER_MODEL = process.env.PREFILTER_MODEL ?? "gemini-2.0-flash-lite";

const SCENARIOS = [
  "a first coffee date at a cozy café",
  "a walk through a weekend farmers market",
  "cooking dinner together at home for the first time",
  "a rainy afternoon in a bookshop",
  "a rooftop cocktail bar on a Friday evening",
  "a casual hike on a scenic trail",
  "a Sunday morning brunch spot",
];

// ── Stage 1: Prefilter ─────────────────────────────────────────────────────
// One call per person → scores all 24 others
// Input: ~80 tokens × 25 people = ~2000 tokens/call × 25 calls ≈ 50k tokens total

export async function prefilterAll(
  people: Person[]
): Promise<Map<string, { otherId: string; score: number }[]>> {
  const limit = pLimit(5);
  const results = new Map<string, { otherId: string; score: number }[]>();

  await Promise.all(
    people.map((person) =>
      limit(async () => {
        const scores = await prefilterOne(person, people);
        results.set(person.id, scores);
      })
    )
  );

  return results;
}

async function prefilterOne(
  person: Person,
  all: Person[]
): Promise<{ otherId: string; score: number }[]> {
  const cacheFile = path.join(DATES_DIR, `prefilter-${person.id}.json`);
  fs.mkdirSync(DATES_DIR, { recursive: true });

  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
  }

  const others = all.filter((p) => p.id !== person.id);
  const myCard = profileCard(person);
  const othersText = others
    .map((o) => `[${o.id}] ${profileCard(o)}`)
    .join("\n");

  const prompt = `My profile:\n${myCard}\n\nCandidates:\n${othersText}\n\nScore each candidate 0-100 for romantic compatibility with me. Return JSON array: [{otherId, score}]`;

  let raw = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const gemini = getGeminiClient();
      const res = await gemini.models.generateContent({
        model: PREFILTER_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                otherId: { type: "string" },
                score: { type: "number" },
              },
              required: ["otherId", "score"],
            },
          },
          temperature: 0.1,
          maxOutputTokens: 500,
        },
      });
      raw = res.text ?? "[]";
      break;
    } catch (e: unknown) {
      const err = e as { status?: number };
      if ((err?.status === 429 || err?.status === 503) && attempt < 3) {
        await sleep(Math.pow(2, attempt) * 3000);
      } else throw e;
    }
  }

  const scores = JSON.parse(raw) as { otherId: string; score: number }[];
  scores.sort((a, b) => b.score - a.score);
  fs.writeFileSync(cacheFile, JSON.stringify(scores, null, 2));
  console.log(`  ✓ Prefilter done for ${person.name}`);
  return scores;
}

// ── Stage 2: Date simulation (Groq) ───────────────────────────────────────

export async function runDates(
  people: Person[],
  prefilterMap: Map<string, { otherId: string; score: number }[]>,
  topN = 3,
  onProgress?: (event: Record<string, any>) => void
): Promise<DateRecord[]> {
  fs.mkdirSync(DATES_DIR, { recursive: true });

  // Build unique pairs: each person's top N
  const pairs = new Set<string>();
  for (const [personId, scores] of prefilterMap) {
    for (const { otherId } of scores.slice(0, topN)) {
      const key = [personId, otherId].sort().join("__");
      pairs.add(key);
    }
  }

  const pairList = Array.from(pairs).map((key) => {
    const [aId, bId] = key.split("__");
    return { aId, bId };
  });

  console.log(`[Dates] Running ${pairList.length} dates with concurrency 10...`);
  const limit = pLimit(10);
  const byPerson = new Map<string, Person>(people.map((p) => [p.id, p]));

  const dates = await Promise.all(
    pairList.map(({ aId, bId }) =>
      limit(async () => {
        const pA = byPerson.get(aId);
        const pB = byPerson.get(bId);
        if (!pA?.profile || !pB?.profile) return null;
        return runSingleDate(pA, pB, onProgress);
      })
    )
  );

  return dates.filter(Boolean) as DateRecord[];
}

async function runSingleDate(
  personA: Person,
  personB: Person,
  onProgress?: (event: Record<string, unknown>) => void
): Promise<DateRecord> {
  const dateId = `${personA.id}__${personB.id}`;
  const cacheFile = path.join(DATES_DIR, `${dateId}.json`);

  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as DateRecord;
  }

  const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  const systemA = personaPrompt(personA, personB.name, scenario);
  const systemB = personaPrompt(personB, personA.name, scenario);

  onProgress?.({ type: "date_start", dateId, personAId: personA.id, personBId: personB.id, scenario });

  const turns: DateRecord["turns"] = [];
  const NUM_TURNS = 4;

  for (let i = 0; i < NUM_TURNS; i++) {
    const isA = i % 2 === 0;
    const speaker = isA ? personA : personB;
    const system = isA ? systemA : systemB;

    // Build conversation history (alternating roles)
    const messages: { role: "user" | "assistant"; content: string }[] = turns.map(
      (t, idx) => ({
        role: idx % 2 === 0 ? "user" : "assistant",
        content: t.text,
      })
    );

    // Add opening context on first turn
    if (i === 0) {
      messages.unshift({
        role: "user",
        content: `You're on ${scenario} with ${personB.name}. Say hello and open with something genuine from your life.`,
      });
    }

    let text = "";
    try {
      const groq = getGroqClient();
      const stream = await groq.chat.completions.create({
        model: DATE_MODEL,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.85,
        max_tokens: 120, // Keep turns snappy — 1-2 sentences each
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        text += delta;
        onProgress?.({ type: "turn_delta", dateId, speakerId: speaker.id, speaker: speaker.name, text: delta });
      }
    } catch (err) {
      console.warn(`[Date] Turn ${i} failed for ${dateId}: ${err}`);
      text = "[...]";
    }

    turns.push({ speaker: speaker.name, speakerId: speaker.id, text, timestamp: new Date().toISOString() });
    onProgress?.({ type: "turn", dateId, speakerId: speaker.id, speaker: speaker.name, text, partial: false });
  }

  // Stage 3: Judge
  const judgeResult = await judgeDate(personA, personB, scenario, turns);

  const record: DateRecord = {
    id: dateId,
    personAId: personA.id,
    personBId: personB.id,
    scenario,
    turns,
    ...judgeResult,
    completedAt: new Date().toISOString(),
  };

  fs.writeFileSync(cacheFile, JSON.stringify(record, null, 2));
  onProgress?.({ type: "date_complete", dateId, score: judgeResult.score });
  console.log(`  ✓ Date ${personA.name} ↔ ${personB.name} → score: ${judgeResult.score}`);
  return record;
}

// ── Stage 3: Judge ─────────────────────────────────────────────────────────

const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number" },
    chemistry: { type: "string" },
    friction: { type: "array", items: { type: "string" } },
    verdict: { type: "string" },
    sharedInterests: { type: "array", items: { type: "string" } },
    scoreBreakdown: {
      type: "object",
      properties: {
        valueAlignment: { type: "number" },
        communicationFit: { type: "number" },
        interestOverlap: { type: "number" },
        goalsAlignment: { type: "number" },
      },
      required: ["valueAlignment", "communicationFit", "interestOverlap", "goalsAlignment"],
    },
  },
  required: ["score", "chemistry", "friction", "verdict", "sharedInterests", "scoreBreakdown"],
};

const JUDGE_SYSTEM = `You are a strict compatibility judge for a dating app. Score a date conversation.

IMPORTANT: Use the FULL score range 20-95. Do not cluster around 80.
- 85+: rare, exceptional match — deep resonance on values AND lifestyle AND communication
- 65-84: genuine compatibility with real potential
- 45-64: some spark but notable friction
- 20-44: fundamental misalignment

Penalize: agents that just agree with everything, generic small talk, no profile-specific details.
Reward: genuine resonance, honest friction, specific callbacks to real interests from their profiles.`;

async function judgeDate(
  personA: Person,
  personB: Person,
  scenario: string,
  turns: DateRecord["turns"]
): Promise<Omit<DateRecord, "id" | "personAId" | "personBId" | "scenario" | "turns" | "completedAt">> {
  const transcript = turns.map((t) => `${t.speaker}: ${t.text}`).join("\n\n");
  const prompt = `Profiles:\n${personA.name}: ${profileCard(personA)}\n${personB.name}: ${profileCard(personB)}\n\nDate scenario: ${scenario}\n\nTranscript:\n${transcript}\n\nScore this date.`;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const gemini = getGeminiClient();
      const res = await gemini.models.generateContent({
        model: JUDGE_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: JUDGE_SYSTEM,
          responseMimeType: "application/json",
          responseSchema: JUDGE_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 600,
        },
      });
      return JSON.parse(res.text ?? "{}");
    } catch (e: unknown) {
      const err = e as { status?: number };
      if ((err?.status === 429 || err?.status === 503) && attempt < 3) {
        await sleep(Math.pow(2, attempt) * 3000);
      } else throw e;
    }
  }
  throw new Error("judgeDate: max retries exceeded");
}

// ── Rankings ───────────────────────────────────────────────────────────────

export function buildRankings(
  people: Person[],
  dates: DateRecord[],
  prefilterMap: Map<string, { otherId: string; score: number }[]>
): Ranking[] {
  fs.mkdirSync(RANKINGS_DIR, { recursive: true });
  const byId = new Map<string, Person>(people.map((p) => [p.id, p]));
  const dateMap = new Map<string, DateRecord>();
  for (const d of dates) {
    dateMap.set(`${d.personAId}__${d.personBId}`, d);
    dateMap.set(`${d.personBId}__${d.personAId}`, d);
  }

  const rankings: Ranking[] = [];

  for (const person of people) {
    const scores = prefilterMap.get(person.id) ?? [];
    const ordered: RankingEntry[] = scores.map(({ otherId, score: preScore }) => {
      const other = byId.get(otherId);
      const date = dateMap.get(`${person.id}__${otherId}`);
      const finalScore = date ? date.score : Math.round(preScore * 0.7);

      return {
        otherId,
        otherName: other?.name ?? otherId,
        score: finalScore,
        reason: date ? date.verdict : `Prefilter compatibility: ${preScore}/100`,
        dateId: date?.id,
        isDateRun: !!date,
      };
    });

    ordered.sort((a, b) => b.score - a.score);
    const ranking: Ranking = {
      personId: person.id,
      ordered,
      computedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(RANKINGS_DIR, `${person.id}.json`),
      JSON.stringify(ranking, null, 2)
    );
    rankings.push(ranking);
  }

  return rankings;
}

// ── Profile card (compact — ~80 tokens) ───────────────────────────────────

export function profileCard(person: Person): string {
  const p = person.profile;
  if (!p) return person.name;
  return [
    person.name,
    p.lifestyle,
    `Needs: ${p.needs.slice(0, 3).join(", ")}`,
    `Values: ${p.values.slice(0, 3).join(", ")}`,
    `Hobbies: ${p.hobbies.slice(0, 3).join(", ")}`,
    `Wants: ${p.lookingFor}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

// ── Persona prompt (compact — ~200 tokens) ────────────────────────────────

function personaPrompt(person: Person, otherName: string, scenario: string): string {
  const p = person.profile!;
  return `You are ${person.name}'s dating agent on ${scenario} with ${otherName}.

Your person:
- Lifestyle: ${p.lifestyle}
- Needs: ${p.needs.join(", ")}
- Values: ${p.values.join(", ")}
- Hobbies: ${p.hobbies.join(", ")}
- Communication style: ${p.communicationStyle}
- Looking for: ${p.lookingFor}
- Dealbreakers: ${p.dealbreakers.join(", ")}

Rules:
- Speak as ${person.name} in first person.
- Ask genuine questions. Reference your actual hobbies/values.
- Be warm but honest — don't agree with everything.
- Keep responses to 2-3 sentences. No lists. Natural conversation.
- Never invent facts not in the profile above.`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
