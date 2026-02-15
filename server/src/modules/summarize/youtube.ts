// Copyright 2025 #1 Future — Apache 2.0 License

/**
 * YouTube transcript extraction — pure HTTP, no API key, no yt-dlp.
 * Fetches the watch page, parses ytInitialPlayerResponse for caption tracks,
 * downloads captions, and combines into plain text.
 */

export interface YouTubeMetadata {
  title: string;
  channel: string;
  duration: string;
  description: string;
}

const VIDEO_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtube\.com\/watch\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
];

export function extractVideoId(url: string): string | null {
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function extractYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const html = await fetchWatchPage(videoId);

  const title = extractFromHtml(html, /"title":"(.*?)"/) ?? "Unknown Title";
  const channel = extractFromHtml(html, /"ownerChannelName":"(.*?)"/) ?? "Unknown Channel";
  const lengthSeconds = extractFromHtml(html, /"lengthSeconds":"(\d+)"/);
  const description = extractFromHtml(html, /"shortDescription":"(.*?)"(?:,"|})/) ?? "";

  const duration = lengthSeconds ? formatDuration(parseInt(lengthSeconds, 10)) : "Unknown";

  return {
    title: unescapeJson(title),
    channel: unescapeJson(channel),
    duration,
    description: unescapeJson(description).slice(0, 500),
  };
}

export async function extractYouTubeTranscript(videoId: string): Promise<string> {
  const html = await fetchWatchPage(videoId);

  // Find caption tracks in ytInitialPlayerResponse
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
  if (!playerResponseMatch) {
    throw new Error("Could not find player response — video may be unavailable");
  }

  let playerResponse: any;
  try {
    playerResponse = JSON.parse(playerResponseMatch[1]);
  } catch {
    throw new Error("Failed to parse player response JSON");
  }

  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  // Prefer English, fall back to first available track
  const track =
    captionTracks.find((t: any) => t.languageCode === "en") ??
    captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ??
    captionTracks[0];

  const captionUrl = track.baseUrl;
  if (!captionUrl) {
    throw new Error("Caption track has no URL");
  }

  // Fetch captions (default format is XML timedtext)
  const captionResponse = await fetch(captionUrl);
  if (!captionResponse.ok) {
    throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
  }

  const captionText = await captionResponse.text();

  // Try JSON3 format first (append &fmt=json3 to URL)
  if (captionUrl.includes("fmt=json3") || captionText.startsWith("{")) {
    return parseJsonCaptions(captionText);
  }

  return parseXmlCaptions(captionText);
}

export function parseXmlCaptions(xml: string): string {
  const segments: string[] = [];
  const textRegex = /<text[^>]*>(.*?)<\/text>/gs;
  let match: RegExpExecArray | null;

  while ((match = textRegex.exec(xml)) !== null) {
    const text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/<[^>]+>/g, "") // strip any nested tags
      .trim();

    if (text) segments.push(text);
  }

  return segments.join(" ");
}

export function parseJsonCaptions(json: string): string {
  try {
    const data = JSON.parse(json);
    const events = data.events ?? [];
    const segments: string[] = [];

    for (const event of events) {
      if (!event.segs) continue;
      for (const seg of event.segs) {
        const text = seg.utf8?.trim();
        if (text && text !== "\n") segments.push(text);
      }
    }

    return segments.join(" ");
  } catch {
    throw new Error("Failed to parse JSON captions");
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

async function fetchWatchPage(videoId: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube page: ${response.status}`);
  }

  return response.text();
}

function extractFromHtml(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1] : null;
}

function unescapeJson(str: string): string {
  try {
    return JSON.parse(`"${str}"`);
  } catch {
    return str.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
