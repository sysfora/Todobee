"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ActivatePage } from "@/views/activate";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ActivatePage />
    </Suspense>
  );
}
