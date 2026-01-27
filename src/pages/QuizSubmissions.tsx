import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Clock, CheckCircle, MessageSquare, Loader2, FileQuestion } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Submission {
  id: string;
  student_name: string;
  student_class: string | null;
  answers: Record<string, string>;
  score: number | null;
  total_questions: number | null;
  submitted_at: string;
  is_reviewed: boolean;
  teacher_feedback: string | null;
}

interface Quiz {
  id: string;
  title: string;
  content: string;
  subject: string | null;
  class_level: string | null;
}

export default function QuizSubmissions() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!quizId) return;

      try {
        // Fetch quiz
        const { data: quizData, error: quizError } = await supabase
          .from("quiz_history")
          .select("*")
          .eq("id", quizId)
          .single();

        if (quizError) throw quizError;
        setQuiz(quizData);

        // Fetch submissions
        const { data: submissionsData, error: submissionsError } = await supabase
          .from("quiz_submissions")
          .select("*")
          .eq("quiz_id", quizId)
          .order("submitted_at", { ascending: false });

        if (submissionsError) throw submissionsError;
        
        // Transform data to match interface
        const transformed = (submissionsData || []).map(s => ({
          ...s,
          answers: (typeof s.answers === 'object' && s.answers !== null ? s.answers : {}) as Record<string, string>,
        }));
        setSubmissions(transformed);
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quizId]);

  const handleSelectSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setFeedback(submission.teacher_feedback || "");
    setScore(submission.score?.toString() || "");
  };

  const handleSaveFeedback = async () => {
    if (!selectedSubmission) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("quiz_submissions")
        .update({
          teacher_feedback: feedback || null,
          score: score ? parseFloat(score) : null,
          is_reviewed: true,
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      // Update local state
      setSubmissions(prev =>
        prev.map(s =>
          s.id === selectedSubmission.id
            ? { ...s, teacher_feedback: feedback, score: score ? parseFloat(score) : null, is_reviewed: true }
            : s
        )
      );
      setSelectedSubmission(prev =>
        prev ? { ...prev, teacher_feedback: feedback, score: score ? parseFloat(score) : null, is_reviewed: true } : null
      );

      toast.success("Feedback saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save feedback");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/history")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Quiz Submissions</h1>
            <p className="text-muted-foreground">{quiz?.title}</p>
          </div>
        </div>

        {/* Quiz Info */}
        <Card className="border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="secondary">{quiz?.subject || "General"}</Badge>
              <Badge variant="outline">Class {quiz?.class_level || "N/A"}</Badge>
              <Badge variant="outline">{submissions.length} Submissions</Badge>
              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                {submissions.filter(s => s.is_reviewed).length} Reviewed
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <Card className="lg:col-span-1 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Students ({submissions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {submissions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No submissions yet
                </div>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className={`p-4 cursor-pointer hover:bg-secondary/50 transition-colors ${
                        selectedSubmission?.id === sub.id ? "bg-primary/10 border-l-4 border-primary" : ""
                      }`}
                      onClick={() => handleSelectSubmission(sub)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{sub.student_name}</span>
                        {sub.is_reviewed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>Class {sub.student_class || "N/A"}</span>
                        <span>•</span>
                        <span>{format(new Date(sub.submitted_at), "MMM d, h:mm a")}</span>
                      </div>
                      {sub.score !== null && (
                        <Badge variant="secondary" className="mt-2">
                          Score: {sub.score}/{sub.total_questions}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Details */}
          <Card className="lg:col-span-2 border-primary/20">
            {selectedSubmission ? (
              <>
                <CardHeader className="bg-primary/5 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedSubmission.student_name}</CardTitle>
                      <CardDescription>
                        Class {selectedSubmission.student_class || "N/A"} • 
                        Submitted {format(new Date(selectedSubmission.submitted_at), "PPp")}
                      </CardDescription>
                    </div>
                    <Badge variant={selectedSubmission.is_reviewed ? "default" : "outline"}>
                      {selectedSubmission.is_reviewed ? "Reviewed" : "Pending Review"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Student Answers */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileQuestion className="h-4 w-4" />
                      Student Answers
                    </h4>
                    <div className="bg-secondary/30 rounded-lg p-4 max-h-64 overflow-y-auto space-y-4">
                      {Object.entries(selectedSubmission.answers).map(([qId, answer], index) => (
                        <div key={qId} className="border-b pb-3 last:border-0">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Question {index + 1}:</p>
                          <p className="text-sm">{answer || "(No answer)"}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scoring */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Score (out of {selectedSubmission.total_questions})</Label>
                      <Input
                        type="number"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="Enter score"
                        min="0"
                        max={selectedSubmission.total_questions || 100}
                      />
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Teacher Feedback
                    </Label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Write feedback for the student..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button onClick={handleSaveFeedback} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Review
                  </Button>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a submission to view details</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
