// Copyright 2025 #1 Future — Apache 2.0 License

/**
 * YouTube transcript extraction — pure HTTP, no API key, no yt-dlp.
 * Uses the Android innertube player API for reliable caption URLs,
 * and the watch page HTML for metadata.
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

const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

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
  // Use Android innertube player API — returns caption URLs that actually work
  const playerResponse = await fetchPlayerResponse(videoId);

  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  // Prefer English, fall back to first available track
  const track =
    captionTracks.find((t: any) => t.languageCode === "en" && t.kind !== "asr") ??
    captionTracks.find((t: any) => t.languageCode === "en") ??
    captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ??
    captionTracks[0];

  const captionUrl = track.baseUrl;
  if (!captionUrl) {
    throw new Error("Caption track has no URL");
  }

  // Fetch captions XML
  const captionResponse = await fetch(captionUrl, {
    headers: {
      "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
    },
  });

  if (!captionResponse.ok) {
    throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
  }

  const captionText = await captionResponse.text();

  if (!captionText || captionText.length === 0) {
    throw new Error("Caption response was empty");
  }

  // JSON format
  if (captionText.trimStart().startsWith("{")) {
    return parseJsonCaptions(captionText);
  }

  // XML format (handles both <text> and <p> tag styles)
  return parseXmlCaptions(captionText);
}

export function parseXmlCaptions(xml: string): string {
  const segments: string[] = [];

  // Match both <text ...>content</text> and <p ...>content</p> formats
  const textRegex = /<(?:text|p)[^>]*>(.*?)<\/(?:text|p)>/gs;
  let match: RegExpExecArray | null;

  while ((match = textRegex.exec(xml)) !== null) {
    const text = decodeXmlEntities(match[1])
      .replace(/<[^>]+>/g, "") // strip any nested tags
      .trim();

    if (text && !isOnlyMusicSymbols(text)) segments.push(text);
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

async function fetchPlayerResponse(videoId: string): Promise<any> {
  const response = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "19.09.37",
            androidSdkVersion: 30,
            hl: "en",
          },
        },
        videoId,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Innertube player API error: ${response.status} ${body.slice(0, 200)}`);
  }

  return response.json();
}

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

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function isOnlyMusicSymbols(text: string): boolean {
  // Filter out lines that are only music symbols like [♪♪♪] or ♪ ... ♪
  return /^[\s♪♫\[\]()]*$/.test(text);
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
