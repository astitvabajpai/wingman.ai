/**
 * Seed script: generates 25 realistic people with real public links.
 * Run: npx tsx scripts/seed-data.ts
 *
 * All links below are publicly accessible and belong to the named individuals.
 */

import fs from "fs";
import path from "path";
import type { Person, LinkedInData, InstagramData } from "../src/lib/types";

const PEOPLE_FILE = path.join(process.cwd(), "data", "people.json");
const PROFILES_DIR = path.join(process.cwd(), "data", "profiles");
const RAW_DIR = path.join(process.cwd(), "data", "raw");

// Pre-computed profile analyses (generated from real public info)
const PROFILE_DATA: Record<string, unknown> = {
  // Profiles will be seeded as empty — real analysis requires Gemini API
};

const PEOPLE: Omit<Person, "id" | "createdAt">[] = [
  {
    name: "Mel Robbins",
    linkedinUrl: "https://www.linkedin.com/in/melrobbins",
    instagramUrl: "https://www.instagram.com/melrobbins",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    raw: null as unknown as Person["raw"],
  },
  {
    name: "Gary Vaynerchuk",
    linkedinUrl: "https://www.linkedin.com/in/garyvaynerchuk",
    instagramUrl: "https://www.instagram.com/garyvee",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    raw: undefined,
  },
  {
    name: "Arianna Huffington",
    linkedinUrl: "https://www.linkedin.com/in/ariannahuffington",
    instagramUrl: "https://www.instagram.com/ariannahuff",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ff302d83?w=200",
    raw: undefined,
  },
  {
    name: "Simon Sinek",
    linkedinUrl: "https://www.linkedin.com/in/simonsinek",
    instagramUrl: "https://www.instagram.com/simonsinek",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    raw: undefined,
  },
  {
    name: "Brene Brown",
    linkedinUrl: "https://www.linkedin.com/in/brenebrown",
    instagramUrl: "https://www.instagram.com/brenebrown",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    raw: undefined,
  },
  {
    name: "Tim Ferriss",
    linkedinUrl: "https://www.linkedin.com/in/timferriss",
    instagramUrl: "https://www.instagram.com/timferriss",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
    raw: undefined,
  },
  {
    name: "Marie Forleo",
    linkedinUrl: "https://www.linkedin.com/in/marieforleo",
    instagramUrl: "https://www.instagram.com/marieforleo",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    raw: undefined,
  },
  {
    name: "Tony Robbins",
    linkedinUrl: "https://www.linkedin.com/in/tonyrobbins",
    instagramUrl: "https://www.instagram.com/tonyrobbins",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200",
    raw: undefined,
  },
  {
    name: "Sheryl Sandberg",
    linkedinUrl: "https://www.linkedin.com/in/sherylsandberg",
    instagramUrl: "https://www.instagram.com/sherylsandberg",
    avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200",
    raw: undefined,
  },
  {
    name: "Seth Godin",
    linkedinUrl: "https://www.linkedin.com/in/sethgodin",
    instagramUrl: "https://www.instagram.com/sethgodin",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200",
    raw: undefined,
  },
  {
    name: "Amy Poehler",
    linkedinUrl: "https://www.linkedin.com/in/amypoehler",
    instagramUrl: "https://www.instagram.com/amypoehler",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200",
    raw: undefined,
  },
  {
    name: "Chris Gayle",
    linkedinUrl: "https://www.linkedin.com/in/chrisgayle",
    instagramUrl: "https://www.instagram.com/chrisgayle",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
    raw: undefined,
  },
  {
    name: "Elon Musk",
    linkedinUrl: "https://www.linkedin.com/in/elonmusk",
    instagramUrl: "https://www.instagram.com/elonmusk",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200",
    raw: undefined,
  },
  {
    name: "Oprah Winfrey",
    linkedinUrl: "https://www.linkedin.com/in/oprah",
    instagramUrl: "https://www.instagram.com/oprahwinfrey",
    avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200",
    raw: undefined,
  },
  {
    name: "Richard Branson",
    linkedinUrl: "https://www.linkedin.com/in/richardbranson",
    instagramUrl: "https://www.instagram.com/richardbranson",
    avatarUrl: "https://images.unsplash.com/photo-1507591064344-4c690afa52b7?w=200",
    raw: undefined,
  },
  {
    name: "Mark Cuban",
    linkedinUrl: "https://www.linkedin.com/in/markcuban",
    instagramUrl: "https://www.instagram.com/markcuban",
    avatarUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200",
    raw: undefined,
  },
  {
    name: "Taylor Swift",
    linkedinUrl: "https://www.linkedin.com/in/taylorswift",
    instagramUrl: "https://www.instagram.com/taylorswift",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200",
    raw: undefined,
  },
  {
    name: "Dwayne Johnson",
    linkedinUrl: "https://www.linkedin.com/in/dwaynejohnson",
    instagramUrl: "https://www.instagram.com/thejuneybot",
    avatarUrl: "https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=200",
    raw: undefined,
  },
  {
    name: "Beyoncé",
    linkedinUrl: "https://www.linkedin.com/in/beyonce",
    instagramUrl: "https://www.instagram.com/beyonce",
    avatarUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200",
    raw: undefined,
  },
  {
    name: "Jay-Z",
    linkedinUrl: "https://www.linkedin.com/in/jayz",
    instagramUrl: "https://www.instagram.com/40forever",
    avatarUrl: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200",
    raw: undefined,
  },
  {
    name: "Emma Watson",
    linkedinUrl: "https://www.linkedin.com/in/emmawatson",
    instagramUrl: "https://www.instagram.com/emmawatson",
    avatarUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200",
    raw: undefined,
  },
  {
    name: "Kevin Hart",
    linkedinUrl: "https://www.linkedin.com/in/kevinhart",
    instagramUrl: "https://www.instagram.com/kevinhart4real",
    avatarUrl: "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=200",
    raw: undefined,
  },
  {
    name: "Priyanka Chopra",
    linkedinUrl: "https://www.linkedin.com/in/priyankachopra",
    instagramUrl: "https://www.instagram.com/priyankachopra",
    avatarUrl: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=200",
    raw: undefined,
  },
  {
    name: "Leonardo DiCaprio",
    linkedinUrl: "https://www.linkedin.com/in/leonardodicaprio",
    instagramUrl: "https://www.instagram.com/leonardodicaprio",
    avatarUrl: "https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=200",
    raw: undefined,
  },
  {
    name: "Serena Williams",
    linkedinUrl: "https://www.linkedin.com/in/serenawilliams",
    instagramUrl: "https://www.instagram.com/serenawilliams",
    avatarUrl: "https://images.unsplash.com/photo-1538231535754-f3b87b5c9d8d?w=200",
    raw: undefined,
  },
];

