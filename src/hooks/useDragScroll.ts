import { useEffect, useRef } from 'react';
import { SPRING, Spring, project, prefersReducedMotion, rubberband } from '@/lib/spring';

/**
 * Makes a horizontally scrollable container draggable with the mouse.
 * Touch and pen keep native scrolling (only `pointerType === 'mouse'` is
 * handled). After a real drag, the click that would land on the card under
 * the cursor is swallowed so cards don't navigate when the user lets go.
 *
 * On release the row does not decelerate and *then* correct itself onto a
 * snap point. The resting position is projected from the release velocity
 * first (the same exponential-decay model scroll views use), the nearest card
 * to that projection becomes the target, and a single spring carries the row
 * there with the finger's own velocity — so a flick reads as a throw with a
 * destination rather than a slide followed by a tug.
 *
 * At the ends the row rubber-bands: `scrollLeft` cannot go past its bounds, so
 * the overshoot is applied as a transform with progressive resistance and
 * springs back on release. A hard stop reads as frozen; resistance reads as
 * "responsive, but there is nothing more here".
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const DRAG_THRESHOLD = 5; // px before a press becomes a drag
    const MIN_FLICK_VELOCITY = 50; // px/s below which a release has no glide
    const MAX_RUBBERBAND = 120; // px of give at either end

    let pointerId = -1;
    let startX = 0;
    let startScrollLeft = 0;
    let dragging = false;
    let suppressClick = false;

    let targetScrollLeft = 0;
    let moveRaf = 0;
    let velocity = 0; // px/s, positive = scrolling right
    let lastX = 0;
    let lastMoveTime = 0;
    let overshoot = 0; // px past an end, before resistance
    let snapRestoreTimer = 0;

    const maxScroll = () => Math.max(0, el.scrollWidth - el.clientWidth);

    // Scroll-snap fights manual scrollLeft writes, so it is off for the whole
    // gesture and for the glide that follows; the projection already lands on
    // a snap point, so nothing is lost.
    const suspendSnap = () => {
      window.clearTimeout(snapRestoreTimer);
      el.style.scrollBehavior = 'auto';
      el.style.scrollSnapType = 'none';
    };
    const restoreSnap = () => {
      el.style.scrollSnapType = '';
      snapRestoreTimer = window.setTimeout(() => {
        el.style.scrollBehavior = '';
      }, 60);
    };

    const applyOvershoot = (px: number) => {
      overshoot = px;
      el.style.transform = px === 0 ? '' : `translateX(${-px}px)`;
    };

    // One spring for the glide, re-targeted rather than restarted.
    const glide = new Spring(
      0,
      (v) => {
        el.scrollLeft = v;
      },
      SPRING.flick,
      { delta: 0.5, speed: 5 },
    );

    // A separate spring returns the rubber-band to zero.
    const bandBack = new Spring(0, applyOvershoot, SPRING.sheet, { delta: 0.2, speed: 1 });

    /** Nearest child start edge to a projected scroll position. */
    const nearestSnapPoint = (position: number): number => {
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return position;
      let best = position;
      let bestDistance = Infinity;
      for (const child of children) {
        const edge = child.offsetLeft - el.offsetLeft;
        const distance = Math.abs(edge - position);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = edge;
        }
      }
      return best;
    };

    const stopMotion = () => {
      glide.stop();
      bandBack.stop();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      stopMotion();
      pointerId = e.pointerId;
      startX = e.clientX;
      lastX = e.clientX;
      lastMoveTime = e.timeStamp;
      startScrollLeft = el.scrollLeft;
      velocity = 0;
      dragging = false;
      suppressClick = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        dragging = true;
        el.setPointerCapture(pointerId);
        el.style.cursor = 'grabbing';
        suspendSnap();
      }
      const dt = e.timeStamp - lastMoveTime;
      if (dt > 0) {
        // Low-pass the instantaneous velocity so one noisy event can't spike it.
        const instant = (-(e.clientX - lastX) / dt) * 1000;
        velocity = velocity * 0.2 + instant * 0.8;
        lastX = e.clientX;
        lastMoveTime = e.timeStamp;
      }

      const wanted = startScrollLeft - dx;
      const max = maxScroll();
      targetScrollLeft = Math.max(0, Math.min(max, wanted));
      const past = wanted < 0 ? wanted : wanted > max ? wanted - max : 0;

      if (!moveRaf) {
        moveRaf = requestAnimationFrame(() => {
          moveRaf = 0;
          el.scrollLeft = targetScrollLeft;
          applyOvershoot(
            past === 0
              ? 0
              : Math.sign(past) *
                  Math.min(MAX_RUBBERBAND, Math.abs(rubberband(past, el.clientWidth))),
          );
        });
      }
    };

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = -1;
      if (!dragging) return;
      dragging = false;
      suppressClick = true;
      el.style.cursor = '';
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

      if (overshoot !== 0) {
        bandBack.set(overshoot);
        bandBack.to(0, { onRest: restoreSnap });
        return;
      }

      // A pause before release means the user stopped, not flicked.
      if (e.timeStamp - lastMoveTime > 80) velocity = 0;

      if (Math.abs(velocity) < MIN_FLICK_VELOCITY || prefersReducedMotion()) {
        restoreSnap();
        return;
      }

      // Land where the gesture was going, not where it happened to stop.
      const projected = el.scrollLeft + project(velocity);
      const clamped = Math.max(0, Math.min(maxScroll(), projected));
      const target = Math.max(0, Math.min(maxScroll(), nearestSnapPoint(clamped)));

      glide.set(el.scrollLeft);
      glide.to(target, { velocity, onRest: restoreSnap });
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    // The wheel takes over immediately; a running glide must not fight it.
    const onWheel = () => stopMotion();

    // Images/links inside the row must not start a native HTML5 drag.
    const onDragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('dragstart', onDragStart);
    return () => {
      cancelAnimationFrame(moveRaf);
      stopMotion();
      window.clearTimeout(snapRestoreTimer);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  return ref;
}
