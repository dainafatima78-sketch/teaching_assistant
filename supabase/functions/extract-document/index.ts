import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { unzipSync } from "https://esm.sh/fflate@0.8.2?deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Proper DOCX extractor: unzip -> word/document.xml -> parse <w:t> nodes.
function extractTextFromDocx(arrayBuffer: ArrayBuffer): string {
  try {
    const zipBytes = new Uint8Array(arrayBuffer);
    const unzipped = unzipSync(zipBytes);

    // Most DOCX text lives here
    const documentXmlBytes = unzipped["word/document.xml"] as Uint8Array | undefined;
    if (!documentXmlBytes) return "";

    const xml = new TextDecoder("utf-8").decode(documentXmlBytes);

    // Preserve basic structure: paragraphs + line breaks + tabs
    // We'll stream through relevant tokens so we can keep newlines.
    const tokenRe = /(<\/w:p>|<w:br\b[^>]*\/?>|<w:tab\b[^>]*\/?>|<w:t\b[^>]*>[^<]*<\/w:t>)/g;
    const textParts: string[] = [];
    let m: RegExpExecArray | null;

    while ((m = tokenRe.exec(xml)) !== null) {
      const token = m[1];
      if (token.startsWith("</w:p")) {
        textParts.push("\n");
        continue;
      }
      if (token.startsWith("<w:br")) {
        textParts.push("\n");
        continue;
      }
      if (token.startsWith("<w:tab")) {
        textParts.push("\t");
        continue;
      }
      if (token.startsWith("<w:t")) {
        const inner = token
          .replace(/^<w:t\b[^>]*>/, "")
          .replace(/<\/w:t>$/, "");
        if (inner) textParts.push(inner);
      }
    }

    const raw = textParts.join("");
    const normalized = raw
      .replace(/\r/g, "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Sanity check: avoid storing ZIP noise
    if (normalized.length < 50) return "";
    return normalized;
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

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // For text files, extract directly (fastest)
    if (fileTypeLower === "txt" || fileTypeLower === "text/plain") {
      extractedText = await fileData.text();
      console.log(`Text file extracted in ${Date.now() - startTime}ms`);
    } 
    // For DOCX - unzip + XML extraction (reliable)
    else if (fileTypeLower.includes("docx") || fileTypeLower.includes("wordprocessingml")) {
      const arrayBuffer = await fileData.arrayBuffer();
      extractedText = extractTextFromDocx(arrayBuffer);
      console.log(`DOCX extracted in ${Date.now() - startTime}ms`);
    }
    // For PDF and images - use GPT-4o vision
    else {
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      // Determine MIME type
      let mimeType = "image/png";
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

      console.log(`Using OpenRouter AI extraction for ${mimeType}`);

      // Use OpenRouter with GPT-4o for vision extraction
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
                {
                  type: "text",
                  text: `You are a Professional Document Extractor for AI KISA Model School.

TASK: Extract ALL text from this educational document.

INSTRUCTIONS:
- Extract complete text preserving structure
- Maintain headings, subheadings, and formatting
- Include all questions, answers, and educational content
- Preserve numbered lists and bullet points

Return ONLY the extracted text without any commentary.`
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
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        console.error("OpenRouter extraction error:", errorData);
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