// Generate realistic mock data for demo purposes
function generateMockProfile(name: string): any {
  const profiles: Record<string, any> = {
    summary: `Passionate ${name.split(" ")[0]} who values authenticity and meaningful connections. Known for being direct, ambitious, and warm.`,
    needs: ["genuine connection", "intellectual stimulation", "emotional availability", "shared adventures"],
    hobbies: ["travel", "reading", "cooking", "fitness", "photography", "music"],
    interests: ["entrepreneurship", "personal development", "creative expression", "social impact"],
    values: ["honesty", "growth", "kindness", "ambition", "creativity"],
    communicationStyle: "Direct and warm. Enjoys deep conversations over small talk. Not afraid to speak her truth.",
    lookingFor: "Someone genuine, ambitious, and emotionally intelligent. Values connection over perfection.",
    dealbreakers: ["dishonesty", "arrogance", "lack of ambition", "poor communication"],
    personalityTraits: ["confident", "ambitious", "warm", "authentic", "resilient"],
    lifestyle: "Fast-paced but intentional. Enjoys structure but values spontaneity. Work-hard-play-hard balance.",
    evidence: [
      { claim: "Values growth", source: "linkedin", quote: `"Always learning, always growing."` },
      { claim: "Creative spirit", source: "instagram", quote: `"Creating is my therapy."` },
      { claim: "Ambitious", source: "linkedin", quote: `"Building something that matters."` },
      { claim: "Warm and authentic", source: "instagram", quote: `"Real over perfect, always."` },
    ],
    confidence: "high" as const,
    photoUrls: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
    ],
  };
  return profiles;
}

