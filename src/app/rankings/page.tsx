"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Award, Heart, Sparkles, ExternalLink, Flame } from "lucide-react";
import type { Ranking, Person } from "@/lib/types";

export default function RankingsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/people")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPeople(data);
          setSelectedPersonId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPersonId) return;
    setLoading(true);
    fetch(`/api/rankings?personId=${selectedPersonId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setRanking(data);
        } else {
          setRanking(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setRanking(null);
        setLoading(false);
      });
  }, [selectedPersonId]);

  const activePerson = people.find((p) => p.id === selectedPersonId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Award className="w-7 h-7 text-amber-400" />
          Autonomous Dating Rankings
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Select any candidate to view who fits them best based on prefilter compatibility and simulated date outcomes.
        </p>
      </div>

      {/* Candidate Switcher Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {people.map((p) => {
          const isSelected = p.id === selectedPersonId;
          const avatar =
            p.avatarUrl ||
            p.profile?.photoUrls?.[0] ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPersonId(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-pink-600/20 border-pink-500 text-white shadow-md shadow-pink-500/20"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <img src={avatar} alt={p.name} className="w-5 h-5 rounded-full object-cover" />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Ranking Display */}
      {activePerson && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-neutral-800 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-neutral-800">
            <div>
              <span className="text-xs uppercase font-bold text-pink-400 tracking-wider">
                Ranked Matches For
              </span>
              <h2 className="text-2xl font-bold text-white mt-0.5">{activePerson.name}</h2>
              <p className="text-xs text-neutral-400 mt-1">
                {activePerson.profile?.summary || "Full profile analyzed from public channels."}
              </p>
            </div>

            <Link
              href={`/people/${activePerson.id}`}
              className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold"
            >
              <span>View Full Persona Analysis</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Loading rankings...
            </div>
          ) : !ranking || !ranking.ordered || ranking.ordered.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400 space-y-3">
              <p>No date rankings generated yet for {activePerson.name}.</p>
              <Link
                href={`/dates?target=${activePerson.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-semibold hover:bg-pink-500 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Dates to Generate Rankings</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ranking.ordered.map((entry, index) => {
                const matchedPerson = people.find((p) => p.id === entry.otherId);
                const avatar =
                  matchedPerson?.avatarUrl ||
                  matchedPerson?.profile?.photoUrls?.[0] ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";

                return (
                  <div
                    key={entry.otherId}
                    className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-pink-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-800 text-xs font-bold text-neutral-300">
                        #{index + 1}
                      </div>

                      <img
                        src={avatar}
                        alt={entry.otherName}
                        className="w-12 h-12 rounded-xl object-cover ring-1 ring-neutral-700"
                      />

                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{entry.otherName}</span>
                          {entry.isDateRun && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Simulated Date
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1 max-w-lg">
                          {entry.reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-xs text-neutral-500 block">Match Score</span>
                        <span className="text-lg font-extrabold text-pink-400">
                          {entry.score}
                          <span className="text-xs text-neutral-500 font-normal">/100</span>
                        </span>
                      </div>

                      <Link
                        href={`/people/${entry.otherId}`}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors"
                      >
                        Profile
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
