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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    // Use Gemini for audio transcription
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Transcribe this audio recording. Follow these rules strictly:

1. Return ONLY the transcribed text, nothing else.
2. If the speaker is speaking in Urdu, Hindi, or any South Asian language, you MUST write the transcription in ROMAN URDU (using English/Latin alphabet).
3. Examples of Roman Urdu:
   - "Mujhe yeh samajh nahi aaya" (NOT مجھے یہ سمجھ نہیں آیا)
   - "Aap kaise hain?" (NOT آپ کیسے ہیں؟)
   - "Main aaj school gaya tha" (NOT میں آج سکول گیا تھا)
4. Do NOT use Devanagari (Hindi script) or Arabic/Urdu script.
5. Always use English alphabet letters (a-z) for transcription.
6. If the audio is in English, transcribe normally in English.
7. If audio is unclear, do your best to transcribe what you can hear.`
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
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI transcription error:", errorText);
      
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
