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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Get the audio data from form data or JSON
    let audioBase64 = "";
    let mimeType = "audio/webm";

    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File;
      if (audioFile) {
        const buffer = await audioFile.arrayBuffer();
        audioBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        mimeType = audioFile.type || "audio/webm";
      }
    } else {
      const body = await req.json();
      audioBase64 = body.audio;
      mimeType = body.mimeType || "audio/webm";
    }

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "No audio data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use OpenRouter with GPT-4o for audio transcription
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-kisa-school.edu",
        "X-Title": "AI KISA Voice Transcriber",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a Professional Voice Transcriber for AI KISA Model School, Pakistan.

TASK: Transcribe this audio recording accurately.

TRANSCRIPTION RULES:
1. Return ONLY the transcribed text - no explanations or commentary
2. If the speaker is speaking in Urdu, Hindi, or any South Asian language, transcribe in ROMAN URDU (Latin alphabet)
3. Examples of Roman Urdu:
   - "Mujhe yeh samajh nahi aaya" (NOT مجھے یہ سمجھ نہیں آیا)
   - "Aap kaise hain?" (NOT آپ کیسے ہیں؟)
   - "Main aaj school gaya tha" (NOT میں آج سکول گیا تھا)
4. Do NOT use Devanagari (Hindi script) or Arabic/Urdu script
5. Always use English alphabet letters (a-z) for transcription
6. If the audio is in English, transcribe normally in English
7. If audio is unclear, transcribe what you can hear clearly
8. Maintain proper punctuation and sentence structure`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${audioBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      console.error("OpenRouter transcription error:", errorData);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Failed to transcribe audio");
    }

    const aiData = await aiResponse.json();
    const transcription = aiData.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ 
        success: true,
        text: transcription.trim()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Voice to text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
