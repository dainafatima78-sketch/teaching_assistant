import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit2, Sparkles, Loader2, Save } from "lucide-react";
import { useTeachingAssistant } from "@/hooks/useTeachingAssistant";
import { toast } from "sonner";

interface LessonPlanEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onSave: (content: string) => void;
  documentId?: string;
}

export function LessonPlanEditor({
  open,
  onOpenChange,
  content,
  onSave,
  documentId,
}: LessonPlanEditorProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [aiPrompt, setAiPrompt] = useState("");
  const { generate, isLoading: isImproving, content: improvedContent } = useTeachingAssistant();

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  useEffect(() => {
    if (improvedContent) {
      setEditedContent(improvedContent);
    }
  }, [improvedContent]);

  const handleImprove = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter improvement instructions");
      return;
    }

    await generate({
      type: "lesson_plan",
      documentId,
      userMessage: `Improve the following lesson plan based on this instruction: "${aiPrompt}"\n\nOriginal Lesson Plan:\n${editedContent}`,
    });
  };

  const handleSave = () => {
    onSave(editedContent);
    onOpenChange(false);
    toast.success("Lesson plan updated!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            Edit Lesson Plan
          </DialogTitle>
          <DialogDescription>
            Edit your lesson plan directly or use AI to improve it
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* AI Improvement Section */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Improvement
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Add more activities, simplify language, add assessment criteria..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={isImproving}
              />
              <Button onClick={handleImprove} disabled={isImproving || !aiPrompt.trim()}>
                {isImproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Improve
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Describe how you'd like to improve this lesson plan
            </p>
          </div>

          {/* Editor */}
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Lesson plan content..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
