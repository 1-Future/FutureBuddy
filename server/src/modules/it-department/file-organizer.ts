// Copyright 2025 #1 Future — Apache 2.0 License

import { readdir, rename, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";

interface OrganizeResult {
  moved: number;
  skipped: number;
  details: { from: string; to: string }[];
}

// File extension → category mapping
const CATEGORY_MAP: Record<string, string> = {
  // Documents
  ".pdf": "Documents",
  ".doc": "Documents",
  ".docx": "Documents",
  ".txt": "Documents",
  ".rtf": "Documents",
  ".odt": "Documents",
  ".xls": "Documents",
  ".xlsx": "Documents",
  ".csv": "Documents",
  ".ppt": "Documents",
  ".pptx": "Documents",

  // Images
  ".jpg": "Images",
  ".jpeg": "Images",
  ".png": "Images",
  ".gif": "Images",
  ".bmp": "Images",
  ".svg": "Images",
  ".webp": "Images",
  ".ico": "Images",

  // Videos
  ".mp4": "Videos",
  ".mkv": "Videos",
  ".avi": "Videos",
  ".mov": "Videos",
  ".wmv": "Videos",
  ".webm": "Videos",

  // Audio
  ".mp3": "Audio",
  ".wav": "Audio",
  ".flac": "Audio",
  ".ogg": "Audio",
  ".m4a": "Audio",

  // Archives
  ".zip": "Archives",
  ".rar": "Archives",
  ".7z": "Archives",
  ".tar": "Archives",
  ".gz": "Archives",

  // Code
  ".ts": "Code",
  ".js": "Code",
  ".py": "Code",
  ".java": "Code",
  ".cpp": "Code",
  ".c": "Code",
  ".h": "Code",
  ".cs": "Code",
  ".go": "Code",
  ".rs": "Code",
  ".html": "Code",
  ".css": "Code",
  ".json": "Code",
  ".xml": "Code",
  ".yaml": "Code",
  ".yml": "Code",

  // Installers
  ".exe": "Installers",
  ".msi": "Installers",
  ".dmg": "Installers",
  ".deb": "Installers",
  ".rpm": "Installers",
};

export async function organizeDirectory(
  sourcePath: string,
  dryRun = true,
): Promise<OrganizeResult> {
  const result: OrganizeResult = { moved: 0, skipped: 0, details: [] };
  const entries = await readdir(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const ext = extname(entry.name).toLowerCase();
    const category = CATEGORY_MAP[ext];

    if (!category) {
      result.skipped++;
      continue;
    }

    const destDir = join(sourcePath, category);
    const destPath = join(destDir, entry.name);
    const srcPath = join(sourcePath, entry.name);

    result.details.push({ from: srcPath, to: destPath });

    if (!dryRun) {
      await mkdir(destDir, { recursive: true });
      await rename(srcPath, destPath);
    }

    result.moved++;
  }

  return result;
}
