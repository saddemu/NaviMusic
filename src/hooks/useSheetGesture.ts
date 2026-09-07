import { useCallback, useEffect, useRef, useState } from 'react';
import { SPRING, Spring, project, rubberband } from '@/lib/spring';

type Axis = 'x' | 'y';

interface Options {
  /** Whether the panel should be showing. */
  open: boolean;
  /** Called when the gesture (or Escape) dismisses the panel. */
  onClose: () => void;
  /** Which way the panel leaves: 'x' slides out to the right, 'y' slides down. */
  axis?: Axis;
  /** How much of the panel must be dragged away for a slow release to dismiss. */
  dismissRatio?: number;
  /** Fires once the closing spring has settled — use it to unmount. */
  onClosed?: () => void;
}

interface SheetGesture<P extends HTMLElement, B extends HTMLElement> {
  /** Attach to the panel. It is translated along `axis` and carries the gesture. */
  panelRef: (el: P | null) => void;
  /** Attach to the dimming scrim. Its opacity tracks the drag 1:1. */
  backdropRef: (el: B | null) => void;
  /** True while the panel should exist in the tree (open, or still animating out). */
  visible: boolean;
}

const DIRECTION_THRESHOLD = 10; // px before a press commits to being a drag
const FLICK_VELOCITY = 550; // px/s — a throw dismisses regardless of distance

/**
 * Drag-to-dismiss for a panel, with spring-driven open and close.
 *
 * One spring drives all three phases — the button-press open, the finger, and
 * the release — so the user can grab a panel that is still flying in and throw
 * it straight back out without waiting for anything to finish. On release the
 * resting point is *projected* from the release velocity rather than read off
 * the release position, which is what makes a flick feel like it threw the
 * panel instead of nudging it.
 *
 * The panel gets two custom properties every frame:
 *   `--sheet-offset`  px along the axis, 0 = fully open
 *   `--sheet-p`       0 = closed, 1 = open, for coupled opacity/scale
 *
 * Anything inside the panel that scrolls along the drag axis should carry
 * `data-no-sheet-drag` so its own scrolling wins.
 */
