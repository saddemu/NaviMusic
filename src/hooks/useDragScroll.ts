import { useEffect, useRef } from 'react';

/**
 * Makes a horizontally scrollable container draggable with the mouse.
 * Touch and pen keep native scrolling (only `pointerType === 'mouse'` is
 * handled). After a real drag, the click that would land on the card under
 * the cursor is swallowed so cards don't navigate when the user lets go.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const DRAG_THRESHOLD = 5; // px before a press becomes a drag
    let pointerId = -1;
    let startX = 0;
    let startScrollLeft = 0;
    let dragging = false;
    let suppressClick = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
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
      }
      el.scrollLeft = startScrollLeft - dx;
    };

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (dragging) {
        suppressClick = true;
        el.style.cursor = '';
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
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

    // Images/links inside the row must not start a native HTML5 drag.
    const onDragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('dragstart', onDragStart);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  return ref;
}
