// Copyright 2025 #1 Future — Apache 2.0 License

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import * as cheerio from "cheerio";
import type { ContentType, ExtractedContent } from "@futurebuddy/shared";
import {
  extractVideoId,
  extractYouTubeTranscript,
  extractYouTubeMetadata,
} from "./youtube.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function detectContentType(url: string): ContentType {
  const lower = url.toLowerCase();

  if (extractVideoId(url)) return "youtube";
  if (lower.endsWith(".pdf") || lower.includes("/pdf/") || lower.includes("type=pdf")) {
    return "pdf";
  }

  return "article";
}

export async function extractContent(url: string): Promise<ExtractedContent> {
  const type = detectContentType(url);

  switch (type) {
    case "youtube":
      return extractYouTube(url);
    case "pdf":
      return extractPdf(url);
    default:
      return extractArticle(url);
  }
}

async function extractYouTube(url: string): Promise<ExtractedContent> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const [transcript, metadata] = await Promise.all([
    extractYouTubeTranscript(videoId),
    extractYouTubeMetadata(videoId),
  ]);

  return {
    url,
    title: metadata.title,
    type: "youtube",
    text: transcript,
    metadata: {
      channel: metadata.channel,
      duration: metadata.duration,
      description: metadata.description,
    },
  };
}

async function extractArticle(url: string): Promise<ExtractedContent> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Try Mozilla Readability first (the gold standard for article extraction)
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.trim().length > 100) {
      return {
        url,
        title: article.title || extractTitleFromHtml(html),
        type: "article",
        text: article.textContent.trim(),
        metadata: {
          author: article.byline || undefined,
          siteName: article.siteName || undefined,
        },
      };
    }
  } catch {
    // Readability failed, fall through to cheerio
  }

  // Fallback: cheerio-based extraction
  return extractArticleFallback(html, url);
}

function extractArticleFallback(html: string, url: string): ExtractedContent {
  const $ = cheerio.load(html);

  // Remove noise elements
  $(
    "script, style, nav, footer, header, aside, .sidebar, .nav, .menu, .ad, .ads, .advertisement, .social, .share, .comments, .comment, iframe, noscript",
  ).remove();

  // Try to find main content in priority order
  let text = "";
  const selectors = ["article", "main", '[role="main"]', ".post-content", ".entry-content", ".article-body", ".content"];

  for (const selector of selectors) {
    const el = $(selector);
    if (el.length > 0) {
      text = el.text().trim();
      if (text.length > 100) break;
    }
  }

  // Fallback to body
  if (text.length < 100) {
    text = $("body").text().trim();
  }

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  const title = $("title").text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    $("h1").first().text().trim() ||
    "Untitled";

  const author = $('meta[name="author"]').attr("content") ||
    $('meta[property="article:author"]').attr("content") ||
    undefined;

  const siteName = $('meta[property="og:site_name"]').attr("content") || undefined;

  return {
    url,
    title,
    type: "article",
    text,
    metadata: { author, siteName },
  };
}

async function extractPdf(url: string): Promise<ExtractedContent> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }

  // For PDFs, we extract what we can from the URL/headers and note it's a PDF.
  // The actual content will be sent as binary to LLMs that support document mode,
  // or we do basic text extraction for text-only providers.
  const buffer = Buffer.from(await response.arrayBuffer());

  // Basic PDF text extraction: find text between stream markers
  // This is a rough heuristic — works for simple PDFs with embedded text
  let text = "";
  const pdfText = buffer.toString("utf-8");

  // Extract text objects from PDF (very basic — catches most text-based PDFs)
  const textMatches = pdfText.match(/\(([^)]+)\)/g);
  if (textMatches) {
    text = textMatches
      .map((m) => m.slice(1, -1))
      .filter((t) => t.length > 1 && /[a-zA-Z]/.test(t))
      .join(" ");
  }

  // If basic extraction fails, just note it's a PDF
  if (text.length < 50) {
    text = `[PDF document from ${url} — content requires PDF-capable AI provider for full extraction]`;
  }

  // Try to extract title from URL
  const urlParts = new URL(url);
  const filename = urlParts.pathname.split("/").pop() ?? "";
  const title = decodeURIComponent(filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ")) || "PDF Document";

  return {
    url,
    title,
    type: "pdf",
    text,
  };
}

function extractTitleFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
  if (match) {
    return match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }
  return "Untitled";
}
