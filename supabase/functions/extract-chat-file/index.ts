import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileBase64, fileType, fileName, mimeType } = await req.json();

    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prompt = "";
    let contentType = mimeType;

    if (fileType === "image") {
      prompt = `You are a Professional Document Extractor for AI KISA Model School.

TASK: Extract all text content from this image accurately.

INSTRUCTIONS:
- Extract ALL visible text including questions, equations, diagrams labels
- Preserve the original structure and formatting
- If there are numbered questions, maintain the numbering
- Include any mathematical equations or formulas
- Note any diagrams or figures with brief descriptions

OUTPUT: Return only the extracted text without any commentary or explanations.`;
      if (!contentType) contentType = "image/jpeg";
    } else if (fileType === "pdf") {
      prompt = `You are a Professional Document Extractor for AI KISA Model School.

TASK: Extract all readable text from this PDF document.

INSTRUCTIONS:
- Extract complete text content preserving structure
- Maintain headings, subheadings, and formatting
- Include all questions, answers, and educational content
- Preserve numbered lists and bullet points

OUTPUT: Return only the extracted text without commentary.`;
      contentType = "application/pdf";
    } else if (fileType === "docx") {
      prompt = `You are a Professional Document Extractor for AI KISA Model School.

TASK: Extract all text from this Word document.

INSTRUCTIONS:
- Extract complete text preserving structure
- Maintain headings and formatting hierarchy
- Include all educational content

OUTPUT: Return only the extracted text.`;
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else {
      prompt = `Extract all text content from this file accurately. Return only the extracted text.`;
    }

    // Use OpenRouter with GPT-4o for vision capability
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-kisa-school.edu",
        "X-Title": "AI KISA Document Extractor",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${contentType};base64,${fileBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      console.error("OpenRouter API error:", aiResponse.status, errorData);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to process file");
    }

    const data = await aiResponse.json();
    const extractedText = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText.trim(),
        fileName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("File extraction error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
