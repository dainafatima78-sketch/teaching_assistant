import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompts for different content types
const SYSTEM_PROMPTS = {
  lesson_plan: `You are an AI Teaching Assistant for a school education platform.
You ONLY use the provided syllabus content. You do NOT use internet or general AI knowledge.

TASK: Create a detailed lesson plan.

INCLUDE:
- Learning objectives
- Short introduction (5 minutes)
- Main teaching points
- Simple classroom activity
- Assessment questions
- Homework

RULES:
- Use ONLY the provided content
- Do not add new topics
- Use simple English suitable for school students
- Keep explanations clear and teacher-friendly
- If information is not in the content, say: "This topic is not covered in the provided syllabus."`,

  quiz: `You are an AI Teaching Assistant designed for a school quiz system.

IMPORTANT RULES:
- Generate questions ONLY from the provided syllabus content.
- Do NOT include information outside the syllabus.
- Questions must be age-appropriate for the given class.
- Use clear, simple, student-friendly language.
- The quiz will be answered by students via a shared link (like Google Forms).
- Students will SELECT or WRITE answers; do NOT pre-fill answers in the quiz.

QUESTION DESIGN RULES:

MCQs:
- Provide 4 clear options (A, B, C, D)
- Only ONE option should be correct
- DO NOT reveal the correct answer in the student-facing quiz

Short Questions:
- Answerable in 1–2 lines by a student
- Clear and direct wording

Long Questions:
- Step-by-step or explanation-based
- Suitable for written exam style answers

OUTPUT FORMAT (STRICT – STUDENT FORM READY):

MCQs:
1. Question
   A)
   B)
   C)
   D)

Short Questions:
1.
2.

Long Questions:
1.
2.

TEACHER NOTE (INTERNAL – NOT SHOWN TO STUDENTS):
- Provide a separate Answer Key for MCQs only at the END
- Short and long answers will be reviewed by the teacher

FINAL CHECK:
- Quiz must be suitable for online form submission
- No answers visible to students in the question section
- Content must strictly match syllabus
- If the content doesn't cover enough material, say: "The provided syllabus does not contain enough content for this request."`,

  qa: `You are an AI Teaching Assistant for a school education platform.
You ONLY use the provided syllabus content. You do NOT use internet or general AI knowledge.

TASK: Answer questions using ONLY the provided content.

RULES:
- Explain in very simple words suitable for school students
- Use examples only if they appear in the content
- If the answer is NOT found, reply exactly: "This information is not available in the provided syllabus."
- Do NOT guess, assume, or add information
- Be friendly, encouraging, and respectful`,

  homework: `You are an AI Teaching Assistant for a school education platform.
You ONLY use the provided syllabus content. You do NOT use internet or general AI knowledge.

TASK: Explain homework questions step-by-step.

RULES:
- Provide step-by-step explanations
- Use simple English suitable for school students
- Do not introduce new concepts not in the syllabus
- Use only the provided content
- If the topic is not covered, say: "This topic is not included in the provided syllabus."`
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header for user identification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { 
      type, // 'lesson_plan', 'quiz', 'qa', 'homework'
      documentId,
      userMessage,
      // Quiz specific
      questionType,
      difficulty,
      numberOfQuestions,
      // Lesson plan specific
      classLevel,
      subject,
      chapterName,
      duration,
      additionalNotes,
      // Stream option
      stream = true
    } = body;

    // Validate type
    if (!type || !SYSTEM_PROMPTS[type as keyof typeof SYSTEM_PROMPTS]) {
      return new Response(JSON.stringify({ error: "Invalid content type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get extracted content from document
    let extractedContent = "";
    if (documentId) {
      const { data: contentData, error: contentError } = await supabase
        .from("extracted_content")
        .select("content")
        .eq("document_id", documentId)
        .single();

      if (contentError || !contentData) {
        return new Response(JSON.stringify({ error: "Document content not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      extractedContent = contentData.content;
    }

    // Build the user message based on type
    let fullUserMessage = "";
    
    if (type === "lesson_plan") {
      fullUserMessage = `
SYLLABUS CONTENT:
${extractedContent}

LESSON DETAILS:
- Class Level: ${classLevel || "Not specified"}
- Subject: ${subject || "Not specified"}
- Chapter/Topic: ${chapterName || "Not specified"}
- Duration: ${duration || 45} minutes
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ""}

Please create a detailed lesson plan based on the above syllabus content.`;
    } else if (type === "quiz") {
      fullUserMessage = `
SYLLABUS CONTENT:
${extractedContent}

QUIZ DETAILS:
- Class Level: ${classLevel || "Not specified"}
- Subject: ${subject || "Not specified"}
- Chapter/Topic: ${chapterName || "Not specified"}
- Question Type: ${questionType || "MCQs"}
- Difficulty: ${difficulty || "Medium"}
- Number of Questions: ${numberOfQuestions || 10}

Please generate a question paper with the specified format. Include an answer key at the end.`;
    } else if (type === "qa" || type === "homework") {
      fullUserMessage = `
SYLLABUS CONTENT:
${extractedContent}

QUESTION:
${userMessage}

Please answer based ONLY on the syllabus content provided above.`;
    }

    const systemPrompt = SYSTEM_PROMPTS[type as keyof typeof SYSTEM_PROMPTS];

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
          { role: "user", content: fullUserMessage },
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
    console.error("Teaching assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
