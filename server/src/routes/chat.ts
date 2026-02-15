// Copyright 2025 #1 Future — Apache 2.0 License

import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { ChatRequest, ChatMessage } from "@futurebuddy/shared";
import { getDb, queryAll, execute } from "../db/index.js";
import { loadConfig } from "../config.js";
import { getAIProvider } from "../modules/ai/router.js";
import { buildSystemPrompt } from "../modules/ai/system-prompt.js";
import { classifyAndExtractActions } from "../modules/it-department/action-classifier.js";
import { toolRegistry } from "../modules/it-department/tool-registry.js";
import { buildContext } from "../modules/memory/context.js";
import { extractMemories } from "../modules/memory/extraction.js";
import { extractUrls } from "../modules/bookmarks/extractor.js";
import { extractContent, buildUrlContextPrompt } from "../modules/summarize/index.js";

export const chatRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  // Extract URL content from user message (non-blocking best-effort)
  async function extractUrlContext(message: string): Promise<string> {
    try {
      const urls = extractUrls(message, "chat");
      if (urls.length === 0) return "";
      // Extract content from the first URL only (avoid blowing up context)
      const extracted = await extractContent(urls[0].url);
      return buildUrlContextPrompt(extracted);
    } catch {
      return "";
    }
  }

  // Send a message and get AI response
  app.post<{ Body: ChatRequest }>("/", async (request) => {
    const { message, conversationId: existingConvId } = request.body;
    const conversationId = existingConvId || randomUUID();

    // Create conversation if new
    if (!existingConvId) {
      execute(db, "INSERT INTO conversations (id, title) VALUES (?, ?)", [
        conversationId,
        message.slice(0, 100),
      ]);
    }

    // Store user message
    const timestamp = new Date().toISOString();
    execute(
      db,
      "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
      [conversationId, "user", message, timestamp],
    );

    // Get conversation history
    const history = queryAll(
      db,
      "SELECT role, content, created_at as timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at",
      [conversationId],
    ) as ChatMessage[];

    // Build context from memories + inventory
    let context = "";
    try {
      context = await buildContext(db, message, config.ai);
    } catch {
      // Context building failed — continue without it
    }

    // Extract URL content if the message contains a URL
    const urlContext = await extractUrlContext(message);
    if (urlContext) {
      context = context ? context + "\n\n" + urlContext : urlContext;
    }

    // Build tool capabilities summary
    const toolCapabilities = toolRegistry.buildToolCapabilitiesSummary();

    // Inject system prompt with context as the first message
    const systemMessage: ChatMessage = {
      role: "system",
      content: buildSystemPrompt(context, toolCapabilities),
      timestamp: new Date().toISOString(),
    };
    const messagesWithContext = [systemMessage, ...history];

    // Get AI response
    const provider = getAIProvider(config.ai);
    const response = await provider.chat(messagesWithContext, config.ai);

    // Store assistant message
    execute(
      db,
      "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
      [conversationId, "assistant", response, new Date().toISOString()],
    );

    // Update conversation timestamp
    execute(db, "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [
      conversationId,
    ]);

    // Extract memories from this exchange (async, non-blocking)
    extractMemories(history.slice(-4), conversationId, db, config.ai).catch(() => {
      // Memory extraction is best-effort
    });

    // Check if the response contains actionable IT commands
    const actions = classifyAndExtractActions(response, conversationId, db);

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString(),
    };

    return {
      message: assistantMessage,
      conversationId,
      actions: actions.length > 0 ? actions : undefined,
    };
  });

  // Send a message and stream AI response via SSE
  app.post<{ Body: ChatRequest }>("/stream", async (request, reply: FastifyReply) => {
    const { message, conversationId: existingConvId } = request.body;
    const conversationId = existingConvId || randomUUID();

    // Create conversation if new
    if (!existingConvId) {
      execute(db, "INSERT INTO conversations (id, title) VALUES (?, ?)", [
        conversationId,
        message.slice(0, 100),
      ]);
    }

    // Store user message
    const timestamp = new Date().toISOString();
    execute(
      db,
      "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
      [conversationId, "user", message, timestamp],
    );

    // Get conversation history
    const history = queryAll(
      db,
      "SELECT role, content, created_at as timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at",
      [conversationId],
    ) as ChatMessage[];

    // Build context from memories + inventory
    let context = "";
    try {
      context = await buildContext(db, message, config.ai);
    } catch {
      // Context building failed — continue without it
    }

    // Extract URL content if the message contains a URL
    const urlContext = await extractUrlContext(message);
    if (urlContext) {
      context = context ? context + "\n\n" + urlContext : urlContext;
    }

    // Build tool capabilities summary
    const toolCapabilities = toolRegistry.buildToolCapabilitiesSummary();

    // Inject system prompt with context as the first message
    const systemMessage: ChatMessage = {
      role: "system",
      content: buildSystemPrompt(context, toolCapabilities),
      timestamp: new Date().toISOString(),
    };
    const messagesWithContext = [systemMessage, ...history];

    // Get AI provider
    const provider = getAIProvider(config.ai);

    // Fall back to non-streaming if provider doesn't support streamChat
    if (!provider.streamChat) {
      const response = await provider.chat(messagesWithContext, config.ai);

      // Store assistant message
      execute(
        db,
        "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
        [conversationId, "assistant", response, new Date().toISOString()],
      );

      // Update conversation timestamp
      execute(db, "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [
        conversationId,
      ]);

      // Extract memories async
      extractMemories(history.slice(-4), conversationId, db, config.ai).catch(() => {});

      // Classify actions
      const actions = classifyAndExtractActions(response, conversationId, db);

      // Write the full response as SSE events
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      reply.raw.write(`data: ${JSON.stringify({ delta: response })}\n\n`);
      reply.raw.write(
        `data: ${JSON.stringify({ done: true, conversationId, actions: actions.length > 0 ? actions : undefined })}\n\n`,
      );
      reply.raw.end();
      return reply;
    }

    // Set up SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      // Stream chunks to the client
      const fullResponse = await provider.streamChat(
        messagesWithContext,
        config.ai,
        (chunk: string) => {
          reply.raw.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
        },
      );

      // Store assistant message
      execute(
        db,
        "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
        [conversationId, "assistant", fullResponse, new Date().toISOString()],
      );

      // Update conversation timestamp
      execute(db, "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [
        conversationId,
      ]);

      // Extract memories from this exchange (async, non-blocking)
      extractMemories(history.slice(-4), conversationId, db, config.ai).catch(() => {
        // Memory extraction is best-effort
      });

      // Classify actions from the full response
      const actions = classifyAndExtractActions(fullResponse, conversationId, db);

      // Send final done event
      reply.raw.write(
        `data: ${JSON.stringify({ done: true, conversationId, actions: actions.length > 0 ? actions : undefined })}\n\n`,
      );
    } catch (err: any) {
      // Send error as SSE event instead of crashing
      reply.raw.write(
        `data: ${JSON.stringify({ error: err.message || "AI provider error" })}\n\n`,
      );
    }

    reply.raw.end();
    return reply;
  });

  // Get conversation history
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = request.params;
    const messages = queryAll(
      db,
      "SELECT role, content, created_at as timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at",
      [id],
    ) as ChatMessage[];

    return { conversationId: id, messages };
  });

  // List conversations
  app.get("/", async () => {
    const conversations = queryAll(
      db,
      "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 50",
    );
    return { conversations };
  });

  // Define — one-shot AI definition of selected text
  app.post<{ Body: { text: string; context?: string } }>("/define", async (request) => {
    const { text, context } = request.body;
    const provider = getAIProvider(config.ai);

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a concise dictionary. Given a word or phrase, provide a 1-2 sentence definition. " +
          "Be clear and accessible. Do not include any preamble or labels — just the definition." +
          (context ? `\n\nContext where this appeared: "${context}"` : ""),
        timestamp: new Date().toISOString(),
      },
      {
        role: "user",
        content: `Define: ${text}`,
        timestamp: new Date().toISOString(),
      },
    ];

    const definition = await provider.chat(messages, config.ai);
    return { definition };
  });

  // Explain — streamed detailed explanation of selected text
  app.post<{ Body: { text: string; context?: string } }>("/explain", async (request, reply: FastifyReply) => {
    const { text, context } = request.body;
    const provider = getAIProvider(config.ai);

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a helpful explainer. Given a piece of text, provide a thorough but accessible explanation. " +
          "Use analogies and examples where helpful. Break complex ideas into digestible parts. " +
          "Write in plain English that anyone can understand." +
          (context ? `\n\nContext where this appeared: "${context}"` : ""),
        timestamp: new Date().toISOString(),
      },
      {
        role: "user",
        content: `Explain this: ${text}`,
        timestamp: new Date().toISOString(),
      },
    ];

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      if (provider.streamChat) {
        await provider.streamChat(messages, config.ai, (chunk: string) => {
          reply.raw.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
        });
      } else {
        const response = await provider.chat(messages, config.ai);
        reply.raw.write(`data: ${JSON.stringify({ delta: response })}\n\n`);
      }
      reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err: any) {
      reply.raw.write(`data: ${JSON.stringify({ error: err.message || "Explain failed" })}\n\n`);
    }

    reply.raw.end();
    return reply;
  });

  // Research — create a research thread, optionally linked to a parent conversation
  app.post<{ Body: { text: string; parentConversationId?: string } }>("/research", async (request) => {
    const { text, parentConversationId } = request.body;
    const conversationId = randomUUID();
    const title = `Research: ${text.slice(0, 80)}`;

    execute(
      db,
      "INSERT INTO conversations (id, title, parent_conversation_id, research_text) VALUES (?, ?, ?, ?)",
      [conversationId, title, parentConversationId ?? null, text],
    );

    // Seed with a system message providing research context
    execute(
      db,
      "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
      [
        conversationId,
        "system",
        `This is a research thread about: "${text}". Help the user explore this topic in depth. ` +
          "Provide thorough, well-sourced information. Ask clarifying questions if needed.",
        new Date().toISOString(),
      ],
    );

    return { conversationId, title };
  });

  // List research threads for a conversation
  app.get<{ Params: { id: string } }>("/:id/research", async (request) => {
    const threads = queryAll(
      db,
      "SELECT id, title, research_text, created_at, updated_at FROM conversations WHERE parent_conversation_id = ? ORDER BY created_at DESC",
      [request.params.id],
    );
    return { threads };
  });

  // Translate — streamed plain English translation of technical text
  app.post<{ Body: { text: string } }>("/translate", async (request, reply: FastifyReply) => {
    const { text } = request.body;
    const provider = getAIProvider(config.ai);

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a translator from technical jargon to plain English. " +
          "Rewrite the given text so that anyone without a technical background can understand it. " +
          "Keep the same meaning. Use analogies where helpful. " +
          "Do not add any preamble — just output the plain English version.",
        timestamp: new Date().toISOString(),
      },
      {
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      },
    ];

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      if (provider.streamChat) {
        await provider.streamChat(messages, config.ai, (chunk: string) => {
          reply.raw.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
        });
      } else {
        const response = await provider.chat(messages, config.ai);
        reply.raw.write(`data: ${JSON.stringify({ delta: response })}\n\n`);
      }
      reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err: any) {
      reply.raw.write(`data: ${JSON.stringify({ error: err.message || "Translation failed" })}\n\n`);
    }

    reply.raw.end();
    return reply;
  });
};
