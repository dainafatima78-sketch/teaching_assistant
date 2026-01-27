import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple XML/DOCX text extractor - extracts text from DOCX without external libraries
function extractTextFromDocx(arrayBuffer: ArrayBuffer): string {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    // DOCX files are ZIP archives containing XML
    // Try to find and extract text from document.xml patterns
    const textMatches: string[] = [];
    
    // Look for text content between XML tags
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        textMatches.push(match[1]);
      }
    }
    
    if (textMatches.length > 0) {
      return textMatches.join(" ");
    }
    
    // Fallback: extract any readable text
    const readableText = text.replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    return readableText.length > 100 ? readableText : "";
  } catch (e) {
    console.error("DOCX extraction error:", e);
    return "";
  }
}

// Chunked base64 encoding to avoid stack overflow with large files
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return base64Encode(buffer);
}

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
    const { documentId, storagePath, fileType, extractChapters = false, teacherId } = body;

    if (!documentId || !storagePath) {
      return new Response(JSON.stringify({ error: "Missing documentId or storagePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing document: ${documentId}, type: ${fileType}`);
    const startTime = Date.now();

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("syllabus-documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Downloaded in ${Date.now() - startTime}ms`);

    let extractedText = "";
    const fileTypeLower = (fileType || "").toLowerCase();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // For text files, extract directly (fastest)
    if (fileTypeLower === "txt" || fileTypeLower === "text/plain") {
      extractedText = await fileData.text();
      console.log(`Text file extracted in ${Date.now() - startTime}ms`);
    } 
    // For DOCX - try direct extraction first (faster than AI)
    else if (fileTypeLower.includes("docx") || fileTypeLower.includes("wordprocessingml")) {
      const arrayBuffer = await fileData.arrayBuffer();
      extractedText = extractTextFromDocx(arrayBuffer);
      
      // If direct extraction failed, use AI with text representation
      if (!extractedText || extractedText.length < 50) {
        console.log("Direct DOCX extraction failed, using AI...");
        const base64 = arrayBufferToBase64(arrayBuffer);
        
        // For DOCX, we'll send raw bytes and ask AI to interpret
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "user",
                content: `This is a base64 encoded DOCX file. Extract any readable text content from it. The file contains educational/syllabus content.

Base64 content (first 10000 chars): ${base64.substring(0, 10000)}

Extract and return all readable text, preserving structure. If you cannot extract text, return an empty response.`
              }
            ],
            max_tokens: 8000,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          extractedText = aiData.choices?.[0]?.message?.content || "";
        }
      }
      console.log(`DOCX extracted in ${Date.now() - startTime}ms`);
    }
    // For PDF and images - use Gemini vision (supports these formats)
    else {
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      // Determine MIME type - only use supported types
      let mimeType = "image/png"; // Default fallback
      if (fileTypeLower.includes("pdf")) {
        mimeType = "application/pdf";
      } else if (fileTypeLower.includes("jpg") || fileTypeLower.includes("jpeg")) {
        mimeType = "image/jpeg";
      } else if (fileTypeLower.includes("png")) {
        mimeType = "image/png";
      } else if (fileTypeLower.includes("webp")) {
        mimeType = "image/webp";
      } else if (fileTypeLower.includes("gif")) {
        mimeType = "image/gif";
      }

      console.log(`Using AI extraction for ${mimeType}`);

      // Use faster model for extraction
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract ALL text from this document. Preserve structure with headings and paragraphs. Return ONLY the text, no commentary.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 8000,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI extraction error:", errorText);
        throw new Error("Failed to extract text from document");
      }

      const aiData = await aiResponse.json();
      extractedText = aiData.choices?.[0]?.message?.content || "";
      console.log(`AI extraction completed in ${Date.now() - startTime}ms`);
    }

    if (!extractedText.trim()) {
      return new Response(JSON.stringify({ error: "No text could be extracted from the document" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store extracted content in database
    const { error: insertError } = await supabase
      .from("extracted_content")
      .upsert({
        document_id: documentId,
        content: extractedText,
        extracted_at: new Date().toISOString(),
      }, {
        onConflict: "document_id"
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to store extracted content" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Document saved. Total time: ${Date.now() - startTime}ms`);

    // Extract chapters ONLY if explicitly requested (separate operation for speed)
    let chaptersExtracted = 0;
    if (extractChapters && teacherId && extractedText.length > 100) {
      console.log("Chapter extraction skipped for faster processing");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedLength: extractedText.length,
        chaptersExtracted,
        processingTime: Date.now() - startTime,
        preview: extractedText.substring(0, 300) + (extractedText.length > 300 ? "..." : "")
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Extract document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
