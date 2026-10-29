// ──────────────────────────────────────────────────────────────────
// Scraping via Apify — LinkedIn + Instagram
// ──────────────────────────────────────────────────────────────────
import { ApifyClient } from "apify-client";
import type { LinkedInData, InstagramData } from "./types";

function getApifyClient() {
  return new ApifyClient({ token: process.env.APIFY_TOKEN || "dummy_apify_token" });
}

// ── LinkedIn ───────────────────────────────────────────────────────
export async function scrapeLinkedIn(url: string): Promise<LinkedInData> {
  try {
    console.log(`[Scrape] LinkedIn → ${url}`);
    const client = getApifyClient();
    const run = await client.actor("scrap.io/linkedin-profile-scraper").call(
      { profileUrls: [url] }
    );
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (!items.length) throw new Error("No LinkedIn data returned");
    return normalizeLinkedIn(items[0] as Record<string, unknown>);
  } catch (err) {
    console.error("[Scrape] LinkedIn failed:", err);
    // Return minimal structure so pipeline can continue with low confidence
    return {
      fullName: extractNameFromUrl(url, "linkedin"),
      headline: "",
      about: "",
      location: "",
      experience: [],
      education: [],
      skills: [],
    };
  }
}

// ── Instagram ─────────────────────────────────────────────────────
export async function scrapeInstagram(url: string): Promise<InstagramData> {
  try {
    const username = extractInstagramUsername(url);
    console.log(`[Scrape] Instagram → @${username}`);
    const client = getApifyClient();
    const run = await client.actor("apify/instagram-profile-scraper").call(
      { usernames: [username], resultsLimit: 12 }
    );
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (!items.length) throw new Error("No Instagram data returned");
    return normalizeInstagram(items[0] as Record<string, unknown>);
  } catch (err) {
    console.error("[Scrape] Instagram failed:", err);
    return {
      username: extractInstagramUsername(url),
      bio: "",
      followersCount: 0,
      posts: [],
    };
  }
}

// ── Normalizers ───────────────────────────────────────────────────

function normalizeLinkedIn(raw: Record<string, unknown>): LinkedInData {
  const experience = (
    (raw.experience as Array<Record<string, unknown>>) ?? []
  ).map((e) => ({
    title: String(e.title ?? e.position ?? ""),
    company: String(e.company ?? e.companyName ?? ""),
    duration: String(e.duration ?? e.dateRange ?? ""),
    description: String(e.description ?? ""),
  }));

  const education = (
    (raw.education as Array<Record<string, unknown>>) ?? []
  ).map((e) => ({
    school: String(e.school ?? e.schoolName ?? ""),
    degree: String(e.degree ?? e.degreeName ?? ""),
    field: String(e.fieldOfStudy ?? e.field ?? ""),
    years: String(e.dateRange ?? e.years ?? ""),
  }));

  return {
    fullName: String(raw.fullName ?? raw.name ?? ""),
    headline: String(raw.headline ?? raw.title ?? ""),
    about: String(raw.about ?? raw.summary ?? ""),
    location: String(raw.location ?? raw.geoLocation ?? ""),
    experience,
    education,
    skills: ((raw.skills as string[]) ?? []).slice(0, 20),
    profileImageUrl: String(raw.profilePicture ?? raw.profileImageUrl ?? ""),
  };
}

function normalizeInstagram(raw: Record<string, unknown>): InstagramData {
  const posts = (
    (raw.latestPosts ?? raw.posts) as Array<Record<string, unknown>> ?? []
  ).map((p) => ({
    caption: String(p.caption ?? p.text ?? ""),
    hashtags: extractHashtags(String(p.caption ?? p.text ?? "")),
    likesCount: Number(p.likesCount ?? p.likes ?? 0),
    commentsCount: Number(p.commentsCount ?? p.comments ?? 0),
    imageUrl: String(p.displayUrl ?? p.imageUrl ?? p.url ?? ""),
    timestamp: String(p.timestamp ?? p.takenAt ?? ""),
    location: String(p.locationName ?? p.location ?? ""),
  }));

  return {
    username: String(raw.username ?? ""),
    fullName: String(raw.fullName ?? raw.name ?? ""),
    bio: String(raw.biography ?? raw.bio ?? ""),
    followersCount: Number(raw.followersCount ?? raw.followers ?? 0),
    followingCount: Number(raw.followingCount ?? raw.following ?? 0),
    postsCount: Number(raw.postsCount ?? raw.mediaCount ?? 0),
    profileImageUrl: String(raw.profilePicUrl ?? raw.profileImageUrl ?? ""),
    posts,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

export function extractInstagramUsername(url: string): string {
  const match = url.match(/instagram\.com\/([^/?#]+)/);
  return match?.[1] ?? url;
}

function extractNameFromUrl(url: string, platform: string): string {
  if (platform === "linkedin") {
    const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
    return match?.[1]?.replace(/-/g, " ") ?? "Unknown";
  }
  return "";
}

function extractHashtags(text: string): string[] {
  return (text.match(/#[a-zA-Z0-9_]+/g) ?? []).map((h) =>
    h.replace("#", "")
  );
}

// ── URL validators ────────────────────────────────────────────────

export function validateLinkedInUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/.test(url);
}

export function validateInstagramUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?/.test(url);
}
