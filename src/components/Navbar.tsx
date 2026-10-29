import Link from "next/link";
import { Sparkles, Users, HeartHandshake, Award, Compass } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-neutral-950/80 border-b border-neutral-800/80 text-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform duration-300">
            <HeartHandshake className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            Wingman<span className="text-pink-500">.ai</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-4 text-sm font-medium">
          <Link
            href="/demo"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <Compass className="w-4 h-4 text-pink-400" />
            <span>25-Person Demo</span>
          </Link>

          <Link
            href="/people"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>Profiles</span>
          </Link>

          <Link
            href="/dates"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Live Dates</span>
          </Link>

          <Link
            href="/rankings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Rankings</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
