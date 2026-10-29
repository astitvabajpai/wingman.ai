// ──────────────────────────────────────────────────────────────────────────────
// People Discovery via Apify
// Strategy: Scrape public directories that already surface LinkedIn + Instagram
// links on the same page. Zero manual work, zero LLM tokens for discovery.
//
// Sources (tried in order until we have 30 people):
//   1. Indie Hackers profiles  — indie side/startup community, both socials common
//   2. Product Hunt makers     — tech creators, often have both links in profile
//   3. YC company founders     — scraped from ycombinator.com/companies
//   4. Speaker pages           — Tech conferences with speaker bio pages
// ──────────────────────────────────────────────────────────────────────────────

import { ApifyClient } from "apify-client";
import pLimit from "p-limit";
import fs from "fs";
import path from "path";
import type { Person, LinkedInData, InstagramData } from "./types";
import { validateLinkedInUrl, validateInstagramUrl } from "./scrape";

const client = new ApifyClient({ token: process.env.APIFY_TOKEN! });
const DATA_DIR = path.join(process.cwd(), "data");
const RAW_DIR = path.join(DATA_DIR, "raw");
const PEOPLE_FILE = path.join(DATA_DIR, "people.json");

// Concurrency: 5 parallel Apify actor calls (stays under free tier rate limits)
const limit = pLimit(5);

// ── Main entry ─────────────────────────────────────────────────────────────

export async function discoverAndScrape(targetCount = 30): Promise<Person[]> {
  fs.mkdirSync(RAW_DIR, { recursive: true });

  // Load existing cache
  let people: Person[] = loadCache(PEOPLE_FILE);
  console.log(`[Discover] ${people.length} people already cached`);

  if (people.length >= targetCount) {
    console.log("[Discover] Cache full, skipping discovery");
    return people;
  }

  // ── Step 1: Discover raw candidate links ─────────────────────────────────
  console.log("[Discover] Scraping directories for LinkedIn + Instagram pairs...");
  const candidates = await discoverCandidates(targetCount * 2); // over-collect
  console.log(`[Discover] Found ${candidates.length} raw candidates`);

  // De-duplicate against existing cache
  const existingLinkedins = new Set(people.map((p) => p.linkedinUrl));
  const fresh = candidates.filter(
    (c) => c.linkedin && c.instagram && !existingLinkedins.has(c.linkedin)
  );
  console.log(`[Discover] ${fresh.length} new unique candidates after dedup`);

  // ── Step 2: Scrape LinkedIn + Instagram in parallel ───────────────────────
  let idx = people.length;
  const scrapeJobs = fresh.slice(0, targetCount - people.length + 5).map((c) =>
    limit(async () => {
      const id = `person-${String(++idx).padStart(2, "0")}`;
      const rawFile = path.join(RAW_DIR, `${id}.json`);

      // Skip if already scraped
      if (fs.existsSync(rawFile)) {
        const raw = JSON.parse(fs.readFileSync(rawFile, "utf-8"));
        return buildPerson(id, c, raw.linkedin, raw.instagram);
      }

      try {
        const [linkedin, instagram] = await Promise.all([
          scrapeLinkedInFast(c.linkedin),
          scrapeInstagramFast(c.instagram),
        ]);

        // Cache raw immediately
        fs.writeFileSync(rawFile, JSON.stringify({ linkedin, instagram }, null, 2));

        const person = buildPerson(id, c, linkedin, instagram);
        console.log(`  ✓ [${id}] ${person.name}`);
        return person;
      } catch (err) {
        console.warn(`  ✗ [${id}] Failed: ${err}`);
        return null;
      }
    })
  );

  const results = (await Promise.all(scrapeJobs)).filter(Boolean) as Person[];
  people = [...people, ...results].slice(0, targetCount);

  // Save master list
  fs.writeFileSync(PEOPLE_FILE, JSON.stringify(people, null, 2));
  console.log(`[Discover] Done. ${people.length} people saved.`);
  return people;
}

// ── Directory scrapers ────────────────────────────────────────────────────

interface Candidate {
  name: string;
  linkedin: string;
  instagram: string;
  sourceUrl?: string;
}

