import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  path: string;
  color: "primary" | "accent" | "success" | "warning";
  delay?: number;
}

const colorVariants = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/15 text-accent-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
};

const hoverVariants = {
  primary: "group-hover:bg-primary group-hover:text-primary-foreground",
  accent: "group-hover:bg-accent group-hover:text-accent-foreground",
  success: "group-hover:bg-success group-hover:text-success-foreground",
  warning: "group-hover:bg-warning group-hover:text-warning-foreground",
};

export function FeatureCard({ icon: Icon, title, description, path, color, delay = 0 }: FeatureCardProps) {
  return (
    <Link
      to={path}
      className="group glass-card glass-card-hover block rounded-2xl p-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300",
          colorVariants[color],
          hoverVariants[color]
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mb-2 font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </Link>
  );
}
