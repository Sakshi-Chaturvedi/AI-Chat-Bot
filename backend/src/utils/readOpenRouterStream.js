export async function* readOpenRouterStream(readableStream) {
  const reader = readableStream.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || !trimmed.startsWith("data:")) continue;

      const data = trimmed.replace(/^data:\s*/, "");

      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);

        const text =
          parsed?.choices?.[0]?.delta?.content ||
          parsed?.choices?.[0]?.message?.content ||
          "";

        if (text) {
          yield text;
        }
      } catch (error) {
        console.log("OpenRouter stream parse error:", error.message);
      }
    }
  }
}