async function discoverCandidates(max: number): Promise<Candidate[]> {
  const sources = [
    () => scrapeIndieHackers(max),
    () => scrapeProductHuntMakers(max),
    () => scrapeYCFounders(max),
    () => scrapeSpeakerList(max),
  ];

  const all: Candidate[] = [];

  for (const source of sources) {
    if (all.length >= max) break;
    try {
      const batch = await source();
      all.push(...batch);
      console.log(`  → Total candidates so far: ${all.length}`);
    } catch (err) {
      console.warn(`  → Source failed: ${err}`);
    }
  }

  // Deduplicate by LinkedIn URL
  const seen = new Set<string>();
  return all.filter((c) => {
    if (!c.linkedin || !c.instagram) return false;
    if (!validateLinkedInUrl(c.linkedin)) return false;
    if (!validateInstagramUrl(c.instagram)) return false;
    if (seen.has(c.linkedin)) return false;
    seen.add(c.linkedin);
    return true;
  });
}

// ── Source 1: Indie Hackers ────────────────────────────────────────────────
// IH profiles often list LinkedIn in bio + Instagram handle.
// We use Apify's web scraper to crawl profile pages.

async function scrapeIndieHackers(max: number): Promise<Candidate[]> {
  console.log("[Discover] Scraping Indie Hackers...");
  const run = await client.actor("apify/web-scraper").call(
    {
      startUrls: [{ url: "https://www.indiehackers.com/members?count=100" }],
      pseudoUrls: [
        { purl: "https://www.indiehackers.com/[username]" },
      ],
      pageFunction: `async function pageFunction(context) {
        const { $, request } = context;
        const results = [];
        
        // Member list page — collect profile links
        if (request.url.includes('/members')) {
          $('a[href^="/"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            if (/^\\/[a-zA-Z0-9_-]+$/.test(href) && !href.includes('products')) {
              results.push({ profileUrl: 'https://www.indiehackers.com' + href });
            }
          });
          return results;
        }

        // Individual profile page — extract social links
        const linkedin = $('a[href*="linkedin.com/in/"]').attr('href') || '';
        const instagram = $('a[href*="instagram.com/"]').attr('href') || '';
        const name = $('h1').first().text().trim() || 
                     $('meta[property="og:title"]').attr('content') || '';

        if (linkedin && instagram) {
          return [{ name, linkedin, instagram, sourceUrl: request.url }];
        }
        return [];
      }`,
      maxRequestsPerCrawl: max * 3,
      maxConcurrency: 5,
    }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return normalizeCandidates(items as Record<string, unknown>[]);
}

// ── Source 2: Product Hunt Makers ─────────────────────────────────────────
async function scrapeProductHuntMakers(max: number): Promise<Candidate[]> {
  console.log("[Discover] Scraping Product Hunt makers...");
  const run = await client.actor("apify/web-scraper").call(
    {
      startUrls: [
        { url: "https://www.producthunt.com/leaderboard/monthly/2024/1" },
        { url: "https://www.producthunt.com/leaderboard/monthly/2024/6" },
        { url: "https://www.producthunt.com/leaderboard/monthly/2024/9" },
      ],
      pseudoUrls: [
        { purl: "https://www.producthunt.com/@[username]" },
      ],
      pageFunction: `async function pageFunction(context) {
        const { $, request } = context;
        const results = [];

        if (request.url.includes('/leaderboard')) {
          $('a[href^="/@"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            results.push({ profileUrl: 'https://www.producthunt.com' + href });
          });
          return results;
        }

        // Profile page
        const linkedin = $('a[href*="linkedin.com/in/"]').attr('href') || '';
        const instagram = $('a[href*="instagram.com/"]').attr('href') || '';
        const twitter = $('a[href*="twitter.com/"]').attr('href') || '';
        const name = $('h1').first().text().trim();

        if (linkedin && instagram) {
          return [{ name, linkedin, instagram, sourceUrl: request.url }];
        }
        return [];
      }`,
      maxRequestsPerCrawl: max * 2,
      maxConcurrency: 5,
    }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return normalizeCandidates(items as Record<string, unknown>[]);
}

// ── Source 3: YC Founders (ycombinator.com/companies) ─────────────────────
async function scrapeYCFounders(max: number): Promise<Candidate[]> {
  console.log("[Discover] Scraping YC company founders...");
  // Use Apify's web scraper on YC company pages and founder bios
  const run = await client.actor("apify/web-scraper").call(
    {
      startUrls: [
        { url: "https://www.ycombinator.com/companies" },
      ],
      pseudoUrls: [
        { purl: "https://www.ycombinator.com/companies/[slug]" },
      ],
      pageFunction: `async function pageFunction(context) {
        const { $, request } = context;
        const results = [];

        if (request.url === 'https://www.ycombinator.com/companies') {
          $('a[href^="/companies/"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            if (href.match(/\\/companies\\/[a-z0-9-]+$/)) {
              results.push({ profileUrl: 'https://www.ycombinator.com' + href });
            }
          });
          return results.slice(0, 80);
        }

        // Company page — find founder socials
        $('a').each((_, el) => {
          const href = $(el).attr('href') || '';
          if (href.includes('linkedin.com/in/') || href.includes('instagram.com/')) {
            results.push({ link: href, page: request.url });
          }
        });
        return results;
      }`,
      maxRequestsPerCrawl: max * 2,
      maxConcurrency: 5,
    }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  // Group linkedin + instagram per page URL
  const byPage: Record<string, { linkedin?: string; instagram?: string; name?: string }> = {};
  for (const item of items as Record<string, unknown>[]) {
    const link = String(item.link ?? "");
    const page = String(item.page ?? item.sourceUrl ?? "");
    if (!page) continue;
    if (!byPage[page]) byPage[page] = {};
    if (link.includes("linkedin.com/in/")) byPage[page].linkedin = link;
    if (link.includes("instagram.com/")) byPage[page].instagram = link;
  }

  return Object.values(byPage)
    .filter((v) => v.linkedin && v.instagram)
    .map((v) => ({
      name: v.name ?? "",
      linkedin: v.linkedin!,
      instagram: v.instagram!,
    }));
}

// ── Source 4: Conference speaker pages ────────────────────────────────────
async function scrapeSpeakerList(max: number): Promise<Candidate[]> {
  console.log("[Discover] Scraping conference speaker pages...");
  const speakerPages = [
    "https://web.archive.org/web/2024*/https://www.websummit.com/speakers",
    "https://techcrunch.com/events/tc-disrupt-2024/speakers/",
    "https://sxsw.com/speakers/",
  ];

  const run = await client.actor("apify/web-scraper").call(
    {
      startUrls: speakerPages.slice(0, 2).map((url) => ({ url })),
      pageFunction: `async function pageFunction(context) {
        const { $ } = context;
        const results = [];
        $('a').each((_, el) => {
          const href = $(el).attr('href') || '';
          if (href.includes('linkedin.com/in/') || href.includes('instagram.com/')) {
            results.push({ link: href, page: context.request.url });
          }
        });
        return results;
      }`,
      maxRequestsPerCrawl: 5,
      maxConcurrency: 3,
    }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  const byPage: Record<string, { linkedin?: string; instagram?: string }> = {};
  for (const item of items as Record<string, unknown>[]) {
    const link = String(item.link ?? "");
    const page = String(item.page ?? "");
    if (!byPage[page]) byPage[page] = {};
    if (link.includes("linkedin.com/in/")) byPage[page].linkedin = link;
    if (link.includes("instagram.com/")) byPage[page].instagram = link;
  }

  return Object.values(byPage)
    .filter((v) => v.linkedin && v.instagram)
    .map((v) => ({ name: "", linkedin: v.linkedin!, instagram: v.instagram! }));
}

// ── Fast profile scrapers (parallel, cached) ───────────────────────────────

async function scrapeLinkedInFast(url: string): Promise<LinkedInData> {
  const run = await client.actor("scrap.io/linkedin-profile-scraper").call(
    { profileUrls: [url] }
  );
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return normalizeLinkedIn((items[0] ?? {}) as Record<string, unknown>);
}

async function scrapeInstagramFast(url: string): Promise<InstagramData> {
  const username = url.split("instagram.com/")[1]?.replace(/\/$/, "") ?? url;
  const run = await client.actor("apify/instagram-profile-scraper").call(
    {
      usernames: [username], resultsLimit: 12 },
  );
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return normalizeInstagram((items[0] ?? {}) as Record<string, unknown>);
}

// ── Normalizers ───────────────────────────────────────────────────────────

function normalizeLinkedIn(raw: Record<string, unknown>): LinkedInData {
  return {
    fullName: str(raw.fullName ?? raw.name),
    headline: str(raw.headline ?? raw.title),
    about: str(raw.about ?? raw.summary).slice(0, 800), // trim for tokens
    location: str(raw.location ?? raw.geoLocation),
    experience: ((raw.experience as Array<Record<string, unknown>>) ?? [])
      .slice(0, 4) // top 4 only — sufficient for analysis
      .map((e) => ({
        title: str(e.title ?? e.position),
        company: str(e.company ?? e.companyName),
        duration: str(e.duration ?? e.dateRange),
        description: str(e.description).slice(0, 200),
      })),
    education: ((raw.education as Array<Record<string, unknown>>) ?? [])
      .slice(0, 2)
      .map((e) => ({
        school: str(e.school ?? e.schoolName),
        degree: str(e.degree ?? e.degreeName),
        field: str(e.fieldOfStudy ?? e.field),
        years: str(e.dateRange ?? e.years),
      })),
    skills: ((raw.skills as string[]) ?? []).slice(0, 15),
    profileImageUrl: str(raw.profilePicture ?? raw.profileImageUrl),
  };
}

function normalizeInstagram(raw: Record<string, unknown>): InstagramData {
  return {
    username: str(raw.username),
    fullName: str(raw.fullName ?? raw.name),
    bio: str(raw.biography ?? raw.bio).slice(0, 300),
    followersCount: num(raw.followersCount ?? raw.followers),
    followingCount: num(raw.followingCount ?? raw.following),
    postsCount: num(raw.postsCount ?? raw.mediaCount),
    profileImageUrl: str(raw.profilePicUrl ?? raw.profileImageUrl),
    posts: ((raw.latestPosts ?? raw.posts) as Array<Record<string, unknown>> ?? [])
      .slice(0, 10) // 10 posts — enough signal
      .map((p) => ({
        caption: str(p.caption ?? p.text).slice(0, 300), // trim captions
        hashtags: extractHashtags(str(p.caption ?? p.text)).slice(0, 10),
        likesCount: num(p.likesCount ?? p.likes),
        commentsCount: num(p.commentsCount ?? p.comments),
        imageUrl: str(p.displayUrl ?? p.imageUrl ?? p.url),
        timestamp: str(p.timestamp ?? p.takenAt),
        location: str(p.locationName ?? p.location),
      })),
  };
}

// ── Utilities ──────────────────────────────────────────────────────────────

function normalizeCandidates(items: Record<string, unknown>[]): Candidate[] {
  const byPage: Record<string, Partial<Candidate>> = {};
  for (const item of items) {
    const page = str(item.sourceUrl ?? item.profileUrl ?? item.page);
    if (!byPage[page]) byPage[page] = { sourceUrl: page };
    if (str(item.linkedin).includes("linkedin.com/in/"))
      byPage[page].linkedin = str(item.linkedin);
    if (str(item.instagram).includes("instagram.com/"))
      byPage[page].instagram = str(item.instagram);
    if (item.name) byPage[page].name = str(item.name);
  }

  return Object.values(byPage)
    .filter((c) => c.linkedin && c.instagram)
    .map((c) => ({
      name: c.name ?? "",
      linkedin: c.linkedin!,
      instagram: c.instagram!,
      sourceUrl: c.sourceUrl,
    }));
}

function buildPerson(
  id: string,
  candidate: Candidate,
  linkedin: LinkedInData,
  instagram: InstagramData
): Person {
  const name =
    candidate.name ||
    linkedin.fullName ||
    instagram.fullName ||
    id;

  return {
    id,
    name,
    linkedinUrl: candidate.linkedin,
    instagramUrl: candidate.instagram,
    avatarUrl: instagram.profileImageUrl || linkedin.profileImageUrl,
    raw: { linkedin, instagram },
    createdAt: new Date().toISOString(),
  };
}

function loadCache(filePath: string): Person[] {
  try {
    if (fs.existsSync(filePath))
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {}
  return [];
}

function str(v: unknown): string {
  return v ? String(v).trim() : "";
}

function num(v: unknown): number {
  return Number(v) || 0;
}

function extractHashtags(text: string): string[] {
  return (text.match(/#[a-zA-Z0-9_]+/g) ?? []).map((h) => h.slice(1));
}
