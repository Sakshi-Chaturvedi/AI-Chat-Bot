import { ErrorHandler } from "../../middlewares/error.middleware.js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const buildOpenRouterMessages = ({ prompt, history = [], systemInstruction }) => {
  const messages = [];

  if (systemInstruction) {
    messages.push({
      role: "system",
      content: systemInstruction,
    });
  }

  for (const msg of history) {
    if (!msg?.content?.trim()) continue;

    messages.push({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content.trim(),
    });
  }

  messages.push({
    role: "user",
    content: prompt.trim(),
  });

  return messages;
};

export const generateOpenRouterStream = async ({
  prompt,
  history = [],
  model,
  systemInstruction,
}) => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new ErrorHandler("OpenRouter API key is missing.", 500);
  }

  if (!prompt?.trim()) {
    throw new ErrorHandler("Prompt is required.", 400);
  }

  const selectedModel =
    model || process.env.OPENROUTER_DEFAULT_MODEL || "openrouter/free";

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Aura AI",
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: buildOpenRouterMessages({
        prompt,
        history,
        systemInstruction,
      }),
      temperature: 0.7,
      max_tokens: 1200,
      stream: true,
    }),
  });

  if (!response.ok) {
    const rawText = await response.text();
    throw new ErrorHandler(rawText || "OpenRouter stream request failed.", response.status);
  }

  if (!response.body) {
    throw new ErrorHandler("OpenRouter stream body not found.", 500);
  }

  return {
    stream: response.body,
    model: selectedModel,
    provider: "openrouter",
  };
};