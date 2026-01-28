import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { LucideIcon, ArrowRight } from "lucide-react";
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
  primary: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white",
  accent: "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white",
  success: "bg-success/10 text-success group-hover:bg-success group-hover:text-white",
  warning: "bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white",
};

const borderVariants = {
  primary: "group-hover:border-primary/30",
  accent: "group-hover:border-accent/30",
  success: "group-hover:border-success/30",
  warning: "group-hover:border-warning/30",
};

export const FeatureCard = forwardRef<HTMLAnchorElement, FeatureCardProps>(
  ({ icon: Icon, title, description, path, color, delay = 0 }, ref) => {
    return (
      <Link
        ref={ref}
        to={path}
        className={cn(
          "group soft-card glass-card-hover block rounded-xl sm:rounded-2xl p-4 sm:p-6 animate-slide-up border border-transparent transition-all",
          borderVariants[color]
        )}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div
            className={cn(
              "flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-300",
              colorVariants[color]
            )}
          >
            <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
        <h3 className="mb-1 sm:mb-2 font-display text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
      </Link>
    );
  }
);

FeatureCard.displayName = "FeatureCard";
