import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  MessageCircle,
  Upload,
  Settings,
  HelpCircle,
  History,
  Menu,
  Globe,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage, Language } from "@/contexts/LanguageContext";

const navItems = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard" },
  { icon: Upload, labelKey: "nav.syllabus", path: "/syllabus" },
  { icon: BookOpen, labelKey: "nav.lessonPlans", path: "/lesson-plans" },
  { icon: FileQuestion, labelKey: "nav.quizGenerator", path: "/quiz" },
  { icon: MessageCircle, labelKey: "nav.aiChat", path: "/chat" },
  { icon: HelpCircle, labelKey: "nav.homeworkHelp", path: "/homework" },
  { icon: History, labelKey: "nav.history", path: "/history" },
];

const bottomNavItems = [
  { icon: Settings, labelKey: "nav.settings", path: "/settings" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header with Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
        <div className="h-11 w-11 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-foreground leading-tight">Your Teaching</h1>
          <p className="text-xs text-primary font-medium">Assistant</p>
        </div>
      </div>

      {/* Language Selector */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-xl">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Select value={language} onValueChange={(v: Language) => setLanguage(v)}>
            <SelectTrigger className="flex-1 h-7 border-0 bg-transparent shadow-none focus:ring-0 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="urdu">اردو (Urdu)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {language === "urdu" ? "مین مینو" : "Main Menu"}
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "gradient-primary text-white shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border/50 px-3 py-4">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "gradient-primary text-white shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Desktop Sidebar
export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border/50 bg-white hidden lg:block shadow-sm">
      <SidebarContent />
    </aside>
  );
}

// Mobile Sidebar with Sheet
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-white">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
