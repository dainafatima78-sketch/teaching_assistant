import { Button } from "@/components/ui/button";
import { Download, FileText, FileType } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadAsTxt, downloadAsDocx, downloadAsPdf } from "@/lib/downloadUtils";

interface DownloadButtonsProps {
  content: string;
  classLevel: string | null;
  subject: string | null;
  type: "Syllabus" | "Quiz" | "LessonPlan";
  title?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function DownloadButtons({
  content,
  classLevel,
  subject,
  type,
  title,
  variant = "outline",
  size = "sm",
}: DownloadButtonsProps) {
  if (!content) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => downloadAsTxt(content, classLevel, subject, type, title)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Download as TXT
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await downloadAsDocx(content, classLevel, subject, type, title);
          }}
        >
          <FileType className="h-4 w-4 mr-2" />
          Download as DOCX
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => downloadAsPdf(content, classLevel, subject, type, title)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Download as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
