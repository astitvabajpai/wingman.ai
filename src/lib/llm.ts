// ──────────────────────────────────────────────────────────────────
// LLM Wrapper — single generate() for Gemini and Groq
// All provider/model choices live in env variables.
// ──────────────────────────────────────────────────────────────────
import { GoogleGenAI, Type } from "@google/genai";
import Groq from "groq-sdk";

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  provider: "gemini" | "groq";
  model: string;
  system: string;
  messages: Message[];
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
}

export async function generate(opts: GenerateOptions): Promise<string> {
  if (opts.provider === "gemini") {
    const config: Record<string, unknown> = {
      temperature: opts.temperature ?? 0.7,
    };
    if (opts.jsonSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = opts.jsonSchema;
    }
    if (opts.maxTokens) {
      config.maxOutputTokens = opts.maxTokens;
    }

    if (opts.system) {
      config.systemInstruction = opts.system;
    }

    const contents = opts.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await gemini.models.generateContent({
      model: opts.model,
      contents,
      config,
    });

    return res.text ?? "";
  }

  // Groq
  const completion = await groq.chat.completions.create({
    model: opts.model,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    response_format: opts.jsonSchema ? { type: "json_object" } : undefined,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 2048,
  });

  return completion.choices[0].message.content ?? "";
}

// Retry with exponential backoff on 429 / 503
export async function generateWithRetry(
  opts: GenerateOptions,
  maxRetries = 4
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generate(opts);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const isRetryable =
        e?.status === 429 || e?.status === 503 || e?.status === 500;
      if (isRetryable && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        console.warn(
          `[LLM] Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms (status ${e?.status})`
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

// Streaming variant for Groq (used for date conversations)
export async function* generateStream(opts: Omit<GenerateOptions, "jsonSchema"> & { provider: "groq" }) {
  const stream = await groq.chat.completions.create({
    model: opts.model,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 1024,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
