import { useState, useRef } from "react";
import { 
  Upload, FileText, Trash2, CheckCircle, Loader2, AlertCircle, 
  Image, Mic, FileType, X, Sparkles, Edit2, BookOpen, Calendar, Wand2
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AISyllabusGenerator } from "@/components/syllabus/AISyllabusGenerator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { useChapters, useChaptersByGrade } from "@/hooks/useChapters";
import { useTeachingAssistant } from "@/hooks/useTeachingAssistant";
import { useSaveSyllabusHistory } from "@/hooks/useHistory";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useTeacherProfile } from "@/hooks/useTeacherProfile";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ChapterInputDialog } from "@/components/syllabus/ChapterInputDialog";
import { LessonPlanEditor } from "@/components/syllabus/LessonPlanEditor";
import { DownloadButtons } from "@/components/syllabus/DownloadButtons";

export default function Syllabus() {
  const { data: documents = [], isLoading } = useDocuments();
  const { data: profile } = useTeacherProfile();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const { generate, isLoading: isGenerating, content, reset } = useTeachingAssistant();
  const saveSyllabus = useSaveSyllabusHistory();
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecorder();
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSubject, setUploadSubject] = useState("");
  const [customUploadSubject, setCustomUploadSubject] = useState("");
  const [uploadClass, setUploadClass] = useState("");
  const [activeTab, setActiveTab] = useState("document");
  const [manualText, setManualText] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  
  // Chapter input dialog
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Generation settings
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState("");
  const [lessonPlanFormat, setLessonPlanFormat] = useState<"daily" | "weekly" | "monthly">("daily");
  
  // Main view mode
  const [viewMode, setViewMode] = useState<"upload" | "generate">("upload");
  
  // Editor
  const [showEditor, setShowEditor] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Get chapters for selected document or grade
  const { data: documentChapters = [] } = useChapters(selectedDocId);
  const { data: gradeChapters = [] } = useChaptersByGrade(selectedGrade);
  
  const availableChapters = selectedDocId ? documentChapters : gradeChapters;

  // Get actual subject (handle custom input)
  const actualUploadSubject = uploadSubject === "Other" ? customUploadSubject : uploadSubject;

  // Filter documents by selected grade
  const filteredDocs = selectedGrade 
    ? documents.filter(d => d.class_level === selectedGrade)
    : documents;

  const processedDocs = filteredDocs.filter(doc => doc.extracted_content);

  // Auto-fill when document is selected
  const handleDocumentSelect = (docId: string) => {
    setSelectedDocId(docId);
    setSelectedChapters([]);
    
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      if (doc.class_level) setSelectedGrade(doc.class_level);
      if (doc.subject) setUploadSubject(doc.subject);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await handleFilePreUpload(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await handleFilePreUpload(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleFilePreUpload = async (file: File) => {
    const validTypes = [
      "application/pdf", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExts = ["pdf", "docx", "txt", "jpg", "jpeg", "png", "webp", "gif"];
    
    if (!validTypes.includes(file.type) && !validExts.includes(ext || "")) {
      toast.error("Unsupported file type");
      return;
    }

    if (!uploadClass) {
      toast.error("Please select a class/grade first");
      return;
    }

    // Show chapter dialog for PDF, DOCX, and images
    const isDocumentOrImage = file.type.includes("pdf") || 
                              file.type.includes("word") || 
                              file.type.includes("image") ||
                              ["pdf", "docx", "jpg", "jpeg", "png", "webp", "gif"].includes(ext || "");
    
    if (isDocumentOrImage) {
      setPendingFile(file);
      setShowChapterDialog(true);
    } else {
      await handleUpload(file, []);
    }
  };

  const handleChapterDialogConfirm = async (
    chapterType: "single" | "multiple", 
    chapterNames: string[]
  ) => {
    if (pendingFile) {
      await handleUpload(pendingFile, chapterNames);
      setPendingFile(null);
    }
  };

  const handleUpload = async (file: File, chapterNames: string[]) => {
    await uploadMutation.mutateAsync({
      file,
      subject: actualUploadSubject || undefined,
      classLevel: uploadClass,
      chapterName: chapterNames.length === 1 ? chapterNames[0] : undefined,
    });
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) {
      toast.error("Please enter some text");
      return;
    }
    if (!uploadClass) {
      toast.error("Please select a class/grade");
      return;
    }
    if (!profile) {
      toast.error("Please log in");
      return;
    }

    setIsProcessingManual(true);
    try {
      const blob = new Blob([manualText], { type: "text/plain" });
      const file = new File([blob], `manual_input_${Date.now()}.txt`, { type: "text/plain" });
      
      await uploadMutation.mutateAsync({
        file,
        subject: actualUploadSubject || undefined,
        classLevel: uploadClass,
      });

      setManualText("");
      toast.success("Content saved successfully!");
    } catch (error) {
      toast.error("Failed to save content");
    } finally {
      setIsProcessingManual(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      try {
        const text = await stopRecording();
        setVoiceText(prev => prev + (prev ? " " : "") + text);
        toast.success("Voice transcribed successfully!");
      } catch (error) {
        toast.error("Failed to transcribe voice");
      }
    } else {
      await startRecording();
    }
  };

  const handleVoiceSubmit = async () => {
    if (!voiceText.trim()) {
      toast.error("Please record some audio first");
      return;
    }
    if (!uploadClass) {
      toast.error("Please select a class/grade");
      return;
    }

    setIsProcessingManual(true);
    try {
      const blob = new Blob([voiceText], { type: "text/plain" });
      const file = new File([blob], `voice_input_${Date.now()}.txt`, { type: "text/plain" });
      
      await uploadMutation.mutateAsync({
        file,
        subject: actualUploadSubject || undefined,
        classLevel: uploadClass,
      });

      setVoiceText("");
      toast.success("Voice content saved!");
    } catch (error) {
      toast.error("Failed to save voice content");
    } finally {
      setIsProcessingManual(false);
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

  const handleGenerateLessonPlan = async () => {
    if (!selectedDocId && selectedChapters.length === 0) {
      toast.error("Please select a document or chapters");
      return;
    }

    reset();
    setGeneratedContent("");
    
    const formatInstructions = {
      daily: "Create a detailed DAILY lesson plan with specific activities for each day of the week.",
      weekly: "Create a WEEKLY lesson plan overview with objectives and key activities for the week.",
      monthly: "Create a MONTHLY lesson plan with week-by-week breakdown and milestones.",
    };
    
    const result = await generate({
      type: "lesson_plan",
      documentId: selectedDocId,
      classLevel: selectedGrade,
      subject: actualUploadSubject,
      chapterName: selectedChapters.length > 0 
        ? availableChapters.filter(c => selectedChapters.includes(c.id)).map(c => c.name).join(", ")
        : undefined,
      additionalNotes: formatInstructions[lessonPlanFormat],
    });

    if (result) {
      setGeneratedContent(result);
    }
  };

  const handleSaveLessonPlan = async () => {
    if (!generatedContent && !content) return;

    await saveSyllabus.mutateAsync({
      document_id: selectedDocId || null,
      subject: actualUploadSubject || null,
      class_level: selectedGrade || null,
      chapters: selectedChapters.length > 0 
        ? availableChapters.filter(c => selectedChapters.includes(c.id)).map(c => c.name)
        : null,
      title: `Lesson Plan - ${actualUploadSubject || "General"} - Class ${selectedGrade}`,
      content: generatedContent || content,
    });
  };

  const handleEditorSave = (newContent: string) => {
    setGeneratedContent(newContent);
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">Syllabus Management</h1>
                <p className="text-muted-foreground">
                  Upload course materials or generate syllabus with AI
                </p>
              </div>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex gap-2 bg-muted/50 p-1 rounded-lg">
              <Button
                variant={viewMode === "upload" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("upload")}
                className={viewMode === "upload" ? "bg-primary text-primary-foreground" : ""}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Syllabus
              </Button>
              <Button
                variant={viewMode === "generate" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("generate")}
                className={viewMode === "generate" ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : ""}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
            </div>
          </div>
        </div>

        {/* AI Syllabus Generator Mode */}
        {viewMode === "generate" && (
          <div className="animate-fade-in">
            <AISyllabusGenerator />
          </div>
        )}

        {/* Upload Mode */}
        {viewMode === "upload" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="animate-slide-up border-primary/10">
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <CardTitle className="text-primary">Upload Content</CardTitle>
              <CardDescription>
                Add syllabus content via documents, images, text, or voice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Grade/Class Selection (Required) */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class/Grade <span className="text-destructive">*</span></Label>
                  <Select value={uploadClass} onValueChange={setUploadClass}>
                    <SelectTrigger className="border-primary/20 focus:border-primary">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <SelectItem key={n} value={n.toString()}>Class {n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={uploadSubject} onValueChange={(val) => {
                    setUploadSubject(val);
                    if (val !== "Other") setCustomUploadSubject("");
                  }}>
                    <SelectTrigger className="border-primary/20 focus:border-primary">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Social Studies">Social Studies</SelectItem>
                      <SelectItem value="Urdu">Urdu</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Islamiat">Islamiat</SelectItem>
                      <SelectItem value="Pakistan Studies">Pakistan Studies</SelectItem>
                      <SelectItem value="Geography">Geography</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Other">Other (Manual Entry)</SelectItem>
                    </SelectContent>
                  </Select>
                  {uploadSubject === "Other" && (
                    <Input
                      placeholder="Enter subject name"
                      value={customUploadSubject}
                      onChange={(e) => setCustomUploadSubject(e.target.value)}
                      className="mt-2 border-primary/20 focus:border-primary"
                    />
                  )}
                </div>
              </div>

              {/* Upload Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-primary/5">
                  <TabsTrigger value="document" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <FileText className="h-4 w-4 mr-1" />
                    Document
                  </TabsTrigger>
                  <TabsTrigger value="image" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Image className="h-4 w-4 mr-1" />
                    Image
                  </TabsTrigger>
                  <TabsTrigger value="text" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <FileType className="h-4 w-4 mr-1" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Mic className="h-4 w-4 mr-1" />
                    Voice
                  </TabsTrigger>
                </TabsList>

                {/* Document Upload */}
                <TabsContent value="document" className="mt-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
                      ${isDragging 
                        ? "border-primary bg-primary/5" 
                        : "border-primary/30 hover:border-primary hover:bg-primary/5"
                      }
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                        {uploadMutation.isPending ? (
                          <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <p className="font-medium text-foreground mb-1">
                        {uploadMutation.isPending ? "Uploading..." : "Drop PDF, DOCX, or TXT files"}
                      </p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Image Upload */}
                <TabsContent value="image" className="mt-4">
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer border-primary/30 hover:border-primary hover:bg-primary/5"
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 mb-3">
                        {uploadMutation.isPending ? (
                          <Loader2 className="h-6 w-6 text-accent animate-spin" />
                        ) : (
                          <Image className="h-6 w-6 text-accent" />
                        )}
                      </div>
                      <p className="font-medium text-foreground mb-1">
                        Upload chapter images
                      </p>
                      <p className="text-sm text-muted-foreground">
                        JPG, PNG, WEBP (OCR will extract text)
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Manual Text Input */}
                <TabsContent value="text" className="mt-4 space-y-4">
                  <Textarea
                    placeholder="Type or paste your syllabus content here..."
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="min-h-[150px] border-primary/20 focus:border-primary"
                  />
                  <Button 
                    onClick={handleManualSubmit} 
                    disabled={isProcessingManual || !manualText.trim()}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {isProcessingManual ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" /> Save Content</>
                    )}
                  </Button>
                </TabsContent>

                {/* Voice Input */}
                <TabsContent value="voice" className="mt-4 space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <Button
                      size="lg"
                      variant={isRecording ? "destructive" : "default"}
                      onClick={handleVoiceRecord}
                      disabled={isTranscribing}
                      className={`w-32 h-32 rounded-full ${!isRecording ? "bg-primary hover:bg-primary/90" : ""}`}
                    >
                      {isTranscribing ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      ) : isRecording ? (
                        <div className="flex flex-col items-center">
                          <Mic className="h-8 w-8 animate-pulse" />
                          <span className="text-xs mt-1">Stop</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Mic className="h-8 w-8" />
                          <span className="text-xs mt-1">Record</span>
                        </div>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {isRecording ? "Recording... Click to stop" : isTranscribing ? "Transcribing..." : "Click to start recording"}
                    </p>
                  </div>
                  
                  {voiceText && (
                    <div className="space-y-2">
                      <Label>Transcribed Text</Label>
                      <Textarea
                        value={voiceText}
                        onChange={(e) => setVoiceText(e.target.value)}
                        className="min-h-[100px] border-primary/20"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleVoiceSubmit} disabled={isProcessingManual} className="bg-primary hover:bg-primary/90">
                          <Upload className="mr-2 h-4 w-4" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => setVoiceText("")}>
                          <X className="mr-2 h-4 w-4" /> Clear
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Generate Lesson Plan Section */}
          <Card className="animate-slide-up border-primary/10" style={{ animationDelay: "100ms" }}>
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                Generate Lesson Plan
              </CardTitle>
              <CardDescription>
                Select content and generate AI-powered lesson plans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Grade Filter */}
              <div className="space-y-2">
                <Label>Select Grade</Label>
                <Select value={selectedGrade} onValueChange={(v) => {
                  setSelectedGrade(v);
                  setSelectedDocId("");
                  setSelectedChapters([]);
                }}>
                  <SelectTrigger className="border-primary/20 focus:border-primary">
                    <SelectValue placeholder="Filter by grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>Class {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Selection */}
              {selectedGrade && (
                <div className="space-y-2">
                  <Label>Select Document</Label>
                  <Select value={selectedDocId} onValueChange={handleDocumentSelect}>
                    <SelectTrigger className="border-primary/20 focus:border-primary">
                      <SelectValue placeholder={processedDocs.length === 0 ? "No documents for this grade" : "Select document"} />
                    </SelectTrigger>
                    <SelectContent>
                      {processedDocs.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.file_name} {doc.subject && `(${doc.subject})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Chapter Selection */}
              {availableChapters.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Chapters</Label>
                    <Button variant="ghost" size="sm" onClick={selectAllChapters} className="text-primary">
                      {selectedChapters.length === availableChapters.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 border border-primary/20 rounded-lg p-3">
                    {availableChapters.map((chapter) => (
                      <div key={chapter.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={chapter.id}
                          checked={selectedChapters.includes(chapter.id)}
                          onCheckedChange={() => toggleChapter(chapter.id)}
                          className="border-primary data-[state=checked]:bg-primary"
                        />
                        <label
                          htmlFor={chapter.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {chapter.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lesson Plan Format */}
              <div className="space-y-2">
                <Label>Lesson Plan Format</Label>
                <RadioGroup 
                  value={lessonPlanFormat} 
                  onValueChange={(v) => setLessonPlanFormat(v as "daily" | "weekly" | "monthly")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" className="border-primary text-primary" />
                    <Label htmlFor="daily" className="cursor-pointer flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Daily
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" className="border-primary text-primary" />
                    <Label htmlFor="weekly" className="cursor-pointer">Weekly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" className="border-primary text-primary" />
                    <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Generate Button */}
              <Button 
                size="lg" 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleGenerateLessonPlan}
                disabled={isGenerating || (!selectedDocId && selectedChapters.length === 0)}
              >
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Lesson Plan</>
                )}
              </Button>

              {/* Generated Content */}
              {(generatedContent || content) && (
                <div className="space-y-3">
                  <div className="bg-secondary/50 rounded-lg p-4 max-h-[300px] overflow-y-auto border border-primary/10">
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                      {generatedContent || content}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={handleSaveLessonPlan} disabled={saveSyllabus.isPending} className="bg-primary hover:bg-primary/90">
                      {saveSyllabus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to History"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowEditor(true)} className="border-primary/20 text-primary hover:bg-primary/5">
                      <Edit2 className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <DownloadButtons
                      content={generatedContent || content}
                      classLevel={selectedGrade}
                      subject={actualUploadSubject}
                      type="LessonPlan"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* Uploaded Files List */}
        <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Uploaded Content
          </h2>
          <div className="space-y-3">
            {isLoading ? (
              <Card className="p-8 text-center border-primary/10">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-muted-foreground">Loading documents...</p>
              </Card>
            ) : documents.length === 0 ? (
              <Card className="p-8 text-center border-primary/10">
                <p className="text-muted-foreground">No files uploaded yet. Upload your syllabus to get started.</p>
              </Card>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id} className="p-4 border-primary/10 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{doc.file_name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {doc.class_level && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">Class {doc.class_level}</span>}
                          {doc.subject && <span className="capitalize">{doc.subject}</span>}
                          {doc.chapter_name && <span>{doc.chapter_name}</span>}
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.extracted_content ? (
                        <div className="flex items-center gap-1 text-success text-sm">
                          <CheckCircle className="h-4 w-4" />
                          <span>Processed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-warning text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>Processing...</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(doc)}
                        disabled={deleteMutation.isPending}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chapter Input Dialog */}
      <ChapterInputDialog
        open={showChapterDialog}
        onOpenChange={setShowChapterDialog}
        fileName={pendingFile?.name || ""}
        onConfirm={handleChapterDialogConfirm}
      />

      {/* Lesson Plan Editor */}
      <LessonPlanEditor
        open={showEditor}
        onOpenChange={setShowEditor}
        content={generatedContent || content}
        onSave={handleEditorSave}
        documentId={selectedDocId}
      />
    </MainLayout>
  );
}
