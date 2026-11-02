/**
 * Touch dragging for board task cards. Phones don't support the browser's
 * built-in drag and drop reliably, so on touch screens a card is picked up
 * with a short press-and-hold, follows the finger, and is dropped on release.
 * A quick swipe still scrolls the board as usual.
 */
export type DropTarget = { sectionId: string; beforeId: string | null } | null;

const HOLD_MS = 280;
const MOVE_TOLERANCE = 8;
const EDGE = 56;
const MAX_SPEED = 14;

let dragging = false;
let suppressClickUntil = 0;

/** True while a card is being dragged with a finger. */
export const isTouchDragging = () => dragging;

/** Tapping is ignored right after a touch drag so the card doesn't also open. */
export const touchDragJustEnded = () => Date.now() < suppressClickUntil;

/** Which section (and before which card) a point on screen falls on. */
export function dropTargetAt(x: number, y: number, dragId: string): DropTarget {
  const column = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-section-id]");
  const sectionId = column?.dataset["sectionId"];
  if (!column || !sectionId) return null;
  const cards = Array.from(column.querySelectorAll<HTMLElement>("[data-task-card]")).filter(
    (el) => el.dataset["taskCard"] !== dragId,
  );
  const next = cards.find((el) => {
    const r = el.getBoundingClientRect();
    return y < r.top + r.height / 2;
  });
  return { sectionId, beforeId: next?.dataset["taskCard"] ?? null };
}

const sameTarget = (a: DropTarget, b: DropTarget) =>
  a?.sectionId === b?.sectionId && a?.beforeId === b?.beforeId;

/** Scroll speed when the finger is near an edge of a scrolling area. */
const edgeSpeed = (pos: number, start: number, end: number) => {
  if (pos < start + EDGE) return -MAX_SPEED * (1 - Math.max(0, pos - start) / EDGE);
  if (pos > end - EDGE) return MAX_SPEED * (1 - Math.max(0, end - pos) / EDGE);
  return 0;
};

export function startTouchDrag(
  e: React.TouchEvent<HTMLElement>,
  opts: {
    id: string;
    onStart: (id: string) => void;
    onTarget: (target: DropTarget) => void;
    onEnd: (id: string, target: DropTarget) => void;
  },
) {
  if (dragging || e.touches.length !== 1) return;
  const card = e.currentTarget;
  const first = e.touches[0]!;
  const startX = first.clientX;
  const startY = first.clientY;
  let x = startX;
  let y = startY;
  let ghost: HTMLElement | null = null;
  let target: DropTarget = null;
  let frame = 0;
  let offsetX = 0;
  let offsetY = 0;
  const board = card.closest<HTMLElement>("[data-board-scroll]");

  const place = () => {
    if (ghost) ghost.style.transform = `translate(${x - offsetX}px, ${y - offsetY}px) rotate(3deg)`;
  };

  const tick = () => {
    if (board) {
      const r = board.getBoundingClientRect();
      board.scrollLeft += edgeSpeed(x, r.left, r.right);
    }
    const list = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-section-id]")
      ?.querySelector<HTMLElement>("[data-section-list]");
    if (list) {
      const r = list.getBoundingClientRect();
      list.scrollTop += edgeSpeed(y, r.top, r.bottom);
    }
    const next = dropTargetAt(x, y, opts.id);
    if (!sameTarget(next, target)) {
      target = next;
      opts.onTarget(next);
    }
    frame = requestAnimationFrame(tick);
  };

  const activate = () => {
    dragging = true;
    navigator.vibrate?.(12);
    const r = card.getBoundingClientRect();
    offsetX = startX - r.left;
    offsetY = startY - r.top;
    ghost = card.cloneNode(true) as HTMLElement;
    ghost.removeAttribute("data-task-card");
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${r.width}px`,
      margin: "0",
      zIndex: "60",
      pointerEvents: "none",
      boxShadow: "var(--shadow-panel)",
    });
    document.body.appendChild(ghost);
    place();
    opts.onStart(opts.id);
    frame = requestAnimationFrame(tick);
  };

  const timer = window.setTimeout(activate, HOLD_MS);

  const onMove = (ev: TouchEvent) => {
    const t = ev.touches[0];
    if (!t) return;
    if (!dragging) {
      // Moving before the hold finishes means the user is scrolling.
      if (Math.hypot(t.clientX - startX, t.clientY - startY) > MOVE_TOLERANCE) cleanup();
      return;
    }
    ev.preventDefault();
    x = t.clientX;
    y = t.clientY;
    place();
  };

  const finish = (drop: boolean) => {
    const wasDragging = dragging;
    const final = drop ? (dropTargetAt(x, y, opts.id) ?? target) : null;
    cleanup();
    if (wasDragging) {
      suppressClickUntil = Date.now() + 400;
      opts.onEnd(opts.id, final);
    }
  };
  const onEnd = () => finish(true);
  const onCancel = () => finish(false);
  // Long-pressing on phones can open a context menu; not while picking up a card.
  const onContextMenu = (ev: Event) => ev.preventDefault();

  function cleanup() {
    window.clearTimeout(timer);
    cancelAnimationFrame(frame);
    ghost?.remove();
    ghost = null;
    dragging = false;
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("touchcancel", onCancel);
    card.removeEventListener("contextmenu", onContextMenu);
  }

  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);
  document.addEventListener("touchcancel", onCancel);
  card.addEventListener("contextmenu", onContextMenu);
}
