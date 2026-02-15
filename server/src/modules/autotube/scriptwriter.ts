// Copyright 2025 #1 Future — Apache 2.0 License

import type { ParsedSession } from "../sessions/parser.js";

export interface TutorialScript {
  title: string;
  description: string;
  scenes: Scene[];
  estimatedDuration: number;
}

export interface Scene {
  narration: string;
  codeBlock?: string;
  duration: number;
}

/**
 * Build a prompt that asks the AI to convert a coding session into
 * a narrated tutorial script with discrete scenes.
 */
export function generateScriptPrompt(session: ParsedSession): string {
  // Collect the conversation flow: user asks, assistant responds, tools used
  const conversation = session.entries
    .map((entry) => {
      switch (entry.type) {
        case "user":
          return `[USER]: ${entry.content}`;
        case "assistant":
          return `[ASSISTANT]: ${entry.content}`;
        case "tool_use":
          return `[TOOL]: ${entry.content}`;
        case "tool_result":
          return `[RESULT]: ${entry.content}`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");

  return `You are a technical content creator. Convert the following coding session into a narrated YouTube tutorial script.

## Session Summary
${session.summary}

## Session Duration
From ${session.startedAt} to ${session.endedAt} (${session.messageCount} messages)

## Session Content
${conversation}

## Instructions

Create a tutorial script with the following format. Each scene should teach one concept or step.

- Write in a friendly, approachable tone suitable for YouTube
- Include code blocks when showing what was built or changed
- Each scene should have a clear narration explaining what is happening and why
- Estimate scene duration in seconds based on narration length and code complexity
- Aim for 5-15 scenes depending on session complexity
- Start with an intro scene and end with a summary/outro scene

## Output Format

Return your response in EXACTLY this format:

# Title
[A catchy, descriptive tutorial title]

# Description
[A 1-2 sentence YouTube description]

## Scene 1: [Scene Title]
[Narration text explaining what is happening]

\`\`\`[language]
[Optional code block to show on screen]
\`\`\`

Duration: [number] seconds

## Scene 2: [Scene Title]
[Narration text]

Duration: [number] seconds

[Continue with more scenes...]`;
}

/**
 * Parse the AI response into a structured TutorialScript.
 * Expects markdown with "# Title", "# Description", and "## Scene N" headers.
 */
export function parseScriptResponse(response: string): TutorialScript {
  const lines = response.split("\n");

  let title = "Untitled Tutorial";
  let description = "";
  const scenes: Scene[] = [];

  let currentSection: "none" | "title" | "description" | "scene" = "none";
  let currentNarration: string[] = [];
  let currentCodeBlock: string[] | null = null;
  let inCodeBlock = false;
  let currentDuration = 60;
  let sceneCodeBlocks: string[] = [];

  function flushScene() {
    if (currentNarration.length > 0 || sceneCodeBlocks.length > 0) {
      const narration = currentNarration.join("\n").trim();
      const codeBlock = sceneCodeBlocks.length > 0 ? sceneCodeBlocks.join("\n\n") : undefined;
      scenes.push({
        narration,
        codeBlock,
        duration: currentDuration,
      });
    }
    currentNarration = [];
    sceneCodeBlocks = [];
    currentDuration = 60;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle code block fences
    if (trimmed.startsWith("```")) {
      if (inCodeBlock && currentCodeBlock !== null) {
        // Closing fence
        inCodeBlock = false;
        sceneCodeBlocks.push(currentCodeBlock.join("\n"));
        currentCodeBlock = null;
        continue;
      } else {
        // Opening fence
        inCodeBlock = true;
        currentCodeBlock = [];
        continue;
      }
    }

    if (inCodeBlock && currentCodeBlock !== null) {
      currentCodeBlock.push(line);
      continue;
    }

    // Parse "# Title" heading
    if (/^# (?!#)/.test(trimmed) && !trimmed.toLowerCase().startsWith("# description")) {
      if (currentSection === "scene") flushScene();
      currentSection = "title";
      title = trimmed.replace(/^# /, "").trim();
      continue;
    }

    // Parse "# Description" heading
    if (/^# description/i.test(trimmed)) {
      if (currentSection === "scene") flushScene();
      currentSection = "description";
      continue;
    }

    // Parse "## Scene N" heading
    if (/^## Scene/i.test(trimmed)) {
      if (currentSection === "scene") flushScene();
      currentSection = "scene";
      continue;
    }

    // Parse "Duration: N seconds"
    const durationMatch = trimmed.match(/^Duration:\s*(\d+)\s*seconds?/i);
    if (durationMatch) {
      currentDuration = parseInt(durationMatch[1], 10);
      continue;
    }

    // Accumulate content based on current section
    switch (currentSection) {
      case "description":
        if (trimmed) description += (description ? " " : "") + trimmed;
        break;
      case "scene":
        currentNarration.push(line);
        break;
      default:
        break;
    }
  }

  // Flush the last scene
  if (currentSection === "scene") flushScene();

  // Calculate total estimated duration
  const estimatedDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

  // Fallbacks if parsing yielded nothing
  if (scenes.length === 0) {
    scenes.push({
      narration: response.trim(),
      duration: 120,
    });
  }

  return {
    title,
    description: description || `A tutorial covering: ${title}`,
    scenes,
    estimatedDuration: estimatedDuration || 120,
  };
}
