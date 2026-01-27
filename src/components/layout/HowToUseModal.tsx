import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, BookOpen, FileText, Brain, MessageSquare, ClipboardList, History, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function HowToUseModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">How to Use</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-6 w-6 text-primary" />
            How to Use - Your Teaching Assistant
          </DialogTitle>
          <DialogDescription>
            Complete guide to using all features of the portal
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Dashboard */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <BookOpen className="h-5 w-5 text-primary" />
                Dashboard
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your central hub showing quick stats, recent activities, and quick access to all features. 
                View your uploaded documents, generated content, and quiz submissions at a glance.
              </p>
            </section>

            {/* Syllabus Module */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <FileText className="h-5 w-5 text-primary" />
                Syllabus Module
              </h3>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p><strong>Upload Mode:</strong> Upload your syllabus documents (PDF, Word, Images) and the AI will extract content automatically.</p>
                <p><strong>Generate Mode:</strong> Use AI to generate complete syllabi by selecting class, subject, and board. Choose from:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Full Syllabus - Complete course outline</li>
                  <li>Chapter-by-Chapter - Detailed topics for specific chapters</li>
                  <li>Bulk Generation - Multiple chapter titles and outlines</li>
                </ul>
              </div>
            </section>

            {/* Lesson Plans */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <Brain className="h-5 w-5 text-primary" />
                Lesson Plans
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate detailed lesson plans based on your uploaded syllabus. Select a processed document, 
                enter class details, chapter name, and duration. AI will create comprehensive lesson plans 
                with objectives, activities, and assessments. Download as PDF, DOCX, or TXT.
              </p>
            </section>

            {/* Quiz Generator */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <ClipboardList className="h-5 w-5 text-primary" />
                Quiz Generator
              </h3>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>Create quizzes from your syllabus content:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Select document and chapters</li>
                  <li>Choose question type (MCQ, Short Answer, Mixed)</li>
                  <li>Set difficulty level and number of questions</li>
                  <li>Share quizzes with students via link or email</li>
                  <li>View and review student submissions</li>
                </ul>
              </div>
            </section>

            {/* AI Chat */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <MessageSquare className="h-5 w-5 text-primary" />
                AI Chat
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chat with AI about your teaching materials. Upload files or select existing documents 
                to ask questions, get explanations, or generate additional content. Conversations are 
                saved for future reference.
              </p>
            </section>

            {/* History */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <History className="h-5 w-5 text-primary" />
                History
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Access all your previously generated content including syllabi, lesson plans, and quizzes. 
                Download, copy, or regenerate content from your history.
              </p>
            </section>

            {/* Settings */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <Settings className="h-5 w-5 text-primary" />
                Settings
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Manage your profile, update personal information, and configure your teaching preferences. 
                Sign out when you're done using the portal.
              </p>
            </section>

            {/* Tips */}
            <section className="space-y-2 bg-primary/5 p-4 rounded-lg">
              <h3 className="font-semibold text-foreground">💡 Quick Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload clear, readable documents for best AI extraction</li>
                <li>• Use specific chapter names for more accurate lesson plans</li>
                <li>• Share quiz links with students for easy access</li>
                <li>• Check History to reuse previously generated content</li>
                <li>• Edit AI-generated content to personalize for your class</li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
