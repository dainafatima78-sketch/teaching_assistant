import { useState } from "react";
import { 
  Sparkles, Loader2, Copy, Check, Save, Edit2, BookOpen, 
  Layers, FileStack, Wand2, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAISyllabusGenerator } from "@/hooks/useAISyllabusGenerator";
import { useSaveSyllabusHistory } from "@/hooks/useHistory";
import { toast } from "sonner";
import { DownloadButtons } from "./DownloadButtons";
import { ContentPreviewModal } from "@/components/content/ContentPreviewModal";

// Clean markdown formatting for display
function cleanMarkdown(text: string): string {
  return text
    // Remove #* patterns (heading with bold)
    .replace(/^#+\s*\*+\s*/gm, "")
    // Remove standalone ** markers (bold)
    .replace(/\*\*/g, "")
    // Remove standalone * markers (but keep bullet points)
    .replace(/(?<!\s)\*(?!\s)/g, "")
    // Clean up heading markers
    .replace(/^#+\s*/gm, "")
    // Remove underscore markers (italic/bold)
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface AISyllabusGeneratorProps {
  onSyllabusGenerated?: (content: string) => void;
}

export function AISyllabusGenerator({ onSyllabusGenerated }: AISyllabusGeneratorProps) {
  const { generate, isLoading, content, reset } = useAISyllabusGenerator();
  const saveSyllabus = useSaveSyllabusHistory();
  
  // Common inputs
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [board, setBoard] = useState("");
  const [medium, setMedium] = useState("English");
  const [detailLevel, setDetailLevel] = useState("Standard");
  
  // Mode-specific
  const [mode, setMode] = useState<"full" | "chapter" | "bulk">("full");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [numberOfChapters, setNumberOfChapters] = useState("10");
  
  // Content state
  const [editedContent, setEditedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayContent = editedContent || content;

  const actualSubject = subject === "Other" ? customSubject : subject;

  const handleGenerate = async () => {
    if (!classLevel || !actualSubject) {
      toast.error("Please select class and subject");
      return;
    }

    if (mode === "chapter" && !chapterNumber && !chapterTitle) {
      toast.error("Please enter chapter number or title");
      return;
    }

    reset();
    setEditedContent("");
    setIsEditing(false);

    const result = await generate({
      mode,
      classLevel,
      subject: actualSubject,
      board: board || undefined,
      medium,
      detailLevel,
      chapterNumber: chapterNumber ? parseInt(chapterNumber) : undefined,
      chapterTitle: chapterTitle || undefined,
      numberOfChapters: numberOfChapters ? parseInt(numberOfChapters) : 10,
    });

    if (result && onSyllabusGenerated) {
      onSyllabusGenerated(result);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!displayContent) return;

    const title = mode === "full" 
      ? `AI Syllabus - ${actualSubject} Class ${classLevel}`
      : mode === "chapter"
      ? `Chapter ${chapterNumber || ""} ${chapterTitle || ""} - ${actualSubject} Class ${classLevel}`
      : `Bulk Chapters - ${actualSubject} Class ${classLevel}`;

    await saveSyllabus.mutateAsync({
      document_id: null,
      subject: actualSubject || null,
      class_level: classLevel || null,
      chapters: null,
      title,
      content: displayContent,
      metadata: { source: "AI", mode, board, medium, detailLevel }
    });
  };

  const handleEdit = () => {
    if (!isEditing) {
      setEditedContent(content);
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Input Section */}
      <Card className="border-primary/10">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-primary">AI Syllabus Generator</CardTitle>
          </div>
          <CardDescription>
            Generate complete syllabus using AI - just enter class and subject
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {/* Basic Inputs */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class/Grade <span className="text-destructive">*</span></Label>
              <Select value={classLevel} onValueChange={setClassLevel}>
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
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select value={subject} onValueChange={(val) => {
                setSubject(val);
                if (val !== "Other") setCustomSubject("");
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
              {subject === "Other" && (
                <Input
                  placeholder="Enter subject name"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="mt-2 border-primary/20 focus:border-primary"
                />
              )}
            </div>
          </div>

          {/* Optional Inputs */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Board/Standard</Label>
              <Select value={board} onValueChange={setBoard}>
                <SelectTrigger className="border-primary/20 focus:border-primary">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Punjab">Punjab Board</SelectItem>
                  <SelectItem value="Sindh">Sindh Board</SelectItem>
                  <SelectItem value="KPK">KPK Board</SelectItem>
                  <SelectItem value="Federal">Federal Board</SelectItem>
                  <SelectItem value="CBSE">CBSE</SelectItem>
                  <SelectItem value="Cambridge">Cambridge</SelectItem>
                  <SelectItem value="Oxford">Oxford</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Medium</Label>
              <Select value={medium} onValueChange={setMedium}>
                <SelectTrigger className="border-primary/20 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Urdu">Urdu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detail Level</Label>
              <Select value={detailLevel} onValueChange={setDetailLevel}>
                <SelectTrigger className="border-primary/20 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generation Mode */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Generation Mode</Label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "full" | "chapter" | "bulk")}>
              <TabsList className="grid w-full grid-cols-3 bg-primary/5">
                <TabsTrigger 
                  value="full" 
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Full Syllabus
                </TabsTrigger>
                <TabsTrigger 
                  value="chapter"
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Layers className="h-4 w-4 mr-1" />
                  Chapter
                </TabsTrigger>
                <TabsTrigger 
                  value="bulk"
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <FileStack className="h-4 w-4 mr-1" />
                  Bulk
                </TabsTrigger>
              </TabsList>

              <TabsContent value="full" className="mt-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 inline mr-1 text-primary" />
                    Generates complete syllabus with all chapters, topics, objectives, and keywords
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="chapter" className="mt-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Chapter Number</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 3"
                      value={chapterNumber}
                      onChange={(e) => setChapterNumber(e.target.value)}
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chapter Title (Optional)</Label>
                    <Input 
                      placeholder="e.g. Living Things"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 inline mr-1 text-primary" />
                    Generates detailed content for a specific chapter with topics, objectives & activities
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Number of Chapters</Label>
                  <Input 
                    type="number" 
                    placeholder="10"
                    value={numberOfChapters}
                    onChange={(e) => setNumberOfChapters(e.target.value)}
                    className="border-primary/20 focus:border-primary max-w-32"
                  />
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 inline mr-1 text-primary" />
                    Generates multiple chapter titles with brief outlines and key topics
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={isLoading || !classLevel || !subject}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5 mr-2" />
                Generate Syllabus with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Output Section */}
      <Card className="border-primary/10">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <CardTitle className="text-foreground">Generated Syllabus</CardTitle>
            </div>
            {displayContent && (
              <div className="flex items-center gap-2">
                <ContentPreviewModal
                  content={displayContent}
                  title={`${actualSubject || "Syllabus"} - Class ${classLevel}`}
                  type="Syllabus"
                  classLevel={classLevel}
                  subject={actualSubject}
                  triggerVariant="icon"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  {isEditing ? "Preview" : "Edit"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <Sparkles className="h-6 w-6 text-accent absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-muted-foreground">AI is generating your syllabus...</p>
              {content && (
                <div className="w-full mt-4 p-4 bg-muted/30 rounded-lg max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{content}</pre>
                </div>
              )}
            </div>
          ) : displayContent ? (
            <div className="space-y-4">
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{cleanMarkdown(displayContent)}</pre>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleSave}
                  disabled={saveSyllabus.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {saveSyllabus.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save to History
                </Button>
                <DownloadButtons 
                  content={displayContent}
                  classLevel={classLevel}
                  subject={subject}
                  type="Syllabus"
                  title={`${subject || "Syllabus"} - Class ${classLevel}`}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Wand2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-2">No Syllabus Generated Yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Enter class, subject and click "Generate" to create AI-powered syllabus
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
