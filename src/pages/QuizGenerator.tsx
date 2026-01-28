import { useState, useEffect } from "react";
import { FileQuestion, Loader2, Sparkles, Copy, Save, Edit2, Share2, Eye } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useDocuments } from "@/hooks/useDocuments";
import { isValidExtractedText } from "@/hooks/useDocuments";
import { useChapters, useChaptersByGrade } from "@/hooks/useChapters";
import { useTeachingAssistant } from "@/hooks/useTeachingAssistant";
import { useSaveQuizHistory } from "@/hooks/useHistory";
import { toast } from "sonner";
import { DownloadButtons } from "@/components/syllabus/DownloadButtons";
import { ShareQuizButton } from "@/components/quiz/ShareQuizButton";
import { ContentPreviewModal } from "@/components/content/ContentPreviewModal";
import { useLanguage } from "@/contexts/LanguageContext";

export default function QuizGenerator() {
  const { t } = useLanguage();
  const { data: documents = [], isLoading: docsLoading } = useDocuments();
  const { generate, isLoading, content, reset } = useTeachingAssistant();
  const saveQuiz = useSaveQuizHistory();

  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  
  // Quiz settings
  const [mcqCount, setMcqCount] = useState("5");
  const [shortCount, setShortCount] = useState("5");
  const [longCount, setLongCount] = useState("3");
  const [difficulty, setDifficulty] = useState("Medium");
  const [generateAll, setGenerateAll] = useState(true);
  
  // Editing
  const [editedContent, setEditedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Saved quiz info for sharing
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [savedQuizTitle, setSavedQuizTitle] = useState<string>("");

  // Get chapters
  const { data: documentChapters = [] } = useChapters(selectedDocId);
  const { data: gradeChapters = [] } = useChaptersByGrade(selectedGrade);
  
  const availableChapters = selectedDocId ? documentChapters : gradeChapters;

  // Filter documents - show all with extracted content
  const readyDocs = documents.filter((doc) => isValidExtractedText(doc.extracted_content?.content));

  // Auto-fill when document is selected
  const handleDocumentSelect = (docId: string) => {
    setSelectedDocId(docId);
    setSelectedChapters([]);
    
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      if (doc.class_level) setSelectedGrade(doc.class_level);
      if (doc.subject) setSubject(doc.subject);
    }
  };

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const selectAllChapters = () => {
    if (selectedChapters.length === availableChapters.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(availableChapters.map(c => c.id));
    }
  };

  const getQuestionTypeString = () => {
    if (generateAll) {
      return `MCQs (${mcqCount}), Short Questions (${shortCount}), Long Questions (${longCount})`;
    }
    const types = [];
    if (parseInt(mcqCount) > 0) types.push(`MCQs (${mcqCount})`);
    if (parseInt(shortCount) > 0) types.push(`Short (${shortCount})`);
    if (parseInt(longCount) > 0) types.push(`Long (${longCount})`);
    return types.join(", ") || "MCQs";
  };

  const getTotalQuestions = () => {
    return (parseInt(mcqCount) || 0) + (parseInt(shortCount) || 0) + (parseInt(longCount) || 0);
  };

  const handleGenerate = async () => {
    if (!selectedDocId) {
      toast.error("Please select a document first");
      return;
    }

    reset();
    setEditedContent("");
    setIsEditing(false);
    setSavedQuizId(null);
    setSavedQuizTitle("");
    
    const chapterNames = selectedChapters.length > 0 
      ? availableChapters.filter(c => selectedChapters.includes(c.id)).map(c => c.name).join(", ")
      : "All chapters";

    const result = await generate({
      type: "quiz",
      documentId: selectedDocId,
      classLevel: selectedGrade,
      subject,
      chapterName: chapterNames,
      questionType: getQuestionTypeString(),
      difficulty,
      numberOfQuestions: getTotalQuestions(),
    });

    // Auto-save after generation
    if (result) {
      const title = `Quiz - ${subject || "General"} - Class ${selectedGrade}`;
      try {
        const savedData = await saveQuiz.mutateAsync({
          document_id: selectedDocId || null,
          subject: subject || null,
          class_level: selectedGrade || null,
          chapters: selectedChapters.length > 0 
            ? availableChapters.filter(c => selectedChapters.includes(c.id)).map(c => c.name)
            : null,
          title,
          content: result,
          question_type: generateAll ? "Mixed" : getQuestionTypeString(),
          difficulty,
          num_questions: getTotalQuestions(),
        });
        
        if (savedData?.id) {
          setSavedQuizId(savedData.id);
          setSavedQuizTitle(title);
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent || content);
    toast.success("Copied to clipboard!");
  };

  const handleSave = async () => {
    const contentToSave = editedContent || content;
    if (!contentToSave) return;

    await saveQuiz.mutateAsync({
      document_id: selectedDocId || null,
      subject: subject || null,
      class_level: selectedGrade || null,
      chapters: selectedChapters.length > 0 
        ? availableChapters.filter(c => selectedChapters.includes(c.id)).map(c => c.name)
        : null,
      title: `Quiz - ${subject || "General"} - Class ${selectedGrade}`,
      content: contentToSave,
      question_type: generateAll ? "Mixed" : getQuestionTypeString(),
      difficulty,
      num_questions: getTotalQuestions(),
    });
  };

  const displayContent = editedContent || content;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileQuestion className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">{t("quiz.title")}</h1>
              <p className="text-muted-foreground">
                {t("quiz.subtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <Card className="lg:col-span-2 animate-slide-up border-primary/10">
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileQuestion className="h-5 w-5" />
                {t("quiz.settings")}
              </CardTitle>
              <CardDescription>
                {t("quiz.settingsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Grade Selection */}
              <div className="space-y-2">
                <Label>{t("quiz.classGrade")} <span className="text-destructive">*</span></Label>
                <Select value={selectedGrade} onValueChange={(v) => {
                  setSelectedGrade(v);
                  setSelectedDocId("");
                  setSelectedChapters([]);
                }}>
                  <SelectTrigger className="border-primary/20 focus:border-primary">
                    <SelectValue placeholder={t("common.selectClass")} />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>Class {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Selection */}
              <div className="space-y-2">
                <Label>{t("quiz.syllabusDocument")} <span className="text-destructive">*</span></Label>
                <Select value={selectedDocId} onValueChange={handleDocumentSelect} disabled={docsLoading}>
                  <SelectTrigger className="border-primary/20 focus:border-primary">
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
                          {doc.file_name} {doc.class_level ? `(Class ${doc.class_level})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Chapter Selection */}
              {availableChapters.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("quiz.chapters")}</Label>
                    <Button variant="ghost" size="sm" onClick={selectAllChapters} className="text-primary">
                      {selectedChapters.length === availableChapters.length ? t("quiz.deselectAll") : t("quiz.selectAll")}
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-2 border border-primary/20 rounded-lg p-3">
                    {availableChapters.map((chapter) => (
                      <div key={chapter.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`quiz-${chapter.id}`}
                          checked={selectedChapters.includes(chapter.id)}
                          onCheckedChange={() => toggleChapter(chapter.id)}
                          className="border-primary data-[state=checked]:bg-primary"
                        />
                        <label htmlFor={`quiz-${chapter.id}`} className="text-sm cursor-pointer flex-1">
                          {chapter.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="border-primary/20 focus:border-primary">
                    <SelectValue placeholder="Select subject" />
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

              {/* Question Counts */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="generate-all"
                    checked={generateAll}
                    onCheckedChange={(checked) => setGenerateAll(!!checked)}
                    className="border-primary data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="generate-all" className="font-normal cursor-pointer">
                    Generate all question types
                  </Label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">MCQs</Label>
                    <Input 
                      type="number" 
                      placeholder="5"
                      value={mcqCount}
                      onChange={(e) => setMcqCount(e.target.value)}
                      min="0"
                      max="50"
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Short Q&A</Label>
                    <Input 
                      type="number" 
                      placeholder="5"
                      value={shortCount}
                      onChange={(e) => setShortCount(e.target.value)}
                      min="0"
                      max="50"
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Long Q&A</Label>
                    <Input 
                      type="number" 
                      placeholder="3"
                      value={longCount}
                      onChange={(e) => setLongCount(e.target.value)}
                      min="0"
                      max="20"
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="border-primary/20 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                size="lg" 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleGenerate}
                disabled={isLoading || !selectedDocId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Quiz ({getTotalQuestions()} Questions)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Result */}
          <Card className="lg:col-span-3 animate-slide-up border-primary/10" style={{ animationDelay: "100ms" }}>
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-primary">Generated Questions</CardTitle>
                  <CardDescription>
                    {displayContent ? `${getTotalQuestions()} questions generated` : "Questions generated from your syllabus"}
                  </CardDescription>
                </div>
                {displayContent && (
                  <div className="flex gap-2">
                    <ContentPreviewModal
                      content={editedContent || content}
                      title={`Quiz - ${subject || "General"} - Class ${selectedGrade}`}
                      type="Quiz"
                      classLevel={selectedGrade}
                      subject={subject}
                      triggerVariant="icon"
                    />
                    <Button variant="outline" size="sm" onClick={handleCopy} className="border-primary/20 text-primary hover:bg-primary/5">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(!isEditing)}
                      className="border-primary/20 text-primary hover:bg-primary/5"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {isEditing ? "Preview" : "Edit"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {displayContent ? (
                <div className="space-y-4">
                  {isEditing ? (
                    <Textarea
                      value={editedContent || content}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[500px] font-mono text-sm border-primary/20"
                    />
                  ) : (
                    <div className="bg-secondary/50 rounded-lg p-6 max-h-[500px] overflow-y-auto border border-primary/10">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground font-urdu leading-relaxed" dir="auto">
                        {editedContent || content}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap pt-4 border-t border-primary/10">
                    {/* Share Button - shown when quiz is saved */}
                    {savedQuizId && (
                      <ShareQuizButton
                        quizId={savedQuizId}
                        quizTitle={savedQuizTitle}
                        subject={subject}
                        classLevel={selectedGrade}
                      />
                    )}
                    
                    {/* Save button only if not auto-saved */}
                    {!savedQuizId && (
                      <Button size="sm" onClick={handleSave} disabled={saveQuiz.isPending} className="bg-primary hover:bg-primary/90">
                        {saveQuiz.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save to History
                      </Button>
                    )}
                    
                    <DownloadButtons
                      content={editedContent || content}
                      classLevel={selectedGrade}
                      subject={subject}
                      type="Quiz"
                    />
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                  <p className="text-muted-foreground">Generating questions from syllabus...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <FileQuestion className="h-8 w-8 text-primary/50" />
                  </div>
                  <p>Select a syllabus and configure quiz settings</p>
                  <p className="text-sm">Questions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
