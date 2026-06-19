import { useEffect, useRef } from 'react';

/**
 * Makes a horizontally scrollable container draggable with the mouse.
 * Touch and pen keep native scrolling (only `pointerType === 'mouse'` is
 * handled). After a real drag, the click that would land on the card under
 * the cursor is swallowed so cards don't navigate when the user lets go.
 *
 * Scroll writes are coalesced into requestAnimationFrame, scroll-snap is
 * suspended for the duration of the gesture (it fights manual scrollLeft
 * writes and causes jitter), and releasing mid-motion glides out with a
 * light momentum before snap is restored.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const DRAG_THRESHOLD = 5; // px before a press becomes a drag
    const MOMENTUM_TAU = 200; // ms — decay time constant (small = light inertia)
    const MIN_FLICK_VELOCITY = 0.05; // px/ms below which release has no glide
    const STOP_VELOCITY = 0.01; // px/ms at which the glide settles

    let pointerId = -1;
    let startX = 0;
    let startScrollLeft = 0;
    let dragging = false;
    let suppressClick = false;

    let targetScrollLeft = 0;
    let moveRaf = 0;
    let momentumRaf = 0;
    let velocity = 0; // px/ms, in scroll direction
    let lastX = 0;
    let lastMoveTime = 0;
    let snapRestoreTimer = 0;

    const suspendSnap = () => {
      window.clearTimeout(snapRestoreTimer);
      el.style.scrollBehavior = 'auto';
      el.style.scrollSnapType = 'none';
    };

    // Re-enabling snap makes the browser re-snap immediately; doing it with
    // smooth behavior turns that correction into a short ease instead of a jump.
    const restoreSnap = () => {
      el.style.scrollBehavior = 'smooth';
      el.style.scrollSnapType = '';
      snapRestoreTimer = window.setTimeout(() => {
        el.style.scrollBehavior = '';
      }, 400);
    };

    const stopMomentum = () => {
      cancelAnimationFrame(momentumRaf);
      momentumRaf = 0;
    };

    const startMomentum = () => {
      let prev = performance.now();
      const step = (now: number) => {
        const dt = now - prev;
        prev = now;
        el.scrollLeft += velocity * dt;
        velocity *= Math.exp(-dt / MOMENTUM_TAU);
        const maxScroll = el.scrollWidth - el.clientWidth;
        const atEdge = el.scrollLeft <= 0 || el.scrollLeft >= maxScroll;
        if (Math.abs(velocity) < STOP_VELOCITY || atEdge) {
          momentumRaf = 0;
          restoreSnap();
          return;
        }
        momentumRaf = requestAnimationFrame(step);
      };
      momentumRaf = requestAnimationFrame(step);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      stopMomentum();
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
        const instant = -(e.clientX - lastX) / dt;
        velocity = velocity * 0.2 + instant * 0.8;
        lastX = e.clientX;
        lastMoveTime = e.timeStamp;
      }
      targetScrollLeft = startScrollLeft - dx;
      if (!moveRaf) {
        moveRaf = requestAnimationFrame(() => {
          moveRaf = 0;
          el.scrollLeft = targetScrollLeft;
        });
      }
    };

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (dragging) {
        suppressClick = true;
        el.style.cursor = '';
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
        // A pause before release means the user stopped, not flicked.
        if (e.timeStamp - lastMoveTime > 80) velocity = 0;
        if (Math.abs(velocity) >= MIN_FLICK_VELOCITY) startMomentum();
        else restoreSnap();
      }
      pointerId = -1;
      dragging = false;
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    // The wheel takes over immediately; a running glide must not fight it.
    const onWheel = () => stopMomentum();

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
      stopMomentum();
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
