import { BookOpen, FileQuestion, MessageCircle, Upload, HelpCircle, FileText, Clock, History } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FeatureCard } from "@/components/dashboard/FeatureCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { useStats } from "@/hooks/useStats";
import { formatDistanceToNow } from "date-fns";

const features = [
  { icon: Upload, title: "Upload Syllabus", description: "Upload course materials via documents, images, text, or voice.", path: "/syllabus", color: "primary" as const },
  { icon: BookOpen, title: "Lesson Plans", description: "Generate detailed lesson plans based on your curriculum.", path: "/lesson-plans", color: "accent" as const },
  { icon: FileQuestion, title: "Quiz Generator", description: "Create MCQs, short questions, and long questions instantly.", path: "/quiz", color: "success" as const },
  { icon: MessageCircle, title: "AI Chat", description: "Ask questions and get answers from your syllabus content.", path: "/chat", color: "primary" as const },
  { icon: HelpCircle, title: "Homework Help", description: "Get step-by-step explanations for homework questions.", path: "/homework", color: "warning" as const },
];

export default function Dashboard() {
  const { data: stats, isLoading } = useStats();

  const statsData = [
    { icon: FileText, label: "Documents Uploaded", value: stats?.totalDocuments?.toString() || "0", change: "Syllabus files", positive: true },
    { icon: BookOpen, label: "Lesson Plans", value: stats?.totalLessonPlans?.toString() || "0", change: "Generated", positive: true },
    { icon: FileQuestion, label: "Quizzes Generated", value: stats?.totalQuizzes?.toString() || "0", change: "Total quizzes", positive: true },
    { icon: Clock, label: "Chapters Extracted", value: stats?.totalChapters?.toString() || "0", change: "From documents", positive: true },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <WelcomeBanner />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        <div>
          <h3 className="font-display text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <FeatureCard key={feature.path} {...feature} delay={index * 100} />
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.subject}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No activity yet. Upload a syllabus to get started!</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
