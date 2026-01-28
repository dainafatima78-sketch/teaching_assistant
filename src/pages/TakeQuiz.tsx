import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileQuestion, Loader2, Send, CheckCircle, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

interface Quiz {
  id: string;
  title: string;
  content: string;
  subject: string | null;
  class_level: string | null;
  chapters: string[] | null;
  difficulty: string | null;
  num_questions: number | null;
  teacher_id: string;
}

// Strip answer key section from quiz content for student view
function stripAnswerKey(content: string): string {
  // Common patterns for answer key sections
  const patterns = [
    /={3,}\s*ANSWER\s*KEY.*$/is,
    /---+\s*ANSWER\s*KEY.*$/is,
    /\n\s*ANSWER\s*KEY\s*\(FOR\s*TEACHER.*$/is,
    /\n\s*ANSWER\s*KEY.*$/is,
    /\n\s*ANSWERS?\s*:\s*\n.*$/is,
    /MCQs?\s*:\s*Q\d+-\[?[A-D]\]?.*$/is,
  ];
  
  let result = content;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }
  
  return result.trim();
}

interface ParsedQuestion {
  id: string;
  type: "mcq" | "short" | "long";
  question: string;
  options?: string[];
  answer?: string;
}

export default function TakeQuiz() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Check auth and redirect if needed
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/student/auth?redirect=/quiz/take/${shareToken}`);
    }
  }, [user, authLoading, shareToken, navigate]);

  // Fetch quiz and student profile
  useEffect(() => {
    const fetchQuizAndProfile = async () => {
      if (!shareToken || !user) return;

      try {
        // Fetch quiz by share token
        const { data: quizData, error: quizError } = await supabase
          .from("quiz_history")
          .select("*")
          .eq("share_token", shareToken)
          .eq("is_shared", true)
          .single();

        if (quizError || !quizData) {
          setError("Quiz not found or link has expired");
          return;
        }

        setQuiz(quizData);
        parseQuestions(quizData.content);

        // Fetch student profile
        const { data: profileData } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileData) {
          setStudentName(profileData.full_name || "");
          setStudentClass(profileData.class_level || "");
        }

        // Check if already submitted
        const { data: existingSubmission } = await supabase
          .from("quiz_submissions")
          .select("id")
          .eq("quiz_id", quizData.id)
          .eq("student_id", user.id)
          .single();

        if (existingSubmission) {
          setSubmitted(true);
        }
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setError("Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizAndProfile();
  }, [shareToken, user]);

  const parseQuestions = (content: string) => {
    const parsed: ParsedQuestion[] = [];
    const lines = content.split("\n");
    let currentQuestion: Partial<ParsedQuestion> | null = null;
    let questionCounter = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect question patterns
      const mcqMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
      const optionMatch = trimmed.match(/^([A-Da-d])\)\s*(.+)/);
      
      if (mcqMatch && !optionMatch) {
        // Save previous question
        if (currentQuestion && currentQuestion.question) {
          parsed.push({
            id: `q${questionCounter}`,
            type: currentQuestion.options && currentQuestion.options.length > 0 ? "mcq" : 
                  currentQuestion.question.toLowerCase().includes("explain") || 
                  currentQuestion.question.toLowerCase().includes("describe") ||
                  currentQuestion.question.length > 100 ? "long" : "short",
            question: currentQuestion.question,
            options: currentQuestion.options,
          } as ParsedQuestion);
        }
        
        questionCounter++;
        currentQuestion = {
          question: mcqMatch[2],
          options: [],
        };
      } else if (optionMatch && currentQuestion) {
        currentQuestion.options = currentQuestion.options || [];
        currentQuestion.options.push(`${optionMatch[1]}) ${optionMatch[2]}`);
      }
    }

    // Save last question
    if (currentQuestion && currentQuestion.question) {
      parsed.push({
        id: `q${questionCounter}`,
        type: currentQuestion.options && currentQuestion.options.length > 0 ? "mcq" : 
              currentQuestion.question.toLowerCase().includes("explain") || 
              currentQuestion.question.toLowerCase().includes("describe") ||
              currentQuestion.question.length > 100 ? "long" : "short",
        question: currentQuestion.question,
        options: currentQuestion.options,
      } as ParsedQuestion);
    }

    // If parsing failed, create a single text-based question
    if (parsed.length === 0) {
      parsed.push({
        id: "q1",
        type: "long",
        question: "Please answer the questions shown above in the quiz content.",
      });
    }

    setQuestions(parsed);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quiz || !user || !studentName.trim() || !studentClass.trim()) {
      toast.error("Please fill all required fields before submitting");
      return;
    }

    setSubmitting(true);

    try {
      // Calculate score for MCQs (if we have answer keys)
      let score = 0;
      const totalQuestions = questions.length;

      // Submit answers
      const { error: submitError } = await supabase
        .from("quiz_submissions")
        .insert({
          quiz_id: quiz.id,
          student_id: user.id,
          student_name: studentName,
          student_class: studentClass || null,
          answers: answers,
          score: null, // Teacher will grade
          total_questions: totalQuestions,
        });

      if (submitError) throw submitError;

      // Create notification for teacher
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          teacher_id: quiz.teacher_id,
          type: "quiz_submission",
          title: "New Quiz Submission",
          message: `${studentName} (Class ${studentClass || "N/A"}) has submitted "${quiz.title}"`,
          data: {
            quiz_id: quiz.id,
            quiz_title: quiz.title,
            student_name: studentName,
            student_class: studentClass,
            submitted_at: new Date().toISOString(),
          },
        });

      if (notifError) {
        console.error("Notification error:", notifError);
      }

      setSubmitted(true);
      toast.success("Quiz submitted successfully!");
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(err.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Quiz Not Found</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Quiz Submitted!</h2>
            <p className="text-muted-foreground">
              Your answers have been sent to your teacher. They will review and provide feedback soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header - Logo on top */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src={logo} 
            alt="Your Teaching Assistant" 
            className="h-16 w-16 sm:h-20 sm:w-20 object-contain mb-3" 
          />
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground text-center">
            Your Teaching Assistant
          </h2>
          <p className="text-xs text-muted-foreground">AI Teaching Assistant</p>
        </div>

        {/* Quiz Header */}
        <Card className="mb-6 border-primary/20">
          <CardHeader className="bg-primary/5 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileQuestion className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{quiz?.title || "Quiz"}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  {quiz?.subject && <Badge variant="secondary">{quiz.subject}</Badge>}
                  {quiz?.class_level && <Badge variant="outline">Class {quiz.class_level}</Badge>}
                  {quiz?.difficulty && <Badge variant="outline">{quiz.difficulty}</Badge>}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Student Info */}
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Your Name <span className="text-destructive">*</span></Label>
                <Input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Class <span className="text-destructive">*</span></Label>
                <Input
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="e.g. 10"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Content - Hide answer key from students */}
        <Card className="mb-6 border-primary/20">
          <CardContent className="pt-6">
            <div className="bg-secondary/30 rounded-lg p-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm font-urdu leading-relaxed" dir="auto">
              {quiz?.content ? stripAnswerKey(quiz.content) : ""}
            </div>
          </CardContent>
        </Card>

        {/* Answer Section */}
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Your Answers</CardTitle>
            <CardDescription>
              Write your answers below. Make sure to answer all questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q, index) => (
              <div key={q.id} className="space-y-3 pb-4 border-b last:border-0">
                <Label className="font-medium">
                  Q{index + 1}: {q.question}
                </Label>
                
                {q.type === "mcq" && q.options ? (
                  <RadioGroup
                    value={answers[q.id] || ""}
                    onValueChange={(val) => handleAnswerChange(q.id, val)}
                    className="space-y-2"
                  >
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt} id={`${q.id}-${optIndex}`} />
                        <Label htmlFor={`${q.id}-${optIndex}`} className="font-normal cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder={q.type === "long" ? "Write a detailed answer..." : "Write your answer..."}
                    className={q.type === "long" ? "min-h-[150px]" : "min-h-[80px]"}
                  />
                )}
              </div>
            ))}
          </CardContent>
          <CardFooter className="border-t bg-secondary/20 rounded-b-lg">
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !studentName.trim() || !studentClass.trim()}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Quiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
