import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockReaddir, mockRename, mockMkdir } = vi.hoisted(() => ({
  mockReaddir: vi.fn(),
  mockRename: vi.fn(),
  mockMkdir: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readdir: mockReaddir,
  rename: mockRename,
  mkdir: mockMkdir,
}));

import { organizeDirectory } from "./file-organizer.js";

function makeDirent(name: string, isFile = true) {
  return { name, isFile: () => isFile, isDirectory: () => !isFile };
}

describe("organizeDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps file extensions to correct categories", async () => {
    mockReaddir.mockResolvedValue([
      makeDirent("report.pdf"),
      makeDirent("photo.jpg"),
      makeDirent("song.mp3"),
      makeDirent("app.ts"),
    ]);

    const result = await organizeDirectory("/test/path", true);

    expect(result.moved).toBe(4);
    expect(result.details[0].to).toContain("Documents");
    expect(result.details[1].to).toContain("Images");
    expect(result.details[2].to).toContain("Audio");
    expect(result.details[3].to).toContain("Code");
  });

  it("skips files with unknown extensions", async () => {
    mockReaddir.mockResolvedValue([makeDirent("mystery.xyz"), makeDirent("readme.pdf")]);

    const result = await organizeDirectory("/test/path", true);

    expect(result.moved).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("skips directories", async () => {
    mockReaddir.mockResolvedValue([makeDirent("subfolder", false), makeDirent("file.txt")]);

    const result = await organizeDirectory("/test/path", true);

    expect(result.moved).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("does not call rename/mkdir in dry run", async () => {
    mockReaddir.mockResolvedValue([makeDirent("file.pdf")]);

    await organizeDirectory("/test/path", true);

    expect(mockMkdir).not.toHaveBeenCalled();
    expect(mockRename).not.toHaveBeenCalled();
  });

  it("calls rename and mkdir when not dry run", async () => {
    mockReaddir.mockResolvedValue([makeDirent("file.pdf")]);
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);

    const result = await organizeDirectory("/test/path", false);

    expect(result.moved).toBe(1);
    expect(mockMkdir).toHaveBeenCalledTimes(1);
    expect(mockRename).toHaveBeenCalledTimes(1);
  });

  it("handles empty directory", async () => {
    mockReaddir.mockResolvedValue([]);

    const result = await organizeDirectory("/test/path", true);

    expect(result.moved).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.details).toHaveLength(0);
  });
});
