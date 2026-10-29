// ──────────────────────────────────────────────
// Agentic Dating Site — Shared Type Definitions
// ──────────────────────────────────────────────

export interface Person {
  id: string;
  name: string;
  linkedinUrl: string;
  instagramUrl: string;
  avatarUrl?: string;
  raw?: {
    linkedin: LinkedInData;
    instagram: InstagramData;
  };
  profile?: Profile;
  createdAt?: string;
}

export interface LinkedInData {
  fullName?: string;
  headline?: string;
  about?: string;
  location?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    years?: string;
  }>;
  skills?: string[];
  recommendations?: string[];
  profileImageUrl?: string;
}

export interface InstagramData {
  username?: string;
  fullName?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  profileImageUrl?: string;
  posts?: Array<{
    caption?: string;
    hashtags?: string[];
    likesCount?: number;
    commentsCount?: number;
    imageUrl?: string;
    timestamp?: string;
    location?: string;
  }>;
}

export interface Profile {
  summary: string;
  needs: string[];
  hobbies: string[];
  interests: string[];
  values: string[];
  communicationStyle: string;
  lookingFor: string;
  dealbreakers: string[];
  personalityTraits: string[];
  lifestyle: string;
  evidence: Array<{
    claim: string;
    source: "linkedin" | "instagram";
    quote: string;
  }>;
  confidence: "low" | "medium" | "high";
  photoUrls: string[];
}

export interface DateTurn {
  speaker: string;
  speakerId: string;
  text: string;
  timestamp: string;
}

export interface DateRecord {
  id: string;
  personAId: string;
  personBId: string;
  scenario: string;
  turns: DateTurn[];
  score: number;
  chemistry: string;
  friction: string[];
  verdict: string;
  sharedInterests: string[];
  scoreBreakdown: {
    valueAlignment: number;
    communicationFit: number;
    interestOverlap: number;
    goalsAlignment: number;
  };
  completedAt?: string;
}

export interface RankingEntry {
  otherId: string;
  otherName: string;
  score: number;
  reason: string;
  dateId?: string;
  isDateRun: boolean;
}

export interface Ranking {
  personId: string;
  ordered: RankingEntry[];
  computedAt: string;
}

export interface ProgressEvent {
  type: "progress" | "done" | "error";
  step?: string;
  message: string;
  data?: unknown;
}

export interface DateStreamEvent {
  type: "date_start" | "turn" | "turn_delta" | "score" | "date_complete" | "error";
  dateId?: string;
  personAId?: string;
  personBId?: string;
  scenario?: string;
  speaker?: string;
  speakerId?: string;
  text?: string;
  partial?: boolean;
  score?: number;
  verdict?: string;
  dateRecord?: DateRecord;
  message?: string;
}
