"use client";

import { useState, useEffect } from "react";
import { Sparkles, Play, Award, MessageSquare, Flame } from "lucide-react";
import type { DateRecord, Person } from "@/lib/types";

export default function DatesLiveFeedPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [completedDates, setCompletedDates] = useState<DateRecord[]>([]);

  useEffect(() => {
    fetch("/api/people")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPeople(data);
          if (data.length > 0) setSelectedPersonId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleStartDates = async () => {
    setIsRunning(true);
    setStatusMessage("Connecting to Groq Dating Simulator & Gemini Judge...");
    setLiveEvents([]);

    try {
      const response = await fetch("/api/dates/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: selectedPersonId || undefined }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.replace("data: ", ""));
              if (event.type === "status") {
                setStatusMessage(event.message);
              } else if (event.type === "turn" || event.type === "date_start" || event.type === "date_complete") {
                setLiveEvents((prev) => [...prev, event]);
              } else if (event.type === "complete") {
                setStatusMessage(event.message);
                setIsRunning(false);
              }
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : "Dating run error");
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-pink-500" />
            Live Agent Dating Simulator
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Watch autonomous AI agents represent real people in conversational first dates.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            disabled={isRunning}
            className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-pink-500"
          >
            <option value="">Date all 25 agents</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleStartDates}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? "Simulating Dates..." : "Run Agent Dates"}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/30 text-xs text-pink-300 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Live Stream Board */}
      <div className="glass-panel p-6 rounded-2xl border border-neutral-800 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-pink-400" />
          Live Agent Dialogue & Judge Verdicts
        </h2>

        {liveEvents.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 text-xs space-y-2">
            <p>No active dates currently running.</p>
            <p className="text-neutral-400">
              Click <strong>"Run Agent Dates"</strong> to watch autonomous agents converse and undergo AI evaluation.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {liveEvents.map((ev, idx) => {
              if (ev.type === "date_start") {
                return (
                  <div key={idx} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between">
                    <span className="font-semibold text-pink-400">
                      Date Started: {ev.personAId} ↔ {ev.personBId}
                    </span>
                    <span className="text-[11px] text-neutral-400 italic">
                      Scenario: {ev.scenario}
                    </span>
                  </div>
                );
              }

              if (ev.type === "turn") {
                return (
                  <div key={idx} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{ev.speaker}</span>
                      <span className="text-[10px] uppercase font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800">
                        Agent Rep
                      </span>
                    </div>
                    <p className="text-neutral-300 leading-relaxed pl-1">
                      {ev.text}
                    </p>
                  </div>
                );
              }

              if (ev.type === "date_complete") {
                return (
                  <div key={idx} className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-400" />
                        AI Judge Evaluation Complete
                      </span>
                      <span className="font-extrabold text-sm text-pink-400">
                        Score: {ev.score}/100
                      </span>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
