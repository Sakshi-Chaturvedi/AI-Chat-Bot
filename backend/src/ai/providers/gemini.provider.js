import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { ErrorHandler } from "../../middlewares/error.middleware.js";

export const generateGeminiResponse = async ({
  prompt,
  history = [],
  systemInstruction,
}) => {
  try {
    if (!prompt || !prompt.trim()) {
      throw new ErrorHandler("Prompt is required.", 400);
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new ErrorHandler("Gemini API key is missing.", 500);
    }

    const formattedPrompt = `
Conversation history:
${history.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n")}

User's latest message:
${prompt}
`;

    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Use a stable model. Avoid preview name if it gives invalid model error.
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    const result = await genAI.models.generateContent({
      model: modelName,
      contents: formattedPrompt.trim(),
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const response = result.text;

    if (!response) {
      throw new ErrorHandler("Empty AI response received.", 500);
    }

    return {
      response,
      model: modelName,
      tokensUsed: 0,
      provider: "gemini",
    };
  } catch (error) {
    if (error instanceof ErrorHandler) {
      throw error;
    }

    console.error("Gemini API Error:", error.message);

    let cleanMessage = "Gemini AI response generation failed.";

    if (error.message?.includes("API key not valid")) {
      cleanMessage = "Gemini API key is invalid.";
    }

    throw new ErrorHandler(cleanMessage, 500);
  }
};