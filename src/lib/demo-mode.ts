import { createSeed } from "./seed";
import type { AppState } from "./types";

export const isDemo = process.env.NEXT_PUBLIC_DEMO === "1";
export const DEMO_ORIGIN = "https://demo.todobee.com";
export const DEMO_STORAGE_KEY = "todobee:demo:v1";

let memory: AppState | null = null;

function blankSeed(): AppState {
  const seed = createSeed();
  seed.invites = seed.invites ?? [];
  return seed;
}

/** The sample board. Reads localStorage once, then keeps that copy for the tab. */
export function loadDemoBoard(migrate: (state: AppState) => AppState): AppState {
  if (memory) return memory;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        memory = migrate({ ...blankSeed(), ...JSON.parse(raw) });
        memory.invites = memory.invites ?? [];
        return memory;
      }
    } catch {
      // A broken saved copy falls through to the sample board.
    }
  }
  memory = migrate(blankSeed());
  return memory;
}

export function saveDemoBoard(state: AppState) {
  memory = state;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The browser refused the write. The board still works until refresh.
  }
}