export function useSheetGesture<P extends HTMLElement, B extends HTMLElement = HTMLElement>({
  open,
  onClose,
  axis = 'x',
  dismissRatio = 0.4,
  onClosed,
}: Options): SheetGesture<P, B> {
  const [panel, setPanel] = useState<P | null>(null);
  const [visible, setVisible] = useState(open);
  // The scrim is only ever written to, never read during render, so a ref
  // keeps it out of the gesture effect's dependencies — re-binding the
  // listeners mid-drag would drop the gesture.
  const backdropElRef = useRef<B | null>(null);

  // Kept in refs so the gesture listeners never re-bind mid-drag.
  const onCloseRef = useRef(onClose);
  const onClosedRef = useRef(onClosed);
  const openRef = useRef(open);
  const dismissRatioRef = useRef(dismissRatio);
  const springRef = useRef<Spring | null>(null);
  const sizeRef = useRef(1);
  onCloseRef.current = onClose;
  onClosedRef.current = onClosed;
  openRef.current = open;
  dismissRatioRef.current = dismissRatio;

  const panelRef = useCallback((el: P | null) => setPanel(el), []);
  const backdropRef = useCallback((el: B | null) => {
    backdropElRef.current = el;
  }, []);

  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  // --- the spring, the painter and the gesture ------------------------------
  useEffect(() => {
    if (!panel) return;

    const measure = () => (axis === 'x' ? panel.offsetWidth : panel.offsetHeight) || 1;
    sizeRef.current = measure();

    const paint = (offset: number) => {
      const size = sizeRef.current;
      const p = Math.max(0, Math.min(1, 1 - offset / size));
      panel.style.setProperty('--sheet-offset', `${offset}px`);
      panel.style.setProperty('--sheet-p', `${p}`);
      const scrim = backdropElRef.current;
      if (scrim) {
        scrim.style.opacity = `${p}`;
        scrim.style.pointerEvents = p > 0.01 ? 'auto' : 'none';
      }
      // A fully closed panel must not be clickable or focusable.
      const gone = p <= 0.001;
      panel.style.visibility = gone ? 'hidden' : 'visible';
      panel.style.pointerEvents = gone ? 'none' : '';
    };

    const spring = new Spring(0, paint, SPRING.sheet, { delta: 0.5, speed: 2 });
    springRef.current = spring;
    spring.set(sizeRef.current);

    let pointerId = -1;
    let startPos = 0;
    let startCross = 0;
    let startOffset = 0;
    let dragging = false;
    let abandoned = false;
    let lastPos = 0;
    let lastTime = 0;
    let velocity = 0; // px/s along the axis

    const coord = (e: PointerEvent) => (axis === 'x' ? e.clientX : e.clientY);
    const cross = (e: PointerEvent) => (axis === 'x' ? e.clientY : e.clientX);

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !openRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-no-sheet-drag]')) return;
      if (target.closest('input, select, textarea')) return;
      sizeRef.current = measure();
      pointerId = e.pointerId;
      startPos = coord(e);
      startCross = cross(e);
      lastPos = startPos;
      lastTime = e.timeStamp;
      startOffset = spring.value;
      velocity = 0;
      dragging = false;
      abandoned = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId || abandoned) return;
      const delta = coord(e) - startPos;
      const crossDelta = cross(e) - startCross;

      if (!dragging) {
        if (Math.abs(delta) < DIRECTION_THRESHOLD && Math.abs(crossDelta) < DIRECTION_THRESHOLD) {
          return;
        }
        // Both directions are tracked in parallel from the first move; once
        // the intent is clear the loser is cancelled, so a cross-axis drag
        // still belongs to whatever scrolls inside the panel.
        if (Math.abs(crossDelta) > Math.abs(delta)) {
          abandoned = true;
          return;
        }
        dragging = true;
        spring.stop();
        panel.setPointerCapture(pointerId);
      }

      if (e.cancelable) e.preventDefault();

      const dt = e.timeStamp - lastTime;
      if (dt > 0) {
        // Low-pass, so one noisy event cannot spike the release velocity.
        const instant = ((coord(e) - lastPos) / dt) * 1000;
        velocity = velocity * 0.2 + instant * 0.8;
        lastPos = coord(e);
        lastTime = e.timeStamp;
      }

      // Past fully open there is nothing more to reveal: resist rather than
      // let the panel slide off its own hinge.
      const raw = startOffset + delta;
      const offset = raw >= 0 ? raw : -rubberband(-raw, sizeRef.current);
      spring.value = offset;
      spring.velocity = 0;
      paint(offset);
    };

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = -1;
      if (!dragging) return;
      dragging = false;
      if (panel.hasPointerCapture(e.pointerId)) panel.releasePointerCapture(e.pointerId);

      // A pause before release means the user placed the panel, not threw it.
      if (e.timeStamp - lastTime > 80) velocity = 0;

      const projected = spring.value + project(velocity);
      const dismiss =
        velocity > FLICK_VELOCITY || projected > sizeRef.current * dismissRatioRef.current;

      if (dismiss) {
        spring.to(sizeRef.current, {
          velocity,
          onRest: () => {
            setVisible(false);
            onClosedRef.current?.();
          },
        });
        onCloseRef.current();
      } else {
        spring.to(0, { velocity });
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openRef.current) onCloseRef.current();
    };

    const onResize = () => {
      const next = measure();
      if (next === sizeRef.current) return;
      const p = 1 - spring.value / sizeRef.current;
      sizeRef.current = next;
      spring.set((1 - p) * next);
    };

    panel.addEventListener('pointerdown', onPointerDown);
    panel.addEventListener('pointermove', onPointerMove);
    panel.addEventListener('pointerup', endDrag);
    panel.addEventListener('pointercancel', endDrag);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    return () => {
      spring.stop();
      springRef.current = null;
      panel.removeEventListener('pointerdown', onPointerDown);
      panel.removeEventListener('pointermove', onPointerMove);
      panel.removeEventListener('pointerup', endDrag);
      panel.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [panel, axis]);

  // Opening and closing from outside the panel (a button, a route change).
  useEffect(() => {
    const spring = springRef.current;
    if (!panel || !spring) return;
    const target = open ? 0 : sizeRef.current;
    if (Math.abs(spring.value - target) < 0.5) return;
    spring.to(target, {
      onRest: open
        ? undefined
        : () => {
            setVisible(false);
            onClosedRef.current?.();
          },
    });
  }, [panel, open]);

  return { panelRef, backdropRef, visible };
}
