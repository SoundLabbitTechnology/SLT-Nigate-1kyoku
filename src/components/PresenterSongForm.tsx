import React, { useState } from 'react';
import { SONG_PRESETS } from '../data/presets';
import { Sparkles, Lock, ArrowRight, Link2, ListMusic, Shuffle } from 'lucide-react';
import { playClickSound } from '../utils/audio';
import { sanitizeSongUrl } from '../utils/songLinks';

interface PresenterSongFormProps {
  onSubmitSongs: (
    songs: { title: string; artist: string; comment?: string; url?: string }[],
    secretDislikedIndex: number,
    secretEpisode: string
  ) => void;
}

type ImportedTrack = { title: string; artist: string; url: string };

function emptySongs() {
  return [
    { title: '', artist: '', comment: '', url: '' },
    { title: '', artist: '', comment: '', url: '' },
    { title: '', artist: '', comment: '', url: '' },
    { title: '', artist: '', comment: '', url: '' },
  ];
}

function sliceWrap<T>(items: T[], start: number, count: number): T[] {
  if (items.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < Math.min(count, items.length); i++) {
    out.push(items[(start + i) % items.length]);
  }
  return out;
}

function shuffled(items: ImportedTrack[]): ImportedTrack[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

export const PresenterSongForm: React.FC<PresenterSongFormProps> = ({ onSubmitSongs }) => {
  const [songsInput, setSongsInput] = useState(emptySongs);
  const [secretIndex, setSecretIndex] = useState<number>(0);
  const [secretEpisode, setSecretEpisode] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [loadedTracks, setLoadedTracks] = useState<ImportedTrack[]>([]);
  const [trackOffset, setTrackOffset] = useState(0);
  const [playlistBusy, setPlaylistBusy] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  const handleApplyPreset = (presetId: string) => {
    playClickSound();
    const preset = SONG_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setSongsInput(
      preset.songs.map((s) => ({
        title: s.title,
        artist: s.artist,
        comment: s.comment || '',
        url: s.url || '',
      }))
    );
    if (typeof preset.dislikedSuggestionIndex === 'number') {
      setSecretIndex(preset.dislikedSuggestionIndex);
    }
    if (preset.sampleEpisode) {
      setSecretEpisode(preset.sampleEpisode);
    }
  };

  const applyTracks = (tracks: ImportedTrack[], offset = 0) => {
    const slice = sliceWrap(tracks, offset, 4);
    setSongsInput(
      emptySongs().map((blank, idx) => {
        const track = slice[idx];
        return track
          ? { title: track.title, artist: track.artist, comment: '', url: track.url }
          : blank;
      })
    );
    setTrackOffset(offset);
    setSelectedPresetId('');
  };

  const handleImportPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playlistBusy) return;
    playClickSound();
    setPlaylistBusy(true);
    setPlaylistError(null);
    try {
      const res = await fetch('/api/spotify/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: playlistUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'プレイリストを読み込めませんでした');
      }
      const tracks = Array.isArray(data?.tracks) ? (data.tracks as ImportedTrack[]) : [];
      if (tracks.length === 0) {
        throw new Error('曲が0件でした。公開プレイリストか確認してください');
      }
      setLoadedTracks(tracks);
      setPlaylistName(typeof data?.name === 'string' ? data.name : 'Spotifyプレイリスト');
      applyTracks(tracks, 0);
    } catch (err) {
      setPlaylistError(err instanceof Error ? err.message : 'プレイリストの読み込みに失敗しました');
    } finally {
      setPlaylistBusy(false);
    }
  };

  const handleSubmitSongs = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    const validSongs = songsInput.map((s, idx) => ({
      title: s.title.trim() || `楽曲 ${['A', 'B', 'C', 'D'][idx]}`,
      artist: s.artist.trim() || 'アーティスト未定',
      comment: s.comment.trim() || '',
      url: sanitizeSongUrl(s.url),
    }));
    onSubmitSongs(validSongs, secretIndex, secretEpisode.trim() || '実は昔からなんとなく苦手でした！');
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleImportPlaylist}
        className="bg-[#ECE8DA] border-2 border-[#38312E] rounded-xl p-3 space-y-2"
      >
        <label className="block text-xs font-black text-[#38312E] flex items-center gap-1">
          <ListMusic size={14} className="text-[#FF8F66]" />
          Spotifyプレイリストから自動入力
        </label>
        <p className="text-[10px] font-bold text-[#38312E]/70 leading-relaxed">
          公開プレイリスト（またはアルバム）のURLを貼ると、曲名・アーティスト・リンクを4枠に入れます。
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="url"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="https://open.spotify.com/playlist/..."
            className="flex-1 min-w-0 text-[11px] bg-white border-2 border-[#38312E] rounded-lg p-2 font-bold"
          />
          <button
            type="submit"
            disabled={playlistBusy}
            className="shrink-0 px-3 py-2 rounded-lg border-2 border-[#38312E] bg-[#3EE0CF] text-[11px] font-black disabled:opacity-60"
          >
            {playlistBusy ? '読込中' : '読み込む'}
          </button>
        </div>
        {playlistError && (
          <p className="text-[11px] font-bold text-[#B42318]">{playlistError}</p>
        )}
        {loadedTracks.length > 0 && !playlistError && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-[#38312E]">
              「{playlistName}」から {Math.min(4, loadedTracks.length)} 曲を入れました（全{loadedTracks.length}曲）
            </p>
            {loadedTracks.length > 4 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    applyTracks(loadedTracks, (trackOffset + 4) % loadedTracks.length);
                  }}
                  className="flex-1 px-2 py-1.5 rounded-lg border-2 border-[#38312E] bg-white text-[11px] font-black flex items-center justify-center gap-1"
                >
                  次の4曲
                  <ArrowRight size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    const next = shuffled(loadedTracks);
                    setLoadedTracks(next);
                    applyTracks(next, 0);
                  }}
                  className="flex-1 px-2 py-1.5 rounded-lg border-2 border-[#38312E] bg-white text-[11px] font-black flex items-center justify-center gap-1"
                >
                  <Shuffle size={12} />
                  シャッフル
                </button>
              </div>
            )}
          </div>
        )}
      </form>

      <div className="bg-[#ECE8DA] border-2 border-[#38312E] rounded-xl p-3">
        <label className="block text-xs font-black text-[#38312E] mb-1.5 flex items-center gap-1">
          <Sparkles size={14} className="text-[#FF8F66]" />
          ワンタップで入力（おすすめプリセット）:
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SONG_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset.id)}
              className={`p-2 rounded-lg border-2 border-[#38312E] text-xs font-bold text-left transition-all ${
                selectedPresetId === preset.id
                  ? 'bg-[#3EE0CF] shadow-[2px_2px_0_#565550]'
                  : 'bg-white hover:bg-[#F1EFE6]'
              }`}
            >
              <div className="font-black text-[#38312E] truncate">{preset.theme}</div>
              <div className="text-[10px] text-[#38312E]/70 truncate">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmitSongs} className="space-y-4">
        {songsInput.map((song, idx) => {
          const label = ['A', 'B', 'C', 'D'][idx];
          const isSecret = secretIndex === idx;

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border-3 border-[#38312E] transition-all ${
                isSecret
                  ? 'bg-[#FF8F66]/20 shadow-[3px_4px_0_#565550]'
                  : 'bg-white shadow-[2px_3px_0_#565550]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm text-[#38312E] flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-md bg-[#38312E] text-white flex items-center justify-center text-xs">
                    {label}
                  </span>
                  第 {idx + 1} 曲目
                </span>
                <label className="flex items-center gap-1.5 text-xs font-black cursor-pointer bg-white px-2 py-1 rounded-md border border-[#38312E]">
                  <input
                    type="radio"
                    name="secretDislike"
                    checked={isSecret}
                    onChange={() => setSecretIndex(idx)}
                    className="accent-[#FF8F66] w-4 h-4 cursor-pointer"
                  />
                  <span className={isSecret ? 'text-[#FF8F66]' : 'text-[#38312E]'}>
                    🔒 実は苦手な曲に設定
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="曲名 (例: マリーゴールド)"
                  value={song.title}
                  onChange={(e) => {
                    const next = [...songsInput];
                    next[idx].title = e.target.value;
                    setSongsInput(next);
                  }}
                  className="w-full text-xs bg-white border-2 border-[#38312E] rounded-lg p-2 font-bold"
                  required
                />
                <input
                  type="text"
                  placeholder="アーティスト (例: あいみょん)"
                  value={song.artist}
                  onChange={(e) => {
                    const next = [...songsInput];
                    next[idx].artist = e.target.value;
                    setSongsInput(next);
                  }}
                  className="w-full text-xs bg-white border-2 border-[#38312E] rounded-lg p-2 font-bold"
                  required
                />
              </div>

              <label className="block text-[10px] font-black text-[#38312E]/70 mb-1 flex items-center gap-1">
                <Link2 size={12} className="text-[#FF8F66]" />
                楽曲リンク（ホストがMeetで再生するために回収します）
              </label>
              <input
                type="text"
                inputMode="url"
                placeholder="YouTube / Spotify などのリンク（任意）"
                value={song.url}
                onChange={(e) => {
                  const next = [...songsInput];
                  next[idx].url = e.target.value;
                  setSongsInput(next);
                }}
                className="w-full text-[11px] bg-white border-2 border-[#38312E] rounded-lg p-2 font-bold mb-2"
              />

              <input
                type="text"
                placeholder="プレゼン時のメモや一言（任意）"
                value={song.comment}
                onChange={(e) => {
                  const next = [...songsInput];
                  next[idx].comment = e.target.value;
                  setSongsInput(next);
                }}
                className="w-full text-[11px] bg-[#F1EFE6] border border-[#38312E] rounded-md p-1.5"
              />
            </div>
          );
        })}

        <div className="p-4 bg-[#ECE8DA] border-3 border-[#38312E] rounded-xl shadow-[2px_3px_0_#565550]">
          <label className="block text-xs font-black text-[#38312E] mb-1 flex items-center gap-1.5">
            <Lock size={14} className="text-[#FF8F66]" />
            苦手な理由・告白エピソード（正解発表時に公開されます）:
          </label>
          <textarea
            rows={2}
            value={secretEpisode}
            onChange={(e) => setSecretEpisode(e.target.value)}
            placeholder="例: カラオケで高すぎて喉が壊れた、昔の失恋の思い出、合宿で無限ループされてトラウマなど"
            className="w-full text-xs bg-white border-2 border-[#38312E] rounded-lg p-2 font-medium"
            required
          />
        </div>

        <button
          type="submit"
          className="vmc-btn-primary w-full text-base py-3 font-black shadow-[4px_5px_0_#565550] flex items-center justify-center gap-2"
        >
          <span>4曲を登録してプレゼン開始！</span>
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
};
