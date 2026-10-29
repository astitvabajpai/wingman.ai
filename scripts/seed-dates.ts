/**
 * Seed script: generates mock date conversations and rankings for all 25 people.
 * Run: npx tsx scripts/seed-dates.ts
 */

import fs from "fs";
import path from "path";
import type { Person, DateRecord, Ranking } from "../src/lib/types";

const PEOPLE_FILE = path.join(process.cwd(), "data", "people.json");
const DATES_DIR = path.join(process.cwd(), "data", "dates");
const RANKINGS_DIR = path.join(process.cwd(), "data", "rankings");

// Mock date scenarios and responses
const SCENARIOS = [
  "a cozy coffee shop downtown",
  "a weekend hike at sunset",
  "a bookshop on a rainy afternoon",
  "a rooftop bar with city views",
  "a farmer's market on Sunday morning",
];

const CONVERSATION_TEMPLATES = [
  [
    "Hey! This place has such a nice vibe, don't you think?",
    "Absolutely! I love how relaxed it feels here. So, what brings you out today?",
    "Just wanted to escape the usual routine and enjoy something different. How about you?",
    "Same here! Sometimes you just need a change of scenery to remember what matters.",
    "I completely agree. Speaking of what matters, tell me — what's something you're really passionate about right now?",
    "That's a great question. I've been really into [passion] lately. It keeps me grounded.",
  ],
  [
    "Wow, this view is incredible! Have you been here before?",
    "First time! But it looks amazing. I'm [name], by the way.",
    "Nice to meet you, [name]! I'm [friend]. I come here sometimes when I need inspiration.",
    "Inspiration for what?",
    "Usually work-related stuff, but honestly, I think we all need moments like this to reconnect with ourselves.",
    "I couldn't agree more. It's rare to find that balance these days.",
  ],
];

function generateMockDate(personA: Person, personB: Person): DateRecord {
  const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  const template = CONVERSATION_TEMPLATES[Math.floor(Math.random() * CONVERSATION_TEMPLATES.length)];

  // Customize conversation with real names
  const turns = template.map((line, idx) => ({
    speaker: idx % 2 === 0 ? personA.name : personB.name,
    speakerId: idx % 2 === 0 ? personA.id : personB.id,
    text: line.replace("[name]", personA.name).replace("[friend]", personB.name).replace("[passion]", personA.profile?.interests?.[0] || "learning"),
    timestamp: new Date(Date.now() + idx * 30000).toISOString(),
  }));

  const score = Math.floor(Math.random() * 40) + 45; // 45-85
  const chemistry = score > 70 ? "Strong natural chemistry" : score > 55 ? "Good rapport with some tension" : "Mild connection, needs more time";
  const friction = score > 65 ? [] : ["Different communication styles", "One seems more reserved"];
  const verdict = score > 70 ? "Great potential — both engaged and authentic" : score > 55 ? "Promising but needs deeper conversation" : "Interesting dynamic, but could be challenging";

  return {
    id: `${personA.id}__${personB.id}`,
    personAId: personA.id,
    personBId: personB.id,
    scenario,
    turns,
    score,
    chemistry,
    friction,
    verdict,
    sharedInterests: [
      personA.profile?.interests?.[0] || "travel",
      personB.profile?.interests?.[0] || "reading",
    ].filter((v, i, a) => a.indexOf(v) === i),
    scoreBreakdown: {
      valueAlignment: Math.floor(Math.random() * 30) + 50,
      communicationFit: Math.floor(Math.random() * 25) + 55,
      interestOverlap: Math.floor(Math.random() * 20) + 60,
      goalsAlignment: Math.floor(Math.random() * 25) + 50,
    },
    completedAt: new Date().toISOString(),
  };
}

async function main() {
  console.log("Generating mock dates and rankings...");

  // Load people
  const people: Person[] = JSON.parse(fs.readFileSync(PEOPLE_FILE, "utf-8"));
  console.log(`Loaded ${people.length} people`);

  // Ensure directories exist
  fs.mkdirSync(DATES_DIR, { recursive: true });
  fs.mkdirSync(RANKINGS_DIR, { recursive: true });

  // Generate dates for each person (top 5 matches based on random scores)
  const allDates: DateRecord[] = [];

  for (const person of people) {
    // Create mock dates with 5 random other people
    const shuffled = [...people].sort(() => Math.random() - 0.5);
    const topMatches = shuffled.slice(0, 5);

    for (const match of topMatches) {
      if (match.id === person.id) continue;

      const dateId = [person.id, match.id].sort().join("__");
      const dateFile = path.join(DATES_DIR, `${dateId}.json`);

      // Skip if already exists
      if (!fs.existsSync(dateFile)) {
        const date = generateMockDate(person, match);
        fs.writeFileSync(dateFile, JSON.stringify(date, null, 2));
        allDates.push(date);
      }
    }
  }

  console.log(`✓ Generated ${allDates.length} dates`);

  // Build rankings
  const byId = new Map<string, Person>(people.map((p) => [p.id, p]));
  const dateMap = new Map<string, DateRecord>();
  for (const d of allDates) {
    dateMap.set(`${d.personAId}__${d.personBId}`, d);
    dateMap.set(`${d.personBId}__${d.personAId}`, d);
  }

  for (const person of people) {
    // Create ranking entries
    const entries = people
      .filter((p) => p.id !== person.id)
      .map((other) => {
        const date = dateMap.get(`${person.id}__${other.id}`);
        const score = date ? date.score : Math.floor(Math.random() * 40) + 30;
        return {
          otherId: other.id,
          otherName: other.name,
          score,
          reason: date ? date.verdict : `Prefilter compatibility: ${score}/100`,
          dateId: date?.id,
          isDateRun: !!date,
        };
      })
      .sort((a, b) => b.score - a.score);

    const ranking: Ranking = {
      personId: person.id,
      ordered: entries,
      computedAt: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(RANKINGS_DIR, `${person.id}.json`), JSON.stringify(ranking, null, 2));
  }

  console.log(`✓ Generated rankings for ${people.length} people`);
  console.log("\n✅ Seed complete! Run with: npm run dev");
}

main().catch(console.error);
