"use client";

import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  type,
  ...props
}: ButtonProps & { confirmMessage: string }) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          return;
        }

        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        event.currentTarget.form?.requestSubmit();
      }}
      type={type ?? "button"}
    />
  );
}
