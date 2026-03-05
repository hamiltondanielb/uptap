import type { Metadata } from "next";
import { headers } from "next/headers";

import { AppShell } from "@/components/layout/app-shell";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Untap",
  description: "Local-first MTG collection and deck builder."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") ?? "/";

  return (
    <html lang="en">
      <body>
        <AppShell pathname={pathname}>{children}</AppShell>
      </body>
    </html>
  );
}

