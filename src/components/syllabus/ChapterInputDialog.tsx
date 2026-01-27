import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

interface ChapterInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  onConfirm: (chapterType: "single" | "multiple", chapterNames: string[]) => void;
}

export function ChapterInputDialog({
  open,
  onOpenChange,
  fileName,
  onConfirm,
}: ChapterInputDialogProps) {
  const [chapterType, setChapterType] = useState<"single" | "multiple">("single");
  const [singleChapterName, setSingleChapterName] = useState("");
  const [chapterNames, setChapterNames] = useState<string[]>(["", ""]);

  const handleAddChapter = () => {
    setChapterNames([...chapterNames, ""]);
  };

  const handleRemoveChapter = (index: number) => {
    if (chapterNames.length > 2) {
      setChapterNames(chapterNames.filter((_, i) => i !== index));
    }
  };

  const handleChapterNameChange = (index: number, value: string) => {
    const updated = [...chapterNames];
    updated[index] = value;
    setChapterNames(updated);
  };

  const handleConfirm = () => {
    if (chapterType === "single") {
      if (!singleChapterName.trim()) {
        return;
      }
      onConfirm("single", [singleChapterName.trim()]);
    } else {
      const validNames = chapterNames.filter((n) => n.trim());
      if (validNames.length < 2) {
        return;
      }
      onConfirm("multiple", validNames);
    }
    // Reset state
    setChapterType("single");
    setSingleChapterName("");
    setChapterNames(["", ""]);
    onOpenChange(false);
  };

  const isValid =
    chapterType === "single"
      ? singleChapterName.trim().length > 0
      : chapterNames.filter((n) => n.trim()).length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chapter Information</DialogTitle>
          <DialogDescription>
            Tell us about the chapters in "{fileName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={chapterType}
            onValueChange={(v) => setChapterType(v as "single" | "multiple")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single" className="cursor-pointer">
                This file contains 1 chapter
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="multiple" id="multiple" />
              <Label htmlFor="multiple" className="cursor-pointer">
                This file contains multiple chapters
              </Label>
            </div>
          </RadioGroup>

          {chapterType === "single" ? (
            <div className="space-y-2">
              <Label htmlFor="chapter-name">
                Chapter Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="chapter-name"
                placeholder="e.g., Introduction to Algebra"
                value={singleChapterName}
                onChange={(e) => setSingleChapterName(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Chapter Names <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddChapter}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Chapter
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {chapterNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <Input
                      placeholder={`Chapter ${index + 1} name`}
                      value={name}
                      onChange={(e) => handleChapterNameChange(index, e.target.value)}
                    />
                    {chapterNames.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveChapter(index)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter at least 2 chapter names. AI will extract content accordingly.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Continue Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
