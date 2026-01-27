import { useState } from "react";
import { HelpCircle, Loader2, Lightbulb, Copy, FileText } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocuments } from "@/hooks/useDocuments";
import { useTeachingAssistant } from "@/hooks/useTeachingAssistant";
import { toast } from "sonner";

export default function HomeworkHelp() {
  const { data: documents = [], isLoading: docsLoading } = useDocuments();
  const { generate, isLoading, content, reset } = useTeachingAssistant();

  const [selectedDocId, setSelectedDocId] = useState("");
  const [question, setQuestion] = useState("");

  // Filter to only show documents with extracted content
  const processedDocs = documents.filter(doc => doc.extracted_content);

  const handleExplain = async () => {
    if (!question.trim()) return;
    if (!selectedDocId) {
      toast.error("Please select a syllabus document first");
      return;
    }

    reset();
    await generate({
      type: "homework",
      documentId: selectedDocId,
      userMessage: question,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="font-display text-3xl font-bold text-foreground">Homework Help</h1>
          <p className="mt-2 text-muted-foreground">
            Get step-by-step explanations for homework questions using your syllabus content.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Document Selection */}
          <Card className="animate-slide-up">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <Label className="text-sm mb-2 block">Select Syllabus Document *</Label>
                  <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                    <SelectTrigger>
                      <SelectValue placeholder={docsLoading ? "Loading documents..." : "Select document"} />
                    </SelectTrigger>
                    <SelectContent>
                      {processedDocs.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          No processed documents. Upload syllabus first.
                        </SelectItem>
                      ) : (
                        processedDocs.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.file_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Input Card */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Enter Your Question
              </CardTitle>
              <CardDescription>
                Type or paste your homework question below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Homework Question</Label>
                <Textarea
                  id="question"
                  placeholder="e.g., Solve for x: 3x + 7 = 22"
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="resize-none"
                />
              </div>
              <Button 
                variant="hero" 
                size="lg"
                onClick={handleExplain}
                disabled={!question.trim() || isLoading || !selectedDocId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Explanation...
                  </>
                ) : (
                  <>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Explain Step by Step
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Explanation Card */}
          {(content || isLoading) && (
            <Card className="animate-slide-up">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-accent" />
                      Explanation
                    </CardTitle>
                    <CardDescription>
                      Here's a step-by-step breakdown of the solution
                    </CardDescription>
                  </div>
                  {content && (
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {content ? (
                  <>
                    <div className="bg-secondary/30 rounded-lg p-6 max-h-[400px] overflow-y-auto">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                        {content}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Explanation
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                    <p className="text-muted-foreground">Generating explanation...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tips Card */}
          <Card className="border-accent/30 bg-accent/5 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                  <span className="text-lg">✨</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Tips for Better Results</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Select the relevant syllabus document first</li>
                    <li>• Type the complete question clearly</li>
                    <li>• Include any given values or conditions</li>
                    <li>• Specify the subject if the question is unclear</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
