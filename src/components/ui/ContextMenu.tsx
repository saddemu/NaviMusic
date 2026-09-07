import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ContextMenu.module.css';

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface Props {
  items: MenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ContextMenu({ items, position, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(position);
  // Where the click landed, relative to the menu's own box. The menu scales
  // out of that point, so it visibly comes from the thing that summoned it
  // rather than from its own centre.
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let x = position.x;
    let y = position.y;
    if (x + r.width > window.innerWidth - 8) x = window.innerWidth - r.width - 8;
    if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
    x = Math.max(8, x);
    y = Math.max(8, y);
    setPos({ x, y });
    setOrigin({ x: position.x - x, y: position.y - y });
  }, [position]);

  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    setTimeout(() => window.addEventListener('click', close), 0);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className={styles.menu}
      style={{
        left: pos.x,
        top: pos.y,
        transformOrigin: `${origin.x}px ${origin.y}px`,
      }}
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it, i) =>
        it.divider ? (
          <div key={`d-${i}`} className={styles.divider} />
        ) : (
          <button
            key={it.label + i}
            className={`${styles.item}${it.danger ? ' ' + styles.danger : ''}`}
            onClick={() => {
              it.onClick();
              onClose();
            }}
            role="menuitem"
            type="button"
          >
            {it.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
