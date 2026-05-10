import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ping } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore, type MaxBitrate } from '@/store/settingsStore';
import { showToast } from '@/store/toastStore';
import PageHeader from '../ui/PageHeader';
import styles from './Settings.module.css';

export default function Settings() {
  const config = useAuthStore((s) => s.config);
  const settings = useSettingsStore();
  const queryClient = useQueryClient();

  const pingQuery = useQuery({
    queryKey: ['ping'],
    queryFn: async () => {
      const t = performance.now();
      await ping(config!);
      return Math.round(performance.now() - t);
    },
    enabled: !!config,
    refetchOnMount: 'always',
  });

  const Toggle = ({
    label,
    help,
    value,
    onChange,
  }: {
    label: string;
    help?: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.label}>{label}</span>
        {help && <span className={styles.help}>{help}</span>}
      </div>
      <button
        className={`${styles.toggle}${value ? ' ' + styles.on : ''}`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        type="button"
      />
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader title="Settings" />
      <div className={styles.body}>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.label}>Max bitrate</span>
            <span className={styles.help}>
              Higher bitrates use more bandwidth. Original keeps the source quality.
            </span>
          </div>
          <select
            className={styles.select}
            value={settings.maxBitrate}
            onChange={(e) => settings.set('maxBitrate', Number(e.target.value) as MaxBitrate)}
          >
            <option value={128}>128 kbps</option>
            <option value={192}>192 kbps</option>
            <option value={256}>256 kbps</option>
            <option value={320}>320 kbps</option>
            <option value={0}>Original</option>
          </select>
        </div>

        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.label}>Crossfade</span>
            <span className={styles.help}>{settings.crossfadeSeconds}s between tracks</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            className={`pm-range ${styles.slider}`}
            style={{ '--progress': `${(settings.crossfadeSeconds / 10) * 100}%` } as React.CSSProperties}
            value={settings.crossfadeSeconds}
            onChange={(e) => settings.set('crossfadeSeconds', Number(e.target.value))}
          />
        </div>

        <Toggle
          label="Prefetch next track"
          help="Loads the next song in the background for gapless playback."
          value={settings.prefetchNext}
          onChange={(v) => settings.set('prefetchNext', v)}
        />
        <Toggle
          label="Album gain"
          help="Apply ReplayGain album-level volume normalization."
          value={settings.showAlbumGain}
          onChange={(v) => settings.set('showAlbumGain', v)}
        />

        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.label}>Server</span>
            <span className={styles.help}>
              {config?.serverUrl}
              {pingQuery.data !== undefined && ` · ${pingQuery.data}ms`}
              {pingQuery.isError && ` · unreachable`}
            </span>
          </div>
          <button
            className="btn-ghost"
            onClick={() => pingQuery.refetch()}
            type="button"
          >
            Test
          </button>
        </div>

        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.label}>Clear cache</span>
            <span className={styles.help}>Removes all cached query data from memory.</span>
          </div>
          <button
            className="btn-ghost"
            onClick={() => {
              queryClient.clear();
              showToast('Cache cleared', 'success');
            }}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
