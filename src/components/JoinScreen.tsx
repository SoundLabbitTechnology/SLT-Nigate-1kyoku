import React, { useState } from 'react';
import { Sparkles, Tv, Smartphone, ArrowRight, Music2, Users, Volume2 } from 'lucide-react';
import { playClickSound } from '../utils/audio';

const AVATARS = ['🎸', '🎹', '🎷', '🥁', '🎧', '🎤', '📻', '🎺', '🪕', '🎻', '💿', '🎵'];

interface JoinScreenProps {
  defaultRoomCode?: string;
  initialRole?: 'host' | 'player';
  onHostCreate: (hostName: string, avatar: string) => void;
  onPlayerJoin: (roomCode: string, playerName: string, avatar: string) => void;
  error?: string | null;
  busy?: boolean;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({
  defaultRoomCode = '',
  initialRole,
  onHostCreate,
  onPlayerJoin,
  error = null,
  busy = false,
}) => {
  const [tab, setTab] = useState<'player' | 'host'>(
    initialRole === 'host' ? 'host' : defaultRoomCode ? 'player' : 'player'
  );
  const [roomCode, setRoomCode] = useState(defaultRoomCode);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    playClickSound();
    if (!name.trim()) return;

    if (tab === 'host') {
      onHostCreate(name.trim() || 'ホスト', selectedAvatar);
    } else {
      if (!roomCode.trim()) return;
      onPlayerJoin(roomCode.trim().toUpperCase(), name.trim(), selectedAvatar);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8">
      {/* Brand Hero Card */}
      <div className="vmc-card p-6 sm:p-8 bg-[#F1EFE6] text-center mb-6 relative overflow-hidden">
        {/* Floating notes */}
        <div className="absolute -top-4 -left-2 text-4xl text-[#3EE0CF]/40 select-none pointer-events-none">
          ♪
        </div>
        <div className="absolute -bottom-4 -right-2 text-4xl text-[#FF8F66]/40 select-none pointer-events-none">
          ♫
        </div>

        <div className="w-16 h-16 rounded-2xl bg-[#3EE0CF] border-3 border-[#38312E] shadow-[3px_4px_0_#565550] mx-auto flex items-center justify-center text-3xl mb-3">
          🎵
        </div>

        <span className="vmc-badge-coral text-xs mb-2 inline-block">
          バーチャル音楽部
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#38312E] tracking-tight leading-tight">
          苦手な1曲当てゲーム
        </h1>
        <p className="text-xs sm:text-sm text-[#38312E]/80 mt-2 font-medium">
          出題者の4曲から「実は苦手な1曲」をみんなで推理！Google Meet画面共有で盛り上がるパーティゲーム
        </p>
      </div>

      {/* Mode Switch Tabs */}
      <div className="flex rounded-2xl border-3 border-[#38312E] bg-[#ECE8DA] p-1.5 shadow-[4px_5px_0_#565550] mb-6">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setTab('player');
          }}
          className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
            tab === 'player'
              ? 'bg-[#3EE0CF] text-[#38312E] border-2 border-[#38312E] shadow-[2px_2px_0_#565550]'
              : 'text-[#38312E]/70 hover:text-[#38312E]'
          }`}
        >
          <Smartphone size={16} />
          <span>プレイヤー参加 (スマホ/別タブ)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setTab('host');
          }}
          className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
            tab === 'host'
              ? 'bg-[#FF8F66] text-[#38312E] border-2 border-[#38312E] shadow-[2px_2px_0_#565550]'
              : 'text-[#38312E]/70 hover:text-[#38312E]'
          }`}
        >
          <Tv size={16} />
          <span>ホスト作成 (Meet画面共有用)</span>
        </button>
      </div>

      {/* Form Card */}
      <div className="vmc-card p-6 bg-[#F1EFE6]">
        <form onSubmit={handleJoin} className="space-y-4">
          {/* Room Code input (if player) */}
          {tab === 'player' && (
            <div>
              <label className="block text-xs font-black text-[#38312E] mb-1">
                ルームコード:
              </label>
              <input
                type="text"
                placeholder="4文字のコード (例: BEAT)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
                className="w-full text-center text-lg font-mono uppercase tracking-widest vmc-input font-black"
              />
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="block text-xs font-black text-[#38312E] mb-1">
              ニックネーム:
            </label>
            <input
              type="text"
              placeholder="あなたの名前 (例: たなか)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
              required
              className="w-full text-sm vmc-input font-bold"
            />
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-black text-[#38312E] mb-1.5">
              アイコンを選択:
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedAvatar(av);
                  }}
                  className={`h-11 rounded-xl text-xl border-2 border-[#38312E] flex items-center justify-center transition-all ${
                    selectedAvatar === av
                      ? 'bg-[#3EE0CF] shadow-[2px_3px_0_#565550] scale-105'
                      : 'bg-white hover:bg-[#ECE8DA]'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            {error && (
              <p className="mb-3 text-sm font-bold text-[#C4473A] bg-[#F8D7D0] border-2 border-[#38312E] rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={`w-full text-base py-3.5 font-black flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait ${
                tab === 'host' ? 'vmc-btn-coral' : 'vmc-btn-primary'
              }`}
            >
              <span>
                {busy
                  ? '接続中...'
                  : tab === 'host'
                    ? 'ルームを作成してMeet画面を開く'
                    : 'ルームに入室する'}
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Friendly Footer Note */}
      <div className="mt-6 text-center text-xs text-[#38312E]/70 font-semibold space-y-1">
        <p>🎵 音楽をきっかけに、人がつながる場所。</p>
        <p className="text-[11px]">バーチャル音楽部 公式イベントツール</p>
      </div>
    </div>
  );
};
