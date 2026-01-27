import { useState } from "react";
import { Share2, Copy, Check, Loader2, Link2, ExternalLink, Mail, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareQuizButtonProps {
  quizId: string;
  quizTitle: string;
  shareToken?: string | null;
  isShared?: boolean;
  subject?: string | null;
  classLevel?: string | null;
  onShareUpdate?: (token: string) => void;
}

export function ShareQuizButton({ 
  quizId, 
  quizTitle, 
  shareToken: initialToken, 
  isShared: initialShared,
  subject,
  classLevel,
  onShareUpdate 
}: ShareQuizButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [shareToken, setShareToken] = useState(initialToken || null);
  const [isShared, setIsShared] = useState(initialShared || false);
  const [copied, setCopied] = useState(false);
  
  // Email states
  const [emailInput, setEmailInput] = useState("");
  const [studentEmails, setStudentEmails] = useState<string[]>([]);

  const generateShareLink = async () => {
    setIsLoading(true);
    try {
      const token = crypto.randomUUID().slice(0, 12);

      const { error } = await supabase
        .from("quiz_history")
        .update({
          is_shared: true,
          share_token: token,
          share_expires_at: null,
        })
        .eq("id", quizId);

      if (error) throw error;

      setShareToken(token);
      setIsShared(true);
      onShareUpdate?.(token);
      toast.success("Share link generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link");
    } finally {
      setIsLoading(false);
    }
  };

  const disableSharing = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("quiz_history")
        .update({
          is_shared: false,
          share_token: null,
        })
        .eq("id", quizId);

      if (error) throw error;

      setShareToken(null);
      setIsShared(false);
      toast.success("Sharing disabled");
    } catch (err: any) {
      toast.error(err.message || "Failed to disable sharing");
    } finally {
      setIsLoading(false);
    }
  };

  const shareUrl = shareToken 
    ? `${window.location.origin}/quiz/take/${shareToken}`
    : "";

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    if (studentEmails.includes(email)) {
      toast.error("Email already added");
      return;
    }
    
    setStudentEmails([...studentEmails, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setStudentEmails(studentEmails.filter(e => e !== email));
  };

  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const sendEmailsToStudents = async () => {
    if (studentEmails.length === 0) {
      toast.error("Please add at least one student email");
      return;
    }

    if (!shareUrl) {
      toast.error("Please generate a share link first");
      return;
    }

    setIsSendingEmails(true);
    try {
      // Get teacher name
      const { data: profile } = await supabase
        .from("teacher_profiles")
        .select("full_name")
        .single();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quiz-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            studentEmails,
            quizTitle,
            subject,
            classLevel,
            teacherName: profile?.full_name || "Your Teacher",
            quizUrl: shareUrl,
          }),
        }
      );

      const data = await response.json();

      // Handle rate limiting (429)
      if (response.status === 429) {
        toast.error("Too many requests. Please wait a moment and try again.", {
          duration: 5000,
        });
        return;
      }

      if (!response.ok) {
        // Check for domain verification error from Resend
        const errorMessage = data.error || "";
        if (errorMessage.includes("verify a domain") || errorMessage.includes("testing emails")) {
          toast.error(
            "Email service requires domain verification. Please share the quiz link directly with students for now.",
            { duration: 8000 }
          );
        } else {
          throw new Error(data.error || "Failed to send emails");
        }
        return;
      }

      // Check if any emails failed
      if (data.results) {
        const failed = data.results.filter((r: any) => !r.success);
        if (failed.length > 0 && failed.length < studentEmails.length) {
          toast.warning(`${data.results.filter((r: any) => r.success).length} emails sent, ${failed.length} failed`);
        } else if (failed.length === studentEmails.length) {
          // All failed - check reason
          const firstError = failed[0]?.error || "";
          if (firstError.includes("verify a domain") || firstError.includes("testing emails")) {
            toast.error(
              "Email service requires domain verification. Please share the quiz link directly with students.",
              { duration: 8000 }
            );
          } else {
            toast.error("Failed to send emails. Please try sharing the link directly.");
          }
          return;
        } else {
          toast.success(data.message || "Emails sent successfully!");
        }
      } else {
        toast.success(data.message || "Emails sent successfully!");
      }
      
      setStudentEmails([]);
    } catch (err: any) {
      console.error("Email sending error:", err);
      // Handle network errors or rate limiting
      if (err.message?.includes("429") || err.message?.includes("rate")) {
        toast.error("Too many requests. Please wait a moment and try again.");
      } else {
        toast.error(err.message || "Failed to send emails. Please share the link directly.");
      }
    } finally {
      setIsSendingEmails(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/5">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Quiz
          </DialogTitle>
          <DialogDescription>
            Share "{quizTitle}" with your students via link or email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isShared && shareToken ? (
            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="link" className="space-y-4 mt-4">
                {/* Share Link */}
                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={copyToClipboard}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-secondary/50 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-medium">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Share this link with your students</li>
                    <li>Students will login or create an account</li>
                    <li>They submit their answers</li>
                    <li>You get notified when they submit</li>
                  </ol>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(shareUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview Link
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={disableSharing}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable"}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="email" className="space-y-4 mt-4">
                {/* Email Input */}
                <div className="space-y-2">
                  <Label>Student Emails</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter student email..."
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyPress={handleEmailKeyPress}
                    />
                    <Button variant="outline" size="icon" onClick={addEmail}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Email List */}
                {studentEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-secondary/30 rounded-lg">
                    {studentEmails.map((email) => (
                      <Badge 
                        key={email} 
                        variant="secondary" 
                        className="flex items-center gap-1 pr-1"
                      >
                        {email}
                        <button 
                          onClick={() => removeEmail(email)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Email Info */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-sm space-y-2">
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Note: Email sending requires domain verification
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs">
                    If emails fail to send, please copy the share link and send it directly to your students via WhatsApp, email, or any messaging app.
                  </p>
                </div>

                {/* Send Button */}
                <Button 
                  className="w-full" 
                  onClick={sendEmailsToStudents}
                  disabled={isSendingEmails || studentEmails.length === 0}
                >
                  {isSendingEmails ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send to {studentEmails.length} Student{studentEmails.length !== 1 ? 's' : ''}
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-6">
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Generate a shareable link for students to take this quiz.
              </p>
              <Button onClick={generateShareLink} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                Generate Share Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
