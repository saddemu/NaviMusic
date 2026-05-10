import { useToastStore } from '@/store/toastStore';
import styles from './Toast.module.css';

export default function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.variant]}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
