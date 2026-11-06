"use client";

import { useEffect } from "react";
import { applyTheme } from "@/lib/theme";

/** Legal pages follow the saved light or dark theme. */
export function PublicTheme() {
  useEffect(() => {
    applyTheme();
  }, []);
  return null;
}
