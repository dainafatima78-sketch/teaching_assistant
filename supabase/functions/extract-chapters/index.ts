import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { documentId, teacherId } = body;

    if (!documentId || !teacherId) {
      return new Response(JSON.stringify({ error: "Missing documentId or teacherId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get extracted content
    const { data: contentData, error: contentError } = await supabase
      .from("extracted_content")
      .select("content")
      .eq("document_id", documentId)
      .single();

    if (contentError || !contentData?.content) {
      return new Response(JSON.stringify({ error: "No extracted content found. Please process the document first." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractedText = contentData.content;
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Use OpenRouter for chapter extraction
    const chapterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-kisa-school.edu",
        "X-Title": "AI KISA Chapter Extractor",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a Professional Content Analyzer for AI KISA Model School.

TASK: Analyze educational content and extract chapters/topics.

INSTRUCTIONS:
1. Identify distinct chapters or major sections
2. For each chapter, provide name and brief content summary
3. If no clear chapters exist, divide by major topics

OUTPUT FORMAT (JSON only):
{"chapters": [{"name": "Chapter Name", "content": "Brief 2-3 sentence summary of chapter content"}]}

Return ONLY valid JSON, no other text.`
          },
          {
            role: "user",
            content: `Extract chapters from this educational content:\n\n${extractedText.substring(0, 15000)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!chapterResponse.ok) {
      const errorData = await chapterResponse.json().catch(() => ({}));
      console.error("OpenRouter chapter extraction error:", errorData);
      throw new Error("Failed to extract chapters");
    }

    const chapterData = await chapterResponse.json();
    const chapterContent = chapterData.choices?.[0]?.message?.content || "{}";
    
    let chapters: { name: string; content: string }[] = [];
    try {
      const parsed = JSON.parse(chapterContent);
      chapters = Array.isArray(parsed) ? parsed : (parsed.chapters || []);
    } catch (e) {
      console.error("Failed to parse chapters:", e);
      chapters = [];
    }

    if (chapters.length > 0) {
      // Delete existing chapters
      await supabase
        .from("chapters")
        .delete()
        .eq("document_id", documentId);

      // Insert new chapters
      const chaptersToInsert = chapters.map((ch, idx) => ({
        document_id: documentId,
        teacher_id: teacherId,
        name: ch.name || `Section ${idx + 1}`,
        content: ch.content || "",
        order_index: idx,
      }));

      const { error: insertError } = await supabase
        .from("chapters")
        .insert(chaptersToInsert);

      if (insertError) {
        console.error("Chapter insert error:", insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        chaptersExtracted: chapters.length,
        chapters: chapters.map(c => c.name)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Extract chapters error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
