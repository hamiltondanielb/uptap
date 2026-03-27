"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

export function RefreshPricesButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || props.disabled} type="submit">
      {pending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
      {children}
    </Button>
  );
}
