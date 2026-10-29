import fs from "fs";
import path from "path";
import Link from "next/link";
import { Compass, Sparkles, Award, ArrowRight, ShieldCheck, HeartHandshake } from "lucide-react";
import type { Person, Ranking } from "@/lib/types";

export default function DemoPage() {
  const peopleFile = path.join(process.cwd(), "data", "people.json");
  const rankingsDir = path.join(process.cwd(), "data", "rankings");

  let people: Person[] = [];
  if (fs.existsSync(peopleFile)) {
    try {
      people = JSON.parse(fs.readFileSync(peopleFile, "utf-8"));
    } catch {}
  }

  let totalRankings = 0;
  if (fs.existsSync(rankingsDir)) {
    totalRankings = fs.readdirSync(rankingsDir).filter((f) => f.endsWith(".json")).length;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-10">
      {/* Hero */}
      <div className="glass-panel p-8 rounded-3xl border border-neutral-800 text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 text-xs font-semibold">
          <Compass className="w-3.5 h-3.5" />
          Pre-run 25-Person Showcase
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Fully Autonomous 25-Person Dating Sandbox
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-400">
          Explore the pre-computed dataset where 25 real individuals were analyzed via Gemini Flash, dated by Groq agents, and scored by an AI judge. No typing or waiting required.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/rankings"
            className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-lg shadow-pink-500/20 transition-all flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            <span>Explore Match Rankings</span>
          </Link>
          <Link
            href="/people"
            className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-neutral-300 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-all flex items-center gap-2"
          >
            <span>Browse All 25 Profiles</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-6 rounded-2xl border border-neutral-800 space-y-1">
          <span className="text-xs uppercase font-semibold text-neutral-400">Verified People</span>
          <p className="text-3xl font-extrabold text-white">{people.length}</p>
          <p className="text-xs text-neutral-500">Each with public LinkedIn + Instagram</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-neutral-800 space-y-1">
          <span className="text-xs uppercase font-semibold text-neutral-400">Simulated Dates</span>
          <p className="text-3xl font-extrabold text-pink-400">60-80</p>
          <p className="text-xs text-neutral-500">Groq Llama 3.3 70B conversational turns</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-neutral-800 space-y-1">
          <span className="text-xs uppercase font-semibold text-neutral-400">Full Rankings</span>
          <p className="text-3xl font-extrabold text-purple-400">{totalRankings || people.length}</p>
          <p className="text-xs text-neutral-500">Evaluated on a 0-100 anti-inflation scale</p>
        </div>
      </div>

      {/* Quick Showcase Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Featured Candidates</h2>
          <Link href="/people" className="text-xs text-pink-400 hover:underline">
            View all {people.length} →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.slice(0, 6).map((person) => {
            const avatar =
              person.avatarUrl ||
              person.profile?.photoUrls?.[0] ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";

            return (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                className="glass-panel p-4 rounded-xl border border-neutral-800 hover:border-pink-500/40 transition-all flex items-center gap-3.5 group"
              >
                <img
                  src={avatar}
                  alt={person.name}
                  className="w-12 h-12 rounded-xl object-cover ring-1 ring-neutral-700 group-hover:ring-pink-500 transition-all"
                />
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-pink-400 transition-colors">
                    {person.name}
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-1">
                    {person.profile?.summary || "Analyzed by Gemini"}
                  </p>
                  <span className="text-[10px] text-pink-400 mt-0.5 block font-medium">
                    View profile & evidence →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
