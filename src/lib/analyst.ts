// ──────────────────────────────────────────────────────────────────────────────
// Analyst Agent — Gemini Flash
// Reads trimmed LinkedIn + Instagram data, outputs a structured Profile JSON.
//
// Token optimization strategy:
//   • Input:  pass only the trimmed/normalized data (not raw Apify dump)
//   • Prompt: tight, no fluff — every word earns its place
//   • Output: structured JSON via Gemini responseSchema — no parsing overhead
//   • Images: pass up to 4 Instagram images via Gemini vision (no extra text needed)
//   • Cache:  every profile saved to disk — never re-analyzed
// ──────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import pLimit from "p-limit";
import type { Person, Profile, LinkedInData, InstagramData } from "./types";

function getGeminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_gemini_key" });
}
const PROFILES_DIR = path.join(process.cwd(), "data", "profiles");
const limit = pLimit(4); // 4 concurrent Gemini calls

// ── JSON Schema for structured output ────────────────────────────────────────

const PROFILE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    needs: { type: "array", items: { type: "string" } },
    hobbies: { type: "array", items: { type: "string" } },
    interests: { type: "array", items: { type: "string" } },
    values: { type: "array", items: { type: "string" } },
    communicationStyle: { type: "string" },
    lookingFor: { type: "string" },
    dealbreakers: { type: "array", items: { type: "string" } },
    personalityTraits: { type: "array", items: { type: "string" } },
    lifestyle: { type: "string" },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          source: { type: "string", enum: ["linkedin", "instagram"] },
          quote: { type: "string" },
        },
        required: ["claim", "source", "quote"],
      },
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    photoUrls: { type: "array", items: { type: "string" } },
  },
  required: [
    "summary", "needs", "hobbies", "interests", "values",
    "communicationStyle", "lookingFor", "dealbreakers",
    "personalityTraits", "lifestyle", "evidence", "confidence", "photoUrls",
  ],
};

// ── System prompt (tight, ~250 tokens) ───────────────────────────────────────

const SYSTEM_PROMPT = `You are a dating profile analyst. Given a person's public LinkedIn and Instagram data, output a structured JSON dating profile.

Rules:
- Every claim needs evidence: cite a quote/post/field. Be specific, not generic.
- Infer from BEHAVIOR (what they post, how they write) not just keywords.
- Distinguish stated vs inferred facts.
- DO NOT infer: religion, health, sexuality, politics, ethnicity.
- If data is sparse, lower confidence. Don't fabricate.
- needs/hobbies/interests: 3-6 items each, specific not vague.
- evidence: at least 4 items, mix of LinkedIn and Instagram sources.`;

// ── Analyze one person ────────────────────────────────────────────────────────

export async function analyzePerson(person: Person): Promise<Profile> {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  const cacheFile = path.join(PROFILES_DIR, `${person.id}.json`);

  // Return cached profile if exists
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as Profile;
  }

  const { linkedin, instagram } = person.raw!;
  const userMessage = buildUserMessage(linkedin, instagram);
  const imageUrls = (instagram.posts ?? [])
    .map((p) => p.imageUrl)
    .filter(Boolean)
    .slice(0, 4) as string[];

  const profile = await analyzeWithRetry(userMessage, imageUrls);

  // Inject photo URLs from Instagram
  profile.photoUrls = imageUrls;

  // Cache immediately
  fs.writeFileSync(cacheFile, JSON.stringify(profile, null, 2));
  console.log(`  ✓ Analyzed ${person.name} (confidence: ${profile.confidence})`);
  return profile;
}

// ── Build compact user message ────────────────────────────────────────────────
// Token target: ~400-600 tokens per person (not 4000+)

function buildUserMessage(linkedin: LinkedInData, instagram: InstagramData): string {
  const li = [
    linkedin.fullName && `Name: ${linkedin.fullName}`,
    linkedin.headline && `Title: ${linkedin.headline}`,
    linkedin.location && `Location: ${linkedin.location}`,
    linkedin.about && `About: ${linkedin.about}`,
    linkedin.experience?.length &&
      `Experience:\n${linkedin.experience
        .map((e) => `  - ${e.title} @ ${e.company} (${e.duration})${e.description ? ": " + e.description : ""}`)
        .join("\n")}`,
    linkedin.education?.length &&
      `Education:\n${linkedin.education
        .map((e) => `  - ${e.degree} ${e.field} @ ${e.school}`)
        .join("\n")}`,
    linkedin.skills?.length && `Skills: ${linkedin.skills.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ig = [
    instagram.username && `@${instagram.username}`,
    instagram.bio && `Bio: ${instagram.bio}`,
    instagram.followersCount && `Followers: ${instagram.followersCount.toLocaleString()}`,
    instagram.posts?.length &&
      `Recent posts:\n${instagram.posts
        .slice(0, 8)
        .map((p, i) =>
          [
            `  ${i + 1}.`,
            p.caption && p.caption.slice(0, 150),
            p.hashtags?.length && `[${p.hashtags.slice(0, 6).join(", ")}]`,
            p.location && `📍${p.location}`,
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `=== LINKEDIN ===\n${li}\n\n=== INSTAGRAM ===\n${ig}\n\nAnalyze and return the JSON profile.`;
}

// ── Gemini call with vision ───────────────────────────────────────────────────

async function analyzeWithRetry(
  userMessage: string,
  imageUrls: string[],
  maxRetries = 4
): Promise<Profile> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Build content parts: text + images
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string }; fileData?: { mimeType: string; fileUri: string } }> = [
        { text: userMessage },
      ];

      // Fetch images and attach as inline data (Gemini vision)
      for (const url of imageUrls) {
        try {
          const imgData = await fetchImageAsBase64(url);
          if (imgData) {
            parts.push({ inlineData: { mimeType: imgData.mimeType, data: imgData.data } });
          }
        } catch {
          // Image fetch failed — skip, don't block analysis
        }
      }

      const gemini = getGeminiClient();
      const res = await gemini.models.generateContent({
        model: process.env.ANALYST_MODEL ?? "gemini-2.0-flash",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: PROFILE_SCHEMA,
          temperature: 0.3,
          maxOutputTokens: 1500,
        },
      });

      const text = res.text ?? "{}";
      return JSON.parse(text) as Profile;
    } catch (err: unknown) {
      const e = err as { status?: number };
      if ((e?.status === 429 || e?.status === 503) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 3000 + Math.random() * 1000;
        console.warn(`  ↺ Retry ${attempt + 1}/${maxRetries} in ${Math.round(delay / 1000)}s`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
  throw new Error("analyzeWithRetry: max retries exceeded");
}

// ── Analyze all people ────────────────────────────────────────────────────────

export async function analyzeAll(people: Person[]): Promise<Person[]> {
  const results = await Promise.all(
    people
      .filter((p) => p.raw)
      .map((p) =>
        limit(async () => {
          const profile = await analyzePerson(p);
          return { ...p, profile };
        })
      )
  );
  return results;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const mimeType = res.headers.get("content-type") ?? "image/jpeg";
    const data = Buffer.from(buffer).toString("base64");
    return { data, mimeType };
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
