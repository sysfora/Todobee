const COLORS = ["--swatch-blue", "--swatch-red", "--swatch-amber", "--swatch-green"];
const RAYS = 8;

/**
 * A quick burst of colored dashes around a point, like Google Tasks when a task is done.
 * Drawn on the page itself (not inside the task) so it still finishes when the task
 * leaves the list, e.g. on My Tasks. Skipped for people who prefer reduced motion.
 */
export function burstFrom(el: Element) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height);
  const root = document.createElement("span");
  root.className = "task-burst";
  root.setAttribute("aria-hidden", "true");
  root.style.left = `${r.left + r.width / 2}px`;
  root.style.top = `${r.top + r.height / 2}px`;
  root.style.setProperty("--burst-start", `${size * 0.55}px`);
  root.style.setProperty("--burst-end", `${size * 1.15}px`);
  for (let i = 0; i < RAYS; i++) {
    const ray = document.createElement("span");
    ray.className = "task-burst-ray";
    ray.style.setProperty("--angle", `${(360 / RAYS) * i + 22.5}deg`);
    ray.style.backgroundColor = `var(${COLORS[i % COLORS.length]})`;
    root.appendChild(ray);
  }
  document.body.appendChild(root);
  window.setTimeout(() => root.remove(), 700);
}
