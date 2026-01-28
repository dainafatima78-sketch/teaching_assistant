import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Professional mode-specific system prompts for AI KISA Model School
const SYSTEM_PROMPTS = {
  full: `You are a Professional Curriculum Designer for AI KISA Model School, Pakistan.
Your task is to create comprehensive, structured syllabi following Pakistani educational standards.

SYLLABUS GENERATION RULES:
- Content must be age-appropriate for the specified grade level
- Follow Punjab/Pakistani educational board standards
- Use clear, professional language
- Include practical applications where relevant
- Maintain logical progression from simple to complex topics

OUTPUT FORMAT FOR FULL SYLLABUS:
For each chapter, provide:

**Chapter [Number]: [Title]**
Topics Covered:
• Topic 1
• Topic 2
• Topic 3

Learning Objectives:
1. Students will be able to...
2. Students will understand...

Key Terms: term1, term2, term3

---

Include 8-12 chapters covering the full subject scope for the grade level.
Ensure chapters build upon each other progressively.`,

  chapter: `You are a Professional Curriculum Designer for AI KISA Model School, Pakistan.
Create detailed chapter content following Pakistani educational standards.

OUTPUT FORMAT FOR SINGLE CHAPTER:

**Chapter Title: [Name]**

**Introduction**
[2-3 sentences introducing the chapter topic and its importance]

**Main Topics**
1. [Topic Name]
   - Subtopic A
   - Subtopic B
   - Subtopic C

2. [Topic Name]
   - Subtopic A
   - Subtopic B

**Learning Objectives**
By the end of this chapter, students will be able to:
1. [Objective 1]
2. [Objective 2]
3. [Objective 3]

**Key Terms & Definitions**
• Term 1: Definition
• Term 2: Definition

**Suggested Activities**
1. [Activity description]
2. [Activity description]

**Assessment Questions**
1. [Question]
2. [Question]
3. [Question]

Ensure all content is comprehensive, age-appropriate, and follows Pakistani curriculum standards.`,

  bulk: `You are a Professional Curriculum Designer for AI KISA Model School, Pakistan.
Generate multiple chapter outlines for curriculum planning.

OUTPUT FORMAT FOR BULK CHAPTERS:

**Chapter 1: [Title]**
Overview: [2-3 sentence description of chapter scope]
Key Topics:
• Topic 1
• Topic 2
• Topic 3
• Topic 4

**Chapter 2: [Title]**
Overview: [2-3 sentence description]
Key Topics:
• Topic 1
• Topic 2
• Topic 3

[Continue for all chapters...]

RULES:
- Chapters should follow logical progression
- Each chapter should build on previous knowledge
- Topics should cover the full scope of the subject
- Age-appropriate content only
- Follow Pakistani educational standards`
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
    const boardInfo = board ? `Educational Board: ${board}` : "Educational Board: Punjab Board (Pakistan)";
    const mediumInfo = medium ? `Medium of Instruction: ${medium}` : "Medium of Instruction: English";
    const detailInfo = detailLevel ? `Detail Level: ${detailLevel}` : "Detail Level: Standard";

    if (mode === "full") {
      userMessage = `Generate a complete academic syllabus for:

School: AI KISA Model School
Class/Grade: ${classLevel}
Subject: ${subject}
${boardInfo}
${mediumInfo}
${detailInfo}

Please create a comprehensive syllabus with chapters, topics, learning objectives, and key terms following Pakistani curriculum standards.`;
    } else if (mode === "chapter") {
      if (!chapterNumber && !chapterTitle) {
        return new Response(JSON.stringify({ error: "Chapter mode requires chapterNumber or chapterTitle" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userMessage = `Generate detailed chapter content for:

School: AI KISA Model School
Class/Grade: ${classLevel}
Subject: ${subject}
Chapter: ${chapterNumber ? `Chapter ${chapterNumber}` : ""}${chapterTitle ? ` - ${chapterTitle}` : ""}
${boardInfo}
${mediumInfo}
${detailInfo}

Please create comprehensive chapter content including topics, subtopics, objectives, definitions, activities, and assessment questions.`;
    } else if (mode === "bulk") {
      const chapCount = numberOfChapters || 10;
      userMessage = `Generate ${chapCount} chapter outlines for:

School: AI KISA Model School
Class/Grade: ${classLevel}
Subject: ${subject}
${boardInfo}
${mediumInfo}
${detailInfo}

Please create ${chapCount} chapter titles with brief overviews and key topics for each, following Pakistani curriculum standards.`;
    }

    const systemPrompt = SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS];

    console.log(`Generating ${mode} syllabus for Class ${classLevel} - ${subject}`);

    // Call OpenRouter API with ChatGPT model
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-kisa-school.edu",
        "X-Title": "AI KISA Syllabus Generator",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream,
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      console.error("OpenRouter API error:", aiResponse.status, errorData);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to OpenRouter." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(errorData.error?.message || "AI API error");
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
