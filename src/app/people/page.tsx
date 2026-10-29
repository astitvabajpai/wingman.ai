import fs from "fs";
import path from "path";
import Link from "next/link";
import type { Person } from "@/lib/types";
import { Sparkles, ArrowRight } from "lucide-react";
import { InstagramIcon, LinkedinIcon } from "@/components/Icons";

export default function PeoplePage() {
  const peopleFile = path.join(process.cwd(), "data", "people.json");
  let people: Person[] = [];

  if (fs.existsSync(peopleFile)) {
    try {
      people = JSON.parse(fs.readFileSync(peopleFile, "utf-8"));
    } catch {}
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Verified Candidates ({people.length})
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Real individuals with verified public LinkedIn and Instagram profiles.
          </p>
        </div>

        <Link
          href="/dates"
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 transition-all flex items-center gap-1.5 shadow-md shadow-pink-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Watch Live Agent Dates</span>
        </Link>
      </div>

      {people.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-4 max-w-md mx-auto">
          <p className="text-neutral-400 text-sm">
            No people found in the dataset yet. Run the discovery script or submit links from the home page.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-semibold hover:bg-pink-500 transition-colors"
          >
            <span>Analyze First Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {people.map((person) => {
            const avatar =
              person.avatarUrl ||
              person.profile?.photoUrls?.[0] ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";

            return (
              <div
                key={person.id}
                className="glass-panel rounded-2xl p-5 border border-neutral-800/80 hover:border-pink-500/40 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3.5">
                    <img
                      src={avatar}
                      alt={person.name}
                      className="w-14 h-14 rounded-xl object-cover ring-1 ring-neutral-700 group-hover:ring-pink-500 transition-all"
                    />
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-pink-400 transition-colors">
                        {person.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={person.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-400 hover:text-blue-400"
                        >
                          <LinkedinIcon className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={person.instagramUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-400 hover:text-pink-400"
                        >
                          <InstagramIcon className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 mt-3 line-clamp-3">
                    {person.profile?.summary || "Profile awaiting Gemini synthesis."}
                  </p>

                  {person.profile?.hobbies && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {person.profile.hobbies.slice(0, 3).map((h, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-800/80 flex items-center justify-between">
                  <Link
                    href={`/people/${person.id}`}
                    className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                  >
                    <span>View Analysis</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link
                    href={`/dates?target=${person.id}`}
                    className="text-[11px] text-neutral-400 hover:text-white"
                  >
                    Simulate Date →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
