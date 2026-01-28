import { BookOpen, FileQuestion, MessageCircle, Upload, HelpCircle, FileText, Clock, BarChart3 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FeatureCard } from "@/components/dashboard/FeatureCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { useStats } from "@/hooks/useStats";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useStats();
  const { t } = useLanguage();

  const features = [
    { icon: Upload, title: t("feature.uploadSyllabus"), description: t("feature.uploadDesc"), path: "/syllabus", color: "primary" as const },
    { icon: BookOpen, title: t("feature.lessonPlans"), description: t("feature.lessonDesc"), path: "/lesson-plans", color: "accent" as const },
    { icon: FileQuestion, title: t("feature.quizGenerator"), description: t("feature.quizDesc"), path: "/quiz", color: "success" as const },
    { icon: MessageCircle, title: t("feature.aiChat"), description: t("feature.aiChatDesc"), path: "/chat", color: "primary" as const },
    { icon: HelpCircle, title: t("feature.homeworkHelp"), description: t("feature.homeworkDesc"), path: "/homework", color: "warning" as const },
  ];

  const statsData = [
    { icon: FileText, label: t("stats.documentsUploaded"), value: stats?.totalDocuments?.toString() || "0", change: t("stats.syllabusFiles"), positive: true, iconBg: "bg-gradient-to-br from-primary to-accent" },
    { icon: BookOpen, label: t("stats.lessonPlans"), value: stats?.totalLessonPlans?.toString() || "0", change: t("stats.generated"), positive: true, iconBg: "bg-gradient-to-br from-accent to-primary" },
    { icon: FileQuestion, label: t("stats.quizzesGenerated"), value: stats?.totalQuizzes?.toString() || "0", change: t("stats.totalQuizzes"), positive: true, iconBg: "bg-gradient-to-br from-success to-emerald-400" },
    { icon: Clock, label: t("stats.chaptersExtracted"), value: stats?.totalChapters?.toString() || "0", change: t("stats.fromDocuments"), positive: true, iconBg: "bg-gradient-to-br from-warning to-orange-400" },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        <WelcomeBanner />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {statsData.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground">{t("dashboard.quickActions")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map((feature, index) => (
              <FeatureCard key={feature.path} {...feature} delay={index * 100} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="soft-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">{t("dashboard.recentActivity")}</h3>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors gap-1 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{activity.action}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{activity.subject}</p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground bg-background px-2 sm:px-3 py-0.5 sm:py-1 rounded-full w-fit flex-shrink-0">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 sm:py-8">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">{t("dashboard.noActivity")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
