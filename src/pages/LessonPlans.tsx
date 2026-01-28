import { useState, useEffect, useRef } from "react";
import { BookOpen, Loader2, Sparkles, Copy } from "lucide-react";
import { useSaveSyllabusHistory } from "@/hooks/useHistory";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDocuments } from "@/hooks/useDocuments";
import { isValidExtractedText } from "@/hooks/useDocuments";
import { useTeachingAssistant } from "@/hooks/useTeachingAssistant";
import { toast } from "sonner";
import { ContentPreviewModal } from "@/components/content/ContentPreviewModal";
import { useLanguage } from "@/contexts/LanguageContext";

// Clean markdown formatting for display
function cleanMarkdown(text: string): string {
  return text
    // Remove #* patterns (heading with bold)
    .replace(/^#+\s*\*+\s*/gm, "")
    // Remove standalone ** markers
    .replace(/\*\*/g, "")
    // Remove standalone * markers (but keep bullet points)
    .replace(/(?<!\s)\*(?!\s)/g, "")
    // Clean up heading markers
    .replace(/^#+\s*/gm, "")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function LessonPlans() {
  const { t } = useLanguage();
  const { data: documents = [], isLoading: docsLoading } = useDocuments();
  const { generate, isLoading, content, reset } = useTeachingAssistant();
  const saveSyllabusHistory = useSaveSyllabusHistory();

  const [selectedDocId, setSelectedDocId] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [duration, setDuration] = useState("45");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const hasSavedRef = useRef(false);

  // Auto-save when content is generated
  useEffect(() => {
    if (content && !isLoading && !hasSavedRef.current) {
      hasSavedRef.current = true;
      saveSyllabusHistory.mutate({
        document_id: selectedDocId || null,
        subject: subject || null,
        class_level: classLevel || null,
        title: `${t("lessonPlan.title")} - ${subject || "General"} - Class ${classLevel}`,
        content: content,
        chapters: chapterName ? [chapterName] : null,
        metadata: {
          type: "lesson_plan",
          duration: parseInt(duration) || 45,
          additionalNotes,
        },
      });
    }
  }, [content, isLoading]);

  const readyDocs = documents.filter((doc) => isValidExtractedText(doc.extracted_content?.content));

  const handleGenerate = async () => {
    if (!selectedDocId) {
      toast.error("Please select a syllabus document first");
      return;
    }

    hasSavedRef.current = false; // Reset for new generation
    reset();
    await generate({
      type: "lesson_plan",
      documentId: selectedDocId,
      classLevel,
      subject,
      chapterName,
      duration: parseInt(duration) || 45,
      additionalNotes,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="font-display text-3xl font-bold text-foreground">{t("lessonPlan.title")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("lessonPlan.subtitle")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {t("lessonPlan.details")}
              </CardTitle>
              <CardDescription>
                {t("lessonPlan.detailsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document Selection */}
              <div className="space-y-2">
                <Label>{t("lessonPlan.syllabusDocument")} *</Label>
                <Select value={selectedDocId} onValueChange={setSelectedDocId} disabled={docsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={docsLoading ? t("common.loading") : t("common.selectDocument")} />
                  </SelectTrigger>
                  <SelectContent>
                    {readyDocs.length === 0 && !docsLoading ? (
                      <SelectItem value="_none" disabled>
                        {t("common.noDocuments")}
                      </SelectItem>
                    ) : (
                      readyDocs.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.file_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">{t("lessonPlan.classLevel")}</Label>
                <Select value={classLevel} onValueChange={setClassLevel}>
                  <SelectTrigger id="class">
                    <SelectValue placeholder={t("common.selectClass")} />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>Class {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">{t("syllabus.subject")}</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject">
                    <SelectValue placeholder={t("common.selectSubject")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Urdu">Urdu</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="Biology">Biology</SelectItem>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Islamiat">Islamiat</SelectItem>
                    <SelectItem value="Pakistan Studies">Pakistan Studies</SelectItem>
                    <SelectItem value="Social Studies">Social Studies</SelectItem>
                    <SelectItem value="Geography">Geography</SelectItem>
                    <SelectItem value="History">History</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter">{t("lessonPlan.chapterTopic")}</Label>
                <Input 
                  id="chapter" 
                  placeholder="e.g., Introduction to Algebra" 
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">{t("lessonPlan.duration")}</Label>
                <Input 
                  id="duration" 
                  type="number" 
                  placeholder="45" 
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t("lessonPlan.additionalNotes")}</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Any specific requirements or focus areas..."
                  rows={3}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={handleGenerate}
                disabled={isLoading || !selectedDocId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("lessonPlan.generate")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Result */}
          <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("lessonPlan.generatedTitle")}</CardTitle>
                  <CardDescription>
                    {t("lessonPlan.generatedDesc")}
                  </CardDescription>
                </div>
                {content && (
                  <div className="flex gap-2">
                    <ContentPreviewModal
                      content={content}
                      title={`${t("lessonPlan.title")} - ${subject || "General"} - Class ${classLevel}`}
                      type="LessonPlan"
                      classLevel={classLevel}
                      subject={subject}
                      triggerVariant="icon"
                    />
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" />
                      {t("common.copy")}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {content ? (
                <div className="space-y-4">
                  <div className="bg-secondary/50 rounded-lg p-4 md:p-6 max-h-[500px] overflow-y-auto">
                    <div className="max-w-none whitespace-pre-wrap text-foreground text-base md:text-lg leading-relaxed">
                      {cleanMarkdown(content)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" />
                      {t("common.copy")}
                    </Button>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                  <p className="text-muted-foreground">{t("common.loading")}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                  <p>{t("lessonPlan.selectAndFill")}</p>
                  <p className="text-sm">{t("lessonPlan.willAppear")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
