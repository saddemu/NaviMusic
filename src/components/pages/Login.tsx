import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { SubsonicError } from '@/types/subsonic';
import { BrandMark } from '../ui/Icon';
import styles from './Login.module.css';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const isInsecure = serverUrl.startsWith('http://') && !serverUrl.includes('localhost');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(serverUrl, username, password, remember);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof SubsonicError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Check your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.shell}>
      <form className={styles.card} onSubmit={onSubmit} autoComplete="on">
        <div className={styles.brand}>
          <BrandMark size={28} aria-hidden />
          pMusic
        </div>
        <p className={styles.tagline}>Connect to your Navidrome library.</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="serverUrl">
            Server URL
          </label>
          <input
            id="serverUrl"
            className={styles.input}
            type="url"
            inputMode="url"
            placeholder="https://music.example.com"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            required
            autoComplete="url"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <label className={styles.row}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember me on this device
        </label>

        <button className={styles.submit} disabled={submitting} type="submit">
          {submitting ? 'Connecting…' : 'Sign in'}
        </button>

        {isInsecure && (
          <p className={styles.warning}>
            Connecting over HTTP — credentials will be sent unencrypted.
          </p>
        )}
      </form>
    </div>
  );
}
