import { useState, useCallback } from "react";
import { toast } from "sonner";

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-syllabus`;

export interface AISyllabusParams {
  mode: "full" | "chapter" | "bulk";
  classLevel: string;
  subject: string;
  board?: string;
  medium?: string;
  detailLevel?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  numberOfChapters?: number;
}

export function useAISyllabusGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: AISyllabusParams) => {
    setIsLoading(true);
    setContent("");
    setError(null);

    console.log("AISyllabusGenerator: Starting generation with params:", {
      mode: params.mode,
      classLevel: params.classLevel,
      subject: params.subject,
    });

    try {
      const response = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ ...params, stream: true }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("AI credits exhausted. Please add credits.");
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate syllabus");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              fullContent += deltaContent;
              setContent(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              fullContent += deltaContent;
              setContent(fullContent);
            }
          } catch { /* ignore */ }
        }
      }

      console.log("AISyllabusGenerator: Generation complete, content length:", fullContent.length);
      return fullContent;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("AISyllabusGenerator: Error occurred:", message);
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setContent("");
    setError(null);
  }, []);

  return {
    generate,
    isLoading,
    content,
    error,
    reset,
  };
}
