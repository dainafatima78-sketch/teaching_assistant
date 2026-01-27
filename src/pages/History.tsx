import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { History as HistoryIcon, FileText, FileQuestion, Trash2, Eye, Calendar, Edit2, Users, Share2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSyllabusHistory, useQuizHistory, useDeleteSyllabusHistory, useDeleteQuizHistory } from "@/hooks/useHistory";
import { formatDistanceToNow, format } from "date-fns";
import { DownloadButtons } from "@/components/syllabus/DownloadButtons";
import { ShareQuizButton } from "@/components/quiz/ShareQuizButton";
import { ContentPreviewModal } from "@/components/content/ContentPreviewModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function History() {
  const navigate = useNavigate();
  const { data: syllabusHistory = [], isLoading: syllabusLoading, refetch: refetchSyllabus } = useSyllabusHistory();
  const { data: quizHistory = [], isLoading: quizLoading, refetch: refetchQuiz } = useQuizHistory();
  const deleteSyllabus = useDeleteSyllabusHistory();
  const deleteQuiz = useDeleteQuizHistory();
  
  const [previewContent, setPreviewContent] = useState<{ 
    id: string;
    title: string; 
    content: string; 
    type: "syllabus" | "quiz";
    classLevel: string | null;
    subject: string | null;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  const handleEdit = () => {
    if (previewContent) {
      setEditedContent(previewContent.content);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!previewContent || !editedContent) return;

    try {
      const table = previewContent.type === "syllabus" ? "syllabus_history" : "quiz_history";
      const { error } = await supabase
        .from(table)
        .update({ content: editedContent })
        .eq("id", previewContent.id);

      if (error) throw error;

      toast.success("Content updated!");
      setIsEditing(false);
      setPreviewContent({ ...previewContent, content: editedContent });
      
      if (previewContent.type === "syllabus") {
        refetchSyllabus();
      } else {
        refetchQuiz();
      }
    } catch (error) {
      toast.error("Failed to update content");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <HistoryIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">History</h1>
              <p className="text-muted-foreground">
                View, edit, and download your previously generated content
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="lessons" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-primary/5">
            <TabsTrigger value="lessons" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4" />
              Lesson Plans ({syllabusHistory.length})
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileQuestion className="h-4 w-4" />
              Quizzes ({quizHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Lesson Plans History */}
          <TabsContent value="lessons" className="mt-6">
            {syllabusLoading ? (
              <Card className="p-8 text-center border-primary/10">
                <p className="text-muted-foreground">Loading...</p>
              </Card>
            ) : syllabusHistory.length === 0 ? (
              <Card className="p-8 text-center border-primary/10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                  <FileText className="h-8 w-8 text-primary/50" />
                </div>
                <p className="text-muted-foreground">No lesson plans generated yet.</p>
                <p className="text-sm text-muted-foreground">Go to Syllabus to create your first lesson plan.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {syllabusHistory.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow border-primary/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {item.title || "Untitled Lesson Plan"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                              {item.class_level && (
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                                  Class {item.class_level}
                                </span>
                              )}
                              {item.subject && <span>{item.subject}</span>}
                              {item.chapters && item.chapters.length > 0 && (
                                <span>• {item.chapters.length} chapter(s)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(item.created_at), "PPP")} ({formatDistanceToNow(new Date(item.created_at), { addSuffix: true })})</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ContentPreviewModal
                            content={item.content}
                            title={item.title || "Lesson Plan"}
                            type="LessonPlan"
                            classLevel={item.class_level}
                            subject={item.subject}
                            triggerVariant="icon"
                          />
                          <DownloadButtons
                            content={item.content}
                            classLevel={item.class_level}
                            subject={item.subject}
                            type="LessonPlan"
                            title={item.title || undefined}
                            size="sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSyllabus.mutate(item.id)}
                            disabled={deleteSyllabus.isPending}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Quizzes History */}
          <TabsContent value="quizzes" className="mt-6">
            {quizLoading ? (
              <Card className="p-8 text-center border-primary/10">
                <p className="text-muted-foreground">Loading...</p>
              </Card>
            ) : quizHistory.length === 0 ? (
              <Card className="p-8 text-center border-primary/10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mx-auto mb-4">
                  <FileQuestion className="h-8 w-8 text-accent/50" />
                </div>
                <p className="text-muted-foreground">No quizzes generated yet.</p>
                <p className="text-sm text-muted-foreground">Go to Quiz Generator to create your first quiz.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {quizHistory.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow border-primary/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                            <FileQuestion className="h-6 w-6 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {item.title || "Untitled Quiz"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                              {item.class_level && (
                                <span className="bg-accent/10 text-accent px-2 py-0.5 rounded text-xs">
                                  Class {item.class_level}
                                </span>
                              )}
                              {item.subject && <span>{item.subject}</span>}
                              {item.question_type && <span>• {item.question_type}</span>}
                              {item.difficulty && <span>• {item.difficulty}</span>}
                              {item.num_questions && <span>• {item.num_questions} questions</span>}
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(item.created_at), "PPP")} ({formatDistanceToNow(new Date(item.created_at), { addSuffix: true })})</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {/* Submissions Badge */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/quiz/submissions/${item.id}`)}
                            className="border-green-500/20 text-green-600 hover:bg-green-500/5"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Submissions
                          </Button>
                          
                          {/* Share Button */}
                          <ShareQuizButton
                            quizId={item.id}
                            quizTitle={item.title || "Quiz"}
                            shareToken={(item as any).share_token}
                            isShared={(item as any).is_shared}
                            subject={item.subject}
                            classLevel={item.class_level}
                            onShareUpdate={() => refetchQuiz()}
                          />
                          
                          <ContentPreviewModal
                            content={item.content}
                            title={item.title || "Quiz"}
                            type="Quiz"
                            classLevel={item.class_level}
                            subject={item.subject}
                            triggerVariant="icon"
                          />
                          <DownloadButtons
                            content={item.content}
                            classLevel={item.class_level}
                            subject={item.subject}
                            type="Quiz"
                            title={item.title || undefined}
                            size="sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuiz.mutate(item.id)}
                            disabled={deleteQuiz.isPending}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview/Edit Dialog */}
        <Dialog open={!!previewContent} onOpenChange={() => {
          setPreviewContent(null);
          setIsEditing(false);
          setEditedContent("");
        }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary">{previewContent?.title}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Edit your content below" : "Preview of generated content"}
              </DialogDescription>
            </DialogHeader>
            
            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm border-primary/20"
              />
            ) : (
              <div className="bg-secondary/50 rounded-lg p-6 border border-primary/10">
                <pre className="whitespace-pre-wrap text-sm text-foreground">
                  {previewContent?.content}
                </pre>
              </div>
            )}
            
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary/90">
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="border-primary/20">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={handleEdit} className="border-primary/20 text-primary hover:bg-primary/5">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
              {previewContent && !isEditing && (
                <DownloadButtons
                  content={previewContent.content}
                  classLevel={previewContent.classLevel}
                  subject={previewContent.subject}
                  type={previewContent.type === "syllabus" ? "LessonPlan" : "Quiz"}
                  title={previewContent.title}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
