"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, ShieldCheck, HeartHandshake, Zap, BrainCircuit, Activity } from "lucide-react";
import { InstagramIcon, LinkedinIcon } from "@/components/Icons";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedinUrl || !instagramUrl) {
      setError("Please provide both a LinkedIn URL and a public Instagram URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setProgressLog(["Initializing your autonomous dating agent..."]);

    try {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinUrl, instagramUrl, name }),
      });

      if (!response.ok && !response.body) {
        throw new Error("Failed to connect to agent pipeline");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", ""));
              if (data.type === "progress") {
                setProgressLog((prev) => [...prev, data.message]);
              } else if (data.type === "done") {
                setProgressLog((prev) => [...prev, "✓ Profile built successfully! Navigating..."]);
                setTimeout(() => {
                  router.push(`/people/${data.person.id}`);
                }, 1200);
              } else if (data.type === "error") {
                setError(data.message);
                setLoading(false);
              }
            } catch {
              // Ignore partial stream chunks
            }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-16 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-pink-600/15 via-purple-600/15 to-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl w-full text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <BrainCircuit className="w-3.5 h-3.5 animate-pulse text-pink-400" />
          Autonomous Agentic Dating Engine
        </div>

        {/* Hero title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Your AI agent goes on dates <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 bg-clip-text text-transparent">
            so you don't have to waste time.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-neutral-400 leading-relaxed">
          Paste your public LinkedIn and Instagram. An AI agent reads your values, needs, and lifestyle, dates other agents on your behalf, and gives you a ranked list of genuine matches.
        </p>

        {/* Form Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-xl mx-auto text-left shadow-2xl relative">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Your Name / Alias (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Chen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500/80 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <LinkedinIcon className="w-3.5 h-3.5 text-blue-400" />
                Public LinkedIn URL
              </label>
              <input
                type="url"
                required
                placeholder="https://www.linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500/80 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                Public Instagram URL
              </label>
              <input
                type="url"
                required
                placeholder="https://www.instagram.com/username"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500/80 transition-colors text-sm"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Agent Analyzing Signals...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Agent & Date 25 People</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Real-time Progress Log */}
          {loading && (
            <div className="mt-5 p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 font-mono text-xs text-neutral-300 space-y-1.5 max-h-40 overflow-y-auto">
              {progressLog.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-pink-400">›</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Public data only • No passwords needed
            </span>
            <Link href="/demo" className="text-pink-400 hover:underline">
              Explore 25-Person Demo →
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left max-w-3xl mx-auto">
          <div className="glass-panel p-4 rounded-xl border border-neutral-800/80">
            <div className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">Gemini Profile Analyst</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Extracts stated needs, hobbies, and evidence-backed traits directly from public posts and career history.
            </p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-neutral-800/80">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">Groq 70B Persona Dates</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Two autonomous agents converse in real-time, testing chemistry, shared values, and potential dealbreakers.
            </p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-neutral-800/80">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2.5">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">Unbiased AI Judge</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Scores chemistry on a rigorous 0-100 rubric with friction points and value alignment breakdown.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
