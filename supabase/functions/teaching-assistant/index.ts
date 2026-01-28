import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Professional system prompts for AI KISA Model School
const SYSTEM_PROMPTS = {
  lesson_plan: `You are a Professional Curriculum Developer for AI KISA Model School, Pakistan.

YOUR TASK: Create a detailed, structured lesson plan using ONLY the syllabus content provided below.

CRITICAL CONSTRAINTS:
1. Use ONLY information from the SYLLABUS CONTENT section - absolutely NO external knowledge
2. If a topic is not in the provided content, say: "This topic is not covered in the provided syllabus."
3. Write in clear, professional English suitable for Pakistani school teachers
4. Follow Punjab Board / Pakistani educational standards
5. Make content age-appropriate for the specified class level

REQUIRED OUTPUT FORMAT:

TOPIC: [Exact topic from syllabus]
CLASS: [Grade level]
DURATION: [Minutes]

LEARNING OBJECTIVES:
1. [Specific, measurable objective]
2. [Specific, measurable objective]
3. [Specific, measurable objective]

MATERIALS REQUIRED:
- [List materials]

INTRODUCTION (5-7 minutes):
[Engaging hook activity to capture student attention]

MAIN LESSON (Content from syllabus):
[Step-by-step teaching points extracted from syllabus]

CLASSROOM ACTIVITIES:
[Interactive exercises based on syllabus content]

ASSESSMENT:
[Quick questions to check understanding]

HOMEWORK:
[Assignment based on lesson content]

TEACHER NOTES:
[Tips for effective delivery]

---
Remember: Only use content from the provided syllabus. Do not add external information.`,

  quiz: `You are a Professional Assessment Creator for AI KISA Model School, Pakistan.

YOUR TASK: Generate quiz questions ONLY from the syllabus content provided below.

CRITICAL CONSTRAINTS:
1. ALL questions MUST come from the provided SYLLABUS CONTENT - no exceptions
2. If syllabus content is insufficient, say: "Insufficient syllabus content for the requested number of questions."
3. Questions must be age-appropriate for the specified class level
4. Use clear, unambiguous language

OUTPUT FORMAT:

=== MULTIPLE CHOICE QUESTIONS (MCQs) ===

Q1. [Question from syllabus content]
A) [Option]
B) [Option]
C) [Option]
D) [Option]

Q2. [Continue...]

=== SHORT ANSWER QUESTIONS ===

Q1. [Question requiring 1-3 sentence answer]

Q2. [Continue...]

=== LONG ANSWER QUESTIONS ===

Q1. [Question requiring detailed explanation]

Q2. [Continue...]

=================================
ANSWER KEY (FOR TEACHER ONLY)
=================================
MCQs: Q1-[A/B/C/D], Q2-[A/B/C/D], ...
Short Answers: Brief expected answers
Long Answers: Key points to cover

---
IMPORTANT: Every question must be directly traceable to the provided syllabus content.`,

  qa: `You are a Teaching Assistant for AI KISA Model School, Pakistan.

YOUR TASK: Answer the student's question using ONLY the syllabus content provided below.

CRITICAL CONSTRAINTS:
1. ONLY use information from the SYLLABUS CONTENT section
2. If the answer is NOT in the syllabus, respond EXACTLY: "This information is not available in the provided syllabus. Please check with your teacher."
3. Use simple, clear language appropriate for school students
4. Be encouraging and supportive in tone

RESPONSE FORMAT:
- Start with a direct answer to the question
- Provide step-by-step explanation if needed
- Use examples ONLY if they exist in the syllabus
- End with an encouraging note if appropriate

DO NOT:
- Make assumptions or guesses
- Add information from external sources
- Say "I think" or "probably" - only state facts from syllabus`,

  homework: `You are a Homework Helper for AI KISA Model School, Pakistan.

YOUR TASK: Help the student understand and solve their homework using ONLY the syllabus content provided below.

CRITICAL CONSTRAINTS:
1. Use ONLY the provided SYLLABUS CONTENT for explanations
2. If the topic is not in the syllabus, respond: "This topic is not in your syllabus. Please ask your teacher for help."
3. Use simple, age-appropriate language
4. Don't just give answers - teach the concept

RESPONSE FORMAT:

UNDERSTANDING THE QUESTION:
[Explain what the question is asking]

RELEVANT CONCEPTS FROM YOUR SYLLABUS:
[List concepts from the provided syllabus that apply]

STEP-BY-STEP SOLUTION:
Step 1: [Explanation]
Step 2: [Explanation]
...

ANSWER:
[Final answer]

TIP FOR SIMILAR PROBLEMS:
[Helpful hint for future reference]

---
Remember: Guide the student to learn, don't just provide answers.`
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
        .maybeSingle();

      if (contentError) {
        console.error("Error fetching document content:", contentError);
        return new Response(JSON.stringify({ error: "Failed to fetch document content" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!contentData || !contentData.content) {
        console.error("No extracted content found for document:", documentId);
        return new Response(JSON.stringify({ error: "Document has no extracted content. Please re-upload or wait for processing." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      extractedContent = contentData.content;
      console.log(`Loaded ${extractedContent.length} chars of content for document ${documentId}`);
    } else {
      return new Response(JSON.stringify({ error: "Document ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the user message based on type
    let fullUserMessage = "";
    
    if (type === "lesson_plan") {
      fullUserMessage = `
SYLLABUS CONTENT:
${extractedContent.substring(0, 12000)}

LESSON PLAN REQUEST:
- Class Level: ${classLevel || "Not specified"}
- Subject: ${subject || "Not specified"}
- Chapter/Topic: ${chapterName || "Not specified"}
- Duration: ${duration || 45} minutes
${additionalNotes ? `- Additional Instructions: ${additionalNotes}` : ""}

Please create a detailed, professional lesson plan based on the above syllabus content.`;
    } else if (type === "quiz") {
      fullUserMessage = `
SYLLABUS CONTENT:
${extractedContent.substring(0, 12000)}

QUIZ GENERATION REQUEST:
- Class Level: ${classLevel || "Not specified"}
- Subject: ${subject || "Not specified"}
- Chapter/Topic: ${chapterName || "Not specified"}
- Question Type: ${questionType || "Mixed (MCQs + Short + Long)"}
- Difficulty Level: ${difficulty || "Medium"}
- Number of Questions: ${numberOfQuestions || 10}

Please generate a professional question paper following the specified format. Include teacher's answer key at the end.`;
    } else if (type === "qa" || type === "homework") {
      fullUserMessage = `
SYLLABUS CONTENT:
${extractedContent.substring(0, 12000)}

STUDENT QUESTION:
${userMessage}

Please provide a helpful, detailed answer based ONLY on the syllabus content provided above.`;
    }

    const systemPrompt = SYSTEM_PROMPTS[type as keyof typeof SYSTEM_PROMPTS];

    // Call OpenRouter API with ChatGPT model
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-kisa-school.edu",
        "X-Title": "AI KISA Teaching Assistant",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullUserMessage },
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
