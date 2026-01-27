import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mode-specific system prompts
const SYSTEM_PROMPTS = {
  full: `You are a school curriculum expert specializing in creating comprehensive syllabi.

TASK: Generate a complete syllabus for the specified class and subject.

OUTPUT FORMAT:
For each chapter, provide:
- Chapter Number and Title
- Topics covered (bullet points)
- Learning Objectives (2-3 per chapter)
- Key Terms/Keywords

RULES:
- Content must be age-appropriate for the specified grade level
- Use clear, simple language suitable for school education
- Follow standard educational frameworks
- Include 6-12 chapters depending on the subject
- Do not include adult, violent, or inappropriate content
- Make topics progressive (simple to complex)`,

  chapter: `You are a school curriculum expert.

TASK: Generate detailed content for a specific chapter.

OUTPUT FORMAT:
- Chapter Title
- Introduction (2-3 sentences)
- Main Topics (with brief explanations)
- Sub-topics under each main topic
- Learning Objectives (3-5 objectives)
- Key Terms with definitions
- Suggested Activities (2-3)
- Assessment Questions (3-5 sample questions)

RULES:
- Content must be age-appropriate
- Use simple, clear language
- Be comprehensive but concise
- Include practical examples where relevant`,

  bulk: `You are a school curriculum expert.

TASK: Generate multiple chapter titles and outlines in bulk.

OUTPUT FORMAT:
For each chapter provide:
- Chapter Number
- Chapter Title
- Brief Outline (2-3 sentences describing what will be covered)
- Key Topics (3-5 bullet points)

RULES:
- Chapters should follow logical progression
- Topics should build upon each other
- Age-appropriate content only
- Cover the full scope of the subject for the grade level
- Use clear, educational language`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      mode, // 'full', 'chapter', 'bulk'
      classLevel,
      subject,
      board, // optional: Punjab, CBSE, Cambridge, etc.
      medium, // English, Urdu
      detailLevel, // Basic, Standard, Detailed
      chapterNumber, // for chapter mode
      chapterTitle, // for chapter mode
      numberOfChapters, // for bulk mode
      stream = true
    } = body;

    // Validate required fields
    if (!mode || !classLevel || !subject) {
      return new Response(JSON.stringify({ error: "Missing required fields: mode, classLevel, subject" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate mode
    if (!SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS]) {
      return new Response(JSON.stringify({ error: "Invalid mode. Use: full, chapter, or bulk" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user message based on mode
    let userMessage = "";
    const boardInfo = board ? `Board/Standard: ${board}` : "";
    const mediumInfo = medium ? `Medium of instruction: ${medium}` : "Medium: English";
    const detailInfo = detailLevel ? `Detail Level: ${detailLevel}` : "Detail Level: Standard";

    if (mode === "full") {
      userMessage = `Generate a complete syllabus for:

Class/Grade: ${classLevel}
Subject: ${subject}
${boardInfo}
${mediumInfo}
${detailInfo}

Please create a comprehensive syllabus with chapters, topics, objectives, and keywords.`;
    } else if (mode === "chapter") {
      if (!chapterNumber && !chapterTitle) {
        return new Response(JSON.stringify({ error: "Chapter mode requires chapterNumber or chapterTitle" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userMessage = `Generate detailed content for:

Class/Grade: ${classLevel}
Subject: ${subject}
Chapter: ${chapterNumber ? `Chapter ${chapterNumber}` : ""}${chapterTitle ? ` - ${chapterTitle}` : ""}
${boardInfo}
${mediumInfo}
${detailInfo}

Please create comprehensive chapter content with topics, objectives, activities, and assessment questions.`;
    } else if (mode === "bulk") {
      const chapCount = numberOfChapters || 10;
      userMessage = `Generate ${chapCount} chapters for:

Class/Grade: ${classLevel}
Subject: ${subject}
${boardInfo}
${mediumInfo}
${detailInfo}

Please create ${chapCount} chapter titles with brief outlines and key topics for each.`;
    }

    const systemPrompt = SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS];

    console.log(`Generating ${mode} syllabus for Class ${classLevel} - ${subject}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    if (stream) {
      return new Response(aiResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const data = await aiResponse.json();
      const content = data.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Generate syllabus error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
