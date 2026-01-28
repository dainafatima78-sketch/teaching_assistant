import { Sparkles, GraduationCap, BookOpen, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeacherProfile } from "@/hooks/useTeacherProfile";

export function WelcomeBanner() {
  const { t } = useLanguage();
  const { data: profile } = useTeacherProfile();
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const displayName = profile?.full_name || "Teacher";
  
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl gradient-hero p-5 sm:p-8 md:p-10 text-white animate-fade-in">
      {/* Decorative elements */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 md:right-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-white" />
          </div>
          <div className="hidden md:flex h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center">
            <BookOpen className="h-7 w-7 text-white/90" />
          </div>
          <div className="hidden lg:flex h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-sm items-center justify-center">
            <Award className="h-6 w-6 text-white/80" />
          </div>
        </div>
      </div>
      
      {/* Background decorative circles */}
      <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-xl" />
      
      <div className="relative z-10">
        <p className="text-xs sm:text-sm text-white/80 mb-1 sm:mb-2">{formattedDate}</p>
        <h2 className="font-display text-xl sm:text-2xl md:text-4xl font-bold mb-1 sm:mb-2 pr-12 sm:pr-16">
          {t("dashboard.welcome").replace("!", `, ${displayName}!`)}
        </h2>
        <p className="text-white/80 max-w-lg mb-4 sm:mb-6 text-xs sm:text-sm md:text-base">
          {t("dashboard.welcomeDesc")}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button 
            asChild 
            size="default"
            className="bg-white text-primary hover:bg-white/90 rounded-lg sm:rounded-xl font-semibold shadow-lg text-sm sm:text-base h-9 sm:h-11"
          >
            <Link to="/lesson-plans">{t("dashboard.createLessonPlan")}</Link>
          </Button>
          <Button 
            asChild 
            variant="ghost" 
            size="default"
            className="text-white border-2 border-white/30 hover:bg-white/10 hover:text-white rounded-lg sm:rounded-xl text-sm sm:text-base h-9 sm:h-11"
          >
            <Link to="/syllabus">{t("dashboard.uploadSyllabus")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
