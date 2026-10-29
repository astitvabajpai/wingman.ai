/**
 * Quick batch runner script to scrape and discover 25+ real people using Apify,
 * run the token-optimized Gemini Flash analysis, simulate Groq agent dates,
 * and construct the ranking system.
 * 
 * Run with: npx tsx scripts/seed-and-run.ts
 */
import "dotenv/config";
import { discoverAndScrape } from "../src/lib/discover";
import { analyzePerson } from "../src/lib/analyst";
import { prefilterAll, runDates, buildRankings } from "../src/lib/dating-engine";
import fs from "fs";
import path from "path";

async function main() {
  console.log("==================================================");
  console.log("  AGENTIC DATING SITE - FULL PIPELINE BATCH RUN  ");
  console.log("==================================================");

  // 1. Discover and scrape people via Apify
  console.log("\n[Step 1/4] Discovering & scraping 25 real people with LinkedIn + Instagram...");
  const people = await discoverAndScrape(25);
  console.log(`✓ Acquired ${people.length} real candidates.`);

  // 2. Analyst Agent (Gemini Flash)
  console.log("\n[Step 2/4] Running Gemini Flash Profile Analyst on candidates...");
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    console.log(`  (${i + 1}/${people.length}) Analyzing ${p.name}...`);
    try {
      p.profile = await analyzePerson(p);
    } catch (e) {
      console.warn(`    Failed to analyze ${p.name}:`, e);
    }
  }

  // Update master people.json with profiles
  const peopleFile = path.join(process.cwd(), "data", "people.json");
  fs.writeFileSync(peopleFile, JSON.stringify(people, null, 2));

  // 3. Prefilter & Groq Agent Dates
  console.log("\n[Step 3/4] Running Stage 1 Prefilter & Stage 2 Groq Agent Dates...");
  const validPeople = people.filter((p) => !!p.profile);
  console.log(`Running across ${validPeople.length} verified profile candidates.`);

  const prefilterMap = await prefilterAll(validPeople);
  console.log("✓ Prefilter scoring completed.");

  const dates = await runDates(validPeople, prefilterMap, 3, (ev: Record<string, any>) => {
    if (ev.type === "date_start") {
      console.log(`  -> Starting date between ${ev.personAId} and ${ev.personBId} (${ev.scenario})`);
    } else if (ev.type === "date_complete") {
      console.log(`  ✓ Date complete! Score: ${ev.score}`);
    }
  });

  // 4. Gemini Judge & Rankings
  console.log("\n[Step 4/4] Generating comparative rankings & verdicts...");
  const rankings = buildRankings(validPeople, dates, prefilterMap);
  console.log(`✓ Built rankings for ${rankings.length} people.`);

  console.log("\n==================================================");
  console.log("  PIPELINE COMPLETE! All static demo data cached. ");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Fatal error running pipeline:", err);
  process.exit(1);
});
