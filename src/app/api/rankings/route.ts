import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const personId = searchParams.get("personId");

    const rankingsDir = path.join(process.cwd(), "data", "rankings");
    if (!fs.existsSync(rankingsDir)) {
      return new Response(JSON.stringify({ rankings: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (personId) {
      const filePath = path.join(rankingsDir, `${personId}.json`);
      if (fs.existsSync(filePath)) {
        const ranking = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        return new Response(JSON.stringify(ranking), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Ranking not found for person" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return all available ranking files
    const files = fs.readdirSync(rankingsDir).filter((f) => f.endsWith(".json"));
    const allRankings = files.map((file) => {
      return JSON.parse(fs.readFileSync(path.join(rankingsDir, file), "utf-8"));
    });

    return new Response(JSON.stringify(allRankings), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching rankings";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
