import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Person, Profile } from "@/lib/types";
import { ArrowLeft, ExternalLink, ShieldCheck, Heart, Sparkles, AlertCircle, Quote, Compass } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;

  const peopleFile = path.join(process.cwd(), "data", "people.json");
  const profileFile = path.join(process.cwd(), "data", "profiles", `${id}.json`);

  let person: Person | null = null;
  if (fs.existsSync(peopleFile)) {
    const list: Person[] = JSON.parse(fs.readFileSync(peopleFile, "utf-8"));
    person = list.find((p) => p.id === id) || null;
  }

  let profile: Profile | null = null;
  if (fs.existsSync(profileFile)) {
    profile = JSON.parse(fs.readFileSync(profileFile, "utf-8"));
  } else if (person?.profile) {
    profile = person.profile;
  }

  if (!person && !profile) {
    notFound();
  }

  const name = person?.name || "Candidate Profile";
  const avatar = person?.avatarUrl || profile?.photoUrls?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Back button */}
      <Link
        href="/people"
        className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to all candidates</span>
      </Link>

      {/* Hero header */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border border-neutral-800">
        <div className="flex items-center gap-5">
          <img
            src={avatar}
            alt={name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-pink-500/30 shadow-lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Agent Active
              </span>
            </div>
            <p className="text-sm text-neutral-400 mt-1 max-w-xl">
              {profile?.summary || "Profile extracted and structured from public LinkedIn & Instagram."}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
              {person?.linkedinUrl && (
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:underline"
                >
                  <span>LinkedIn</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {person?.instagramUrl && (
                <a
                  href={person.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-pink-400 hover:underline"
                >
                  <span>Instagram</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-300">
                Confidence: <strong className="text-emerald-400 capitalize">{profile?.confidence || "High"}</strong>
              </span>
            </div>
          </div>
        </div>

        <Link
          href={`/dates?target=${id}`}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch AI Dates for {name}</span>
        </Link>
      </div>

      {/* Grid of Profile Features */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Core Needs & Values */}
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-2xl border border-neutral-800 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" />
                Core Emotional & Lifestyle Needs
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.needs?.map((need, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs bg-pink-500/10 text-pink-300 border border-pink-500/20"
                  >
                    {need}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-neutral-800 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Guiding Values
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.values?.map((val, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20"
                  >
                    {val}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-neutral-800 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Dealbreakers
              </h2>
              <ul className="space-y-1.5 text-xs text-neutral-400">
                {profile.dealbreakers?.map((d, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 2: Interests, Hobbies, Lifestyle */}
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-2xl border border-neutral-800 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-400" />
                Hobbies & Active Interests
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.hobbies?.concat(profile.interests || []).slice(0, 8).map((hobby, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  >
                    {hobby}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-neutral-800 space-y-3">
              <h2 className="text-sm font-bold text-white">Communication & Vibe</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {profile.communicationStyle}
              </p>
              <div className="pt-2 border-t border-neutral-800">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                  Lifestyle Rhythm
                </span>
                <p className="text-xs text-neutral-300">{profile.lifestyle}</p>
              </div>
              <div className="pt-2 border-t border-neutral-800">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                  Seeking
                </span>
                <p className="text-xs text-neutral-300">{profile.lookingFor}</p>
              </div>
            </div>
          </div>

          {/* Column 3: Grounded Evidence & Citations */}
          <div className="glass-panel p-5 rounded-2xl border border-neutral-800 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Quote className="w-4 h-4 text-emerald-400" />
                Grounding & Citations
              </h2>
              <p className="text-[11px] text-neutral-400 mt-1">
                Every agent deduction links back to public LinkedIn or Instagram artifacts.
              </p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {profile.evidence?.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{item.claim}</span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        item.source === "linkedin"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                      }`}
                    >
                      {item.source}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 italic">
                    "{item.quote}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
