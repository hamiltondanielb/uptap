import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "border-stone-800 bg-stone-900 text-stone-50",
        outline: "border-stone-300 bg-white text-stone-950",
        success: "border-emerald-300 bg-emerald-100 text-emerald-950",
        warning: "border-amber-300 bg-amber-100 text-amber-950",
        info: "border-sky-300 bg-sky-100 text-sky-950"
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
