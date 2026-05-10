import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coverArtUrl, createPlaylist, deletePlaylist, getPlaylists } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/store/toastStore';
import { formatDate, formatLongDuration } from '@/lib/utils';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import { PlaylistIcon, PlusIcon, TrashIcon } from '../ui/Icon';
import styles from './Playlists.module.css';

export default function Playlists() {
  const config = useAuthStore((s) => s.config);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => getPlaylists(config!),
    enabled: !!config,
  });

  const createMut = useMutation({
    mutationFn: (name: string) => createPlaylist(config!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setNewName('');
      setCreateOpen(false);
      showToast('Playlist created', 'success');
    },
    onError: () => showToast('Failed to create playlist', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePlaylist(config!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      showToast('Playlist deleted', 'success');
      setPendingDelete(null);
    },
    onError: () => showToast('Failed to delete playlist', 'error'),
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Playlists"
        subtitle={`${data?.length ?? 0} playlists`}
        actions={
          <button className="btn-primary" onClick={() => setCreateOpen(true)} type="button">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PlusIcon size={14} /> New
            </span>
          </button>
        }
      />

      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<PlaylistIcon size={28} />}
          title="No playlists yet"
          message="Create your first playlist to organize tracks however you like."
          action={
            <button className="btn-primary" onClick={() => setCreateOpen(true)} type="button">
              Create playlist
            </button>
          }
        />
      )}

      <div className={styles.list}>
        {data?.map((p) => {
          const cover = config && p.coverArt ? coverArtUrl(config, p.coverArt, 80) : '';
          return (
            <div
              key={p.id}
              className={styles.row}
              onClick={() => navigate(`/playlist/${p.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/playlist/${p.id}`)}
            >
              <div className={styles.cover}>
                {cover ? <img src={cover} alt="" loading="lazy" /> : <PlaylistIcon size={16} />}
              </div>
              <div className={styles.titleCol}>
                <div className={styles.title}>{p.name}</div>
                <div className={styles.subtitle}>
                  {p.songCount} tracks · {formatLongDuration(p.duration)}
                </div>
              </div>
              <div className={styles.cell}>{formatDate(p.created)}</div>
              <div className={styles.cell}>{p.public ? 'Public' : 'Private'}</div>
              <button
                className={styles.delete}
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(p.id);
                }}
                aria-label="Delete playlist"
                type="button"
              >
                <TrashIcon size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New playlist"
        actions={
          <>
            <button className="btn-ghost" onClick={() => setCreateOpen(false)} type="button">
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!newName.trim() || createMut.isPending}
              onClick={() => createMut.mutate(newName.trim())}
              type="button"
            >
              Create
            </button>
          </>
        }
      >
        <input
          autoFocus
          className="input"
          placeholder="Playlist name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && newName.trim() && createMut.mutate(newName.trim())}
        />
      </Modal>

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete playlist?"
        actions={
          <>
            <button className="btn-ghost" onClick={() => setPendingDelete(null)} type="button">
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={() => pendingDelete && deleteMut.mutate(pendingDelete)}
              type="button"
              style={{ background: 'var(--accent)' }}
            >
              Delete
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          This action can't be undone.
        </p>
      </Modal>
    </div>
  );
}
