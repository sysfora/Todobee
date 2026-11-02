export const SWATCHES = [
  "slate",
  "gray",
  "red",
  "orange",
  "amber",
  "lime",
  "green",
  "teal",
  "sky",
  "blue",
  "indigo",
  "violet",
  "pink",
  "rose",
] as const;

export type Swatch = (typeof SWATCHES)[number];

/** CSS value for a swatch token defined in styles.css */
export const swatchVar = (c: Swatch) => `var(--swatch-${c})`;

/** Label color: the swatch hue deepened so white label text always passes WCAG AA. */
export const labelVar = (c: Swatch) => `var(--label-${c})`;

/** Human-readable swatch name for screen readers, e.g. "Sky". */
export const swatchName = (c: Swatch) => c.charAt(0).toUpperCase() + c.slice(1);

/** Soft Material "tonal" background made from any color token. */
export const tint = (color: string) => `color-mix(in oklab, ${color} 16%, var(--card))`;

/** Readable text/icon color for use on top of tint() (darker in light mode, lighter in dark). */
export const ink = (color: string) => `color-mix(in oklab, ${color} 45%, var(--ink-base))`;
