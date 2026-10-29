import { NextRequest } from "next/server";
import { scrapeLinkedIn, scrapeInstagram, validateLinkedInUrl, validateInstagramUrl } from "@/lib/scrape";
import { analyzePerson } from "@/lib/analyst";
import type { Person } from "@/lib/types";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { linkedinUrl, instagramUrl, name } = body;

    if (!linkedinUrl || !instagramUrl) {
      return new Response(
        JSON.stringify({ error: "Both LinkedIn and Instagram URLs are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!validateLinkedInUrl(linkedinUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid LinkedIn URL format (expected https://linkedin.com/in/...)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!validateInstagramUrl(instagramUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid Instagram URL format (expected https://instagram.com/...)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Set up Server-Sent Events stream for step-by-step progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const personId = `person-live-${Date.now()}`;
          send({ type: "progress", step: "init", message: "Starting agent pipeline..." });

          send({ type: "progress", step: "scraping_linkedin", message: "Extracting verified LinkedIn background..." });
          const linkedin = await scrapeLinkedIn(linkedinUrl);

          send({ type: "progress", step: "scraping_instagram", message: "Reading public Instagram feed & aesthetic..." });
          const instagram = await scrapeInstagram(instagramUrl);

          const resolvedName = name || linkedin.fullName || instagram.fullName || "Anonymous Match";
          const person: Person = {
            id: personId,
            name: resolvedName,
            linkedinUrl,
            instagramUrl,
            avatarUrl: instagram.profileImageUrl || linkedin.profileImageUrl,
            raw: { linkedin, instagram },
            createdAt: new Date().toISOString(),
          };

          send({ type: "progress", step: "analyzing", message: "Agent synthesizing needs, hobbies & values..." });
          const profile = await analyzePerson(person);
          person.profile = profile;

          // Save to data folder if available
          try {
            const dataDir = path.join(process.cwd(), "data");
            const peopleFile = path.join(dataDir, "people.json");
            let peopleList: Person[] = [];
            if (fs.existsSync(peopleFile)) {
              peopleList = JSON.parse(fs.readFileSync(peopleFile, "utf-8"));
            }
            peopleList.unshift(person);
            fs.writeFileSync(peopleFile, JSON.stringify(peopleList, null, 2));
          } catch (e) {
            console.warn("Could not save to file system (read-only environment):", e);
          }

          send({ type: "done", message: "Analysis complete!", person });
          controller.close();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          send({ type: "error", message: `Analysis failed: ${msg}` });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  try {
    const peopleFile = path.join(process.cwd(), "data", "people.json");
    if (!fs.existsSync(peopleFile)) {
      return new Response(JSON.stringify([]), {
        headers: { "Content-Type": "application/json" },
      });
    }
    const data = fs.readFileSync(peopleFile, "utf-8");
    return new Response(data, {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
