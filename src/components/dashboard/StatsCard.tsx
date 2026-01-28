import { forwardRef } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  iconBg?: string;
}

export const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  ({ icon: Icon, label, value, change, positive, iconBg }, ref) => {
    return (
      <div ref={ref} className="soft-card glass-card-hover group p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={cn(
            "flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl transition-transform duration-300 group-hover:scale-105 flex-shrink-0",
            iconBg || "bg-primary/10"
          )}>
            <Icon className={cn(
              "h-5 w-5 sm:h-7 sm:w-7",
              iconBg ? "text-white" : "text-primary"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl sm:text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">{label}</p>
          </div>
        </div>
        {change && (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
            <span
              className={cn(
                "text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full",
                positive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {change}
            </span>
          </div>
        )}
      </div>
    );
  }
);

StatsCard.displayName = "StatsCard";
