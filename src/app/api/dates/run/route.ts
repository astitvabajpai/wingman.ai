import { NextRequest } from "next/server";
import { runDates, prefilterAll, buildRankings } from "@/lib/dating-engine";
import type { Person } from "@/lib/types";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetPersonId = body.personId;

    const peopleFile = path.join(process.cwd(), "data", "people.json");
    if (!fs.existsSync(peopleFile)) {
      return new Response(JSON.stringify({ error: "No people found to date." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let people: Person[] = JSON.parse(fs.readFileSync(peopleFile, "utf-8"));
    // Ensure all have profiles loaded
    const profilesDir = path.join(process.cwd(), "data", "profiles");
    people = people.map((p) => {
      if (!p.profile && fs.existsSync(path.join(profilesDir, `${p.id}.json`))) {
        p.profile = JSON.parse(fs.readFileSync(path.join(profilesDir, `${p.id}.json`), "utf-8"));
      }
      return p;
    }).filter((p) => !!p.profile);

    if (people.length < 2) {
      return new Response(JSON.stringify({ error: "Need at least 2 profiled people to run dates." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send({ type: "status", message: `Prefiltering candidate compatibility across ${people.length} agents...` });
          
          let peopleToPrefilter = people;
          if (targetPersonId) {
            const target = people.find((p) => p.id === targetPersonId);
            if (target) {
              peopleToPrefilter = [target];
            }
          }

          const prefilterMap = await prefilterAll(peopleToPrefilter);
          send({ type: "status", message: "Prefilter complete. Commencing AI dating simulations..." });

          const dates = await runDates(people, prefilterMap, 3, (event) => {
            send(event);
          });

          send({ type: "status", message: "Evaluating dates with AI judge & structuring final rankings..." });
          const rankings = buildRankings(peopleToPrefilter, dates, prefilterMap);

          send({
            type: "complete",
            message: "All dates completed and judged successfully!",
            datesCount: dates.length,
            rankingsCount: rankings.length,
          });
          controller.close();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          send({ type: "error", message: `Dating simulation error: ${msg}` });
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