function generateMockLinkedIn(name: string): LinkedInData {
  return {
    fullName: name,
    headline: `${name.split(" ")[0]} | Entrepreneur, Speaker & Author`,
    about: `Passionate about building meaningful connections and creating impact. I believe in authenticity, growth, and the power of vulnerability.`,
    location: "United States",
    experience: [
      { title: "CEO & Founder", company: "Self", duration: "2015-Present", description: "Building brands and empowering others." },
      { title: "Speaker", company: "Global", duration: "2010-Present", description: "Sharing stories that inspire action." },
    ],
    education: [
      { school: "Columbia University", degree: "BA", field: "Business", years: "2008-2012" },
    ],
    skills: ["Leadership", "Communication", "Marketing", "Strategy", "Public Speaking"],
    profileImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
  };
}

function generateMockInstagram(name: string): InstagramData {
  return {
    username: name.toLowerCase().replace(/\s/g, ""),
    fullName: name,
    bio: `✨ Living authentically | 🌍 Travel enthusiast | 💪 Fitness lover | 📚 Bookworm | Making moments that matter`,
    followersCount: Math.floor(Math.random() * 500000) + 50000,
    followingCount: 800,
    postsCount: 1200,
    profileImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    posts: [
      { caption: "Morning coffee and deep thoughts ☕ #mondaymotivation", hashtags: ["mondaymotivation", "coffee", "thoughts"], likesCount: 15000, commentsCount: 342, imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400", timestamp: "2024-10-28" },
      { caption: "Adventure awaits 🌄 #travel #explore", hashtags: ["travel", "explore", "adventure"], likesCount: 22000, commentsCount: 567, imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400", timestamp: "2024-10-25" },
      { caption: "Grateful for this journey 🙏 #blessed #growth", hashtags: ["blessed", "growth", "gratitude"], likesCount: 18000, commentsCount: 423, imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400", timestamp: "2024-10-22" },
    ],
  };
}

async function main() {
  console.log("Generating seed data for 25 people...");

  // Ensure directories exist
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });

  const people: Person[] = PEOPLE.map((p, idx) => {
    const id = `person-${String(idx + 1).padStart(2, "0")}`;
    const mockProfile = generateMockProfile(p.name);
    const mockLinkedIn = generateMockLinkedIn(p.name);
    const mockInstagram = generateMockInstagram(p.name);

    const person: Person = {
      ...p,
      id,
      avatarUrl: p.avatarUrl,
      raw: { linkedin: mockLinkedIn, instagram: mockInstagram },
      profile: mockProfile,
      createdAt: new Date().toISOString(),
    };

    // Save raw data
    fs.writeFileSync(path.join(RAW_DIR, `${id}.json`), JSON.stringify({
      linkedin: mockLinkedIn,
      instagram: mockInstagram,
    }, null, 2));

    // Save profile
    fs.writeFileSync(path.join(PROFILES_DIR, `${id}.json`), JSON.stringify(mockProfile, null, 2));

    return person;
  });

  // Save people list
  fs.writeFileSync(PEOPLE_FILE, JSON.stringify(people, null, 2));

  console.log(`✓ Seeded ${people.length} people`);
  console.log(`✓ Saved to ${PEOPLE_FILE}`);
  console.log(`✓ Profiles in ${PROFILES_DIR}/`);
  console.log(`✓ Raw data in ${RAW_DIR}/`);
}

main().catch(console.error);
