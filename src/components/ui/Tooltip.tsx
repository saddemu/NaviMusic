import { cloneElement, isValidElement, useRef, useState, type ReactElement, type ReactNode } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
  label: string;
  delay?: number;
  children: ReactNode;
}

export default function Tooltip({ label, delay = 500, children }: TooltipProps) {
  const [shown, setShown] = useState(false);
  const timer = useRef<number | null>(null);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(true), delay);
  };
  const hide = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setShown(false);
  };

  const child = isValidElement(children) ? (children as ReactElement) : null;

  return (
    <span className={styles.wrap} onMouseEnter={show} onMouseLeave={hide}>
      {child
        ? cloneElement(child, {
            onFocus: (e: React.FocusEvent) => {
              show();
              (child.props as { onFocus?: (e: React.FocusEvent) => void }).onFocus?.(e);
            },
            onBlur: (e: React.FocusEvent) => {
              hide();
              (child.props as { onBlur?: (e: React.FocusEvent) => void }).onBlur?.(e);
            },
          })
        : children}
      {shown && (
        <span role="tooltip" className={styles.tip}>
          {label}
        </span>
      )}
    </span>
  );
}
