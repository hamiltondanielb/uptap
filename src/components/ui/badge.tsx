import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "border-stone-800 bg-stone-900 text-stone-50",
        outline: "border-border bg-card text-card-foreground",
        success: "border-emerald-300 bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800",
        warning: "border-amber-300 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800",
        info: "border-sky-300 bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100 dark:border-sky-800"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
