import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
export function WelcomeBanner() {
  return <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-primary-foreground animate-fade-in">
      {/* Background decoration */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium opacity-90">AI-Powered Teaching Assistant</span>
        </div>
        <h2 className="font-display text-3xl font-bold mb-2">Welcome back, Teacher!</h2>
        <p className="text-primary-foreground/80 max-w-lg mb-6">
          Your intelligent assistant is ready to help create lesson plans, generate quizzes, and answer questions using your uploaded syllabus.
        </p>
        <div className="flex gap-3">
          <Button asChild variant="secondary" size="lg">
            <Link to="/lesson-plans">Create Lesson Plan</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
            <Link to="/syllabus">Upload Syllabus</Link>
          </Button>
        </div>
      </div>
    </div>;
}