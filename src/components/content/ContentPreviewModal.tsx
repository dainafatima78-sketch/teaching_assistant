import { useState } from "react";
import { Eye, Edit2, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DownloadButtons } from "@/components/syllabus/DownloadButtons";
import { toast } from "sonner";

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

interface ContentPreviewModalProps {
  content: string;
  title?: string;
  type?: "Syllabus" | "LessonPlan" | "Quiz";
  classLevel?: string | null;
  subject?: string | null;
  onSave?: (content: string) => void;
  triggerVariant?: "icon" | "button";
  triggerSize?: "sm" | "default" | "lg";
}

export function ContentPreviewModal({
  content,
  title = "Preview Content",
  type = "LessonPlan",
  classLevel,
  subject,
  onSave,
  triggerVariant = "button",
  triggerSize = "sm",
}: ContentPreviewModalProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleCopy = () => {
    navigator.clipboard.writeText(isEditing ? editedContent : content);
    toast.success("Copied to clipboard!");
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedContent);
      setIsEditing(false);
      toast.success("Content saved!");
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setIsEditing(false);
      setEditedContent(content);
    }
  };

  const displayContent = isEditing ? editedContent : cleanMarkdown(content);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "icon" ? (
          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8 border-primary/20 text-primary hover:bg-primary/5"
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size={triggerSize}
            className="border-primary/20 text-primary hover:bg-primary/5"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle className="text-primary text-xl">{title}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Edit your content below" : "Preview of generated content"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              {onSave && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      setIsEditing(false);
                      setEditedContent(content);
                    } else {
                      setEditedContent(content);
                      setIsEditing(true);
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  {isEditing ? "Cancel Edit" : "Edit"}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="pr-4 pb-4">
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[500px] font-mono text-sm border-primary/20 resize-none"
                />
              ) : (
                <div className="bg-secondary/30 rounded-lg p-6 border border-primary/10">
                  <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground font-urdu" dir="auto">
                    {displayContent}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        <div className="flex gap-2 justify-between pt-4 border-t">
          <div className="flex gap-2">
            {isEditing && onSave ? (
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                Save Changes
              </Button>
            ) : null}
          </div>
          <DownloadButtons
            content={isEditing ? editedContent : content}
            classLevel={classLevel}
            subject={subject}
            type={type}
            title={title}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
