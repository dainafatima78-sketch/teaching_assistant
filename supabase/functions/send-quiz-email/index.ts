import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuizEmailRequest {
  studentEmails: string[];
  quizTitle: string;
  subject?: string;
  classLevel?: string;
  teacherName?: string;
  quizUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { studentEmails, quizTitle, subject, classLevel, teacherName, quizUrl }: QuizEmailRequest = await req.json();

    if (!studentEmails || studentEmails.length === 0) {
      throw new Error("No student emails provided");
    }

    if (!quizUrl) {
      throw new Error("Quiz URL is required");
    }

    const results = [];
    
    for (const email of studentEmails) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Know Your Syllabus <onboarding@resend.dev>",
            to: [email],
            subject: `New Quiz: ${quizTitle}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                  .quiz-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                  .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                  .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>📝 New Quiz Assigned!</h1>
                  </div>
                  <div class="content">
                    <p>Dear Student,</p>
                    <p>Your teacher <strong>${teacherName || 'Your Teacher'}</strong> has assigned you a new quiz.</p>
                    
                    <div class="quiz-details">
                      <h3 style="margin-top: 0; color: #667eea;">Quiz Details</h3>
                      <p><strong>Title:</strong> ${quizTitle}</p>
                      ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
                      ${classLevel ? `<p><strong>Class:</strong> ${classLevel}</p>` : ''}
                    </div>
                    
                    <p style="text-align: center;">
                      <a href="${quizUrl}" class="btn">Take Quiz Now →</a>
                    </p>
                    
                    <p style="color: #6b7280; font-size: 14px;">
                      <strong>Note:</strong> You will need to log in or create a student account to take this quiz.
                    </p>
                  </div>
                  <div class="footer">
                    <p>This email was sent from Know Your Syllabus</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to send email");
        }

        const data = await response.json();
        results.push({ email, success: true, id: data.id });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${email}:`, emailError);
        results.push({ email, success: false, error: emailError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount} email${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-quiz-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
