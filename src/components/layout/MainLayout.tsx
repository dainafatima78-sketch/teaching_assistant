import { ReactNode } from "react";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { HowToUseModal } from "./HowToUseModal";
import { useAuth } from "@/lib/auth";
import { GraduationCap } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pattern-dots">
      <Sidebar />
      
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-border/50 lg:hidden shadow-sm">
        <MobileSidebar />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <h1 className="font-display text-sm font-bold text-foreground">Teaching Assistant</h1>
        </div>
        <div className="flex items-center gap-2">
          <HowToUseModal />
          {user && <NotificationBell />}
        </div>
      </header>

      <main className="lg:pl-64">
        {/* Desktop Top Bar with Notifications */}
        {user && (
          <div className="sticky top-0 z-30 hidden lg:flex items-center justify-end gap-3 px-6 py-3 bg-background/80 backdrop-blur-sm border-b border-border/30">
            <HowToUseModal />
            <NotificationBell />
          </div>
        )}
        <div className="min-h-screen p-3 pt-18 sm:p-4 sm:pt-20 lg:pt-4 lg:p-6 xl:p-8">{children}</div>
      </main>
    </div>
  );
}
