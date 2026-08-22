import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Song, Player } from '../types';
import { Sparkles, Trophy, Award, ArrowRight } from 'lucide-react';
import { playSecretRevealSound, playFanfare, playClickSound } from '../utils/audio';
import { SongLinkRow, SongLinksPanel } from './SongLinksPanel';

interface HostSecretRevealViewProps {
  songs: Song[];
  secretDislikedIndex: number;
  secretEpisode: string;
  presenterName: string;
  presenterAvatar: string;
  players: Player[];
  votes: Record<string, number>;
  correctVoterIds: string[];
  onNextRound: () => void;
  onShowScoreboard?: () => void;
}

export const HostSecretRevealView: React.FC<HostSecretRevealViewProps> = ({
  songs,
  secretDislikedIndex,
  secretEpisode,
  presenterName,
  presenterAvatar,
  players,
  votes,
  correctVoterIds,
  onNextRound,
  onShowScoreboard,
}) => {
  const dislikedSong = songs[secretDislikedIndex] || songs[0];
  const correctPlayers = players.filter((p) => correctVoterIds.includes(p.id));
  const wrongVoterCount = Object.keys(votes).length - correctVoterIds.length;
  const presenterEarnedPoints = Math.max(wrongVoterCount, 0) * 50 + 50;

  useEffect(() => {
    // Blast confetti and play sound
    playSecretRevealSound();
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#3EE0CF', '#FF8F66', '#38312E', '#F1EFE6', '#D1DBC7'],
    });

    const timer = setTimeout(() => {
      playFanfare();
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Dramatic Reveal Headline */}
      <div className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Large Decorative Music Notes */}
        <div className="absolute -left-4 -top-6 text-7xl text-[#3EE0CF]/30 font-black select-none pointer-events-none">
          ♪
        </div>
        <div className="absolute -right-4 -bottom-6 text-7xl text-[#FF8F66]/30 font-black select-none pointer-events-none">
          ♫
        </div>

        <div className="inline-flex items-center gap-2 bg-[#FF8F66] text-white font-[900] text-xs sm:text-sm px-4 py-1.5 rounded-full border-[2px] border-[#38312E] shadow-[1px_2px_0_#565550] mb-3 animate-bounce">
          <Sparkles size={16} />
          正解発表 ＆ カミングアウト！
        </div>

        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-[900] text-[#38312E] tracking-tight mb-2 leading-tight">
          実は苦手な1曲は…
          <span className="text-[#FF8F66] block sm:inline ml-2 underline decoration-[#3EE0CF] decoration-4">
            【{dislikedSong?.label || secretDislikedIndex + 1}】 {dislikedSong?.title}
          </span>
          でした！
        </h2>

        <p className="text-base sm:text-lg font-[900] text-[#38312E]/80 mt-1 uppercase tracking-wider">
          ARTIST: {dislikedSong?.artist}
        </p>
      </div>

      <SongLinksPanel songs={songs} compact />

      {/* 4 Songs Grid with Highlighted Secret Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {songs.map((song, idx) => {
          const isDisliked = idx === secretDislikedIndex;
          const voterCount = Object.values(votes).filter((v) => v === idx).length;
          const numLabel = idx + 1;

          return (
            <div
              key={song.id || idx}
              className={`border-[3px] border-[#38312E] rounded-[16px] p-6 relative flex flex-col justify-between min-h-[190px] transition-all duration-300 ${
                isDisliked
                  ? 'bg-[#FF8F66]/25 border-[3px] border-[#38312E] shadow-[6px_8px_0_#38312E] ring-4 ring-[#FF8F66]/40 scale-[1.01]'
                  : 'bg-[#F1EFE6]/70 shadow-[5px_6px_0_#565550] opacity-75'
              }`}
            >
              {/* Giant Dislike Stamp if this is the secret */}
              {isDisliked && (
                <div className="absolute -top-4 -right-3 z-20 bg-[#FF8F66] text-white font-[900] text-xs sm:text-sm px-4 py-1.5 rounded-full border-[2px] border-[#38312E] shadow-[3px_3px_0_#565550] rotate-3 animate-pulse">
                  💥 実は苦手な1曲 (正解)
                </div>
              )}

              {/* Top-Left Circular Badge */}
              <div
                className={`absolute -top-3 -left-3 w-10 h-10 border-[3px] border-[#38312E] rounded-full flex items-center justify-center font-[900] text-xl shadow-[2px_2px_0_#565550] ${
                  isDisliked ? 'bg-[#FF8F66] text-white' : 'bg-[#3EE0CF] text-[#38312E]'
                }`}
              >
                {numLabel}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <span className="font-black text-xs uppercase tracking-wider text-[#FF8F66]">
                    {song.artist}
                  </span>
                  <div className="text-xs font-black bg-[#38312E] text-white px-2.5 py-1 rounded-[8px]">
                    {voterCount} 票
                  </div>
                </div>

                <h3 className="text-2xl sm:text-3xl font-[900] text-[#38312E] tracking-tight leading-tight mb-2 break-words">
                  {song.title}
                </h3>

                {song.comment && (
                  <div className="text-xs font-bold text-[#38312E] bg-[#ECE8DA] p-2.5 rounded-[10px] border-[2px] border-[#38312E] mt-2">
                    <span className="text-[#FF8F66] font-black mr-1">💬 メモ:</span>
                    {song.comment}
                  </div>
                )}
                <SongLinkRow url={song.url} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Secret Confession Episode Card */}
      <div className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-[#3EE0CF] border-[3px] border-[#38312E] shadow-[2px_2px_0_#565550] flex items-center justify-center text-2xl shrink-0">
            {presenterAvatar || '🎙️'}
          </div>
          <div>
            <div className="inline-block bg-[#FF8F66] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full border border-[#38312E]">
              出題者の告白エピソード
            </div>
            <h4 className="text-xl font-[900] text-[#38312E]">
              【{presenterName}さん】が実は苦手な理由
            </h4>
          </div>
        </div>

        {/* Quote Block in Pure Warm Neo-Brutalism */}
        <div className="bg-white border-[3px] border-[#38312E] rounded-[16px] p-5 shadow-[4px_4px_0_#565550] relative">
          <p className="text-base sm:text-lg font-bold text-[#38312E] leading-relaxed italic">
            「{secretEpisode || '特に深い理由はないけれど、なんとなく苦手でした（笑）'}」
          </p>
        </div>
      </div>

      {/* Score and Detective Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Detectives Hall of Fame */}
        <div className="bg-[#D1DBC7] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#3EE0CF] border-[2px] border-[#38312E] flex items-center justify-center font-black text-[#38312E] shadow-[2px_2px_0_#565550]">
              <Trophy size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-[#38312E]/70 uppercase">
                見破り成功
              </div>
              <h4 className="font-[900] text-base text-[#38312E]">
                名探偵メンバー (+100pt)
              </h4>
            </div>
          </div>

          {correctPlayers.length === 0 ? (
            <div className="bg-white/80 border-[2px] border-[#38312E] rounded-xl p-3 text-center text-xs font-bold text-[#38312E]/70">
              誰も見破れませんでした！出題者の完全勝利！
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {correctPlayers.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border-[2px] border-[#38312E] px-3 py-1.5 rounded-xl text-xs font-black text-[#38312E] shadow-[2px_2px_0_#565550] flex items-center gap-1.5"
                >
                  <span>{p.avatar}</span>
                  <span>{p.name}</span>
                  <span className="text-emerald-700 font-black ml-1">+100pt</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Presenter Trickster Bonus Card */}
        <div className="bg-[#ECE8DA] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF8F66] border-[2px] border-[#38312E] flex items-center justify-center font-black text-white shadow-[2px_2px_0_#565550]">
              <Award size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-[#38312E]/70 uppercase">
                出題者ボーナス
              </div>
              <h4 className="font-[900] text-base text-[#38312E]">
                【{presenterName}さん】獲得ポイント
              </h4>
            </div>
          </div>

          <div className="bg-white border-[2px] border-[#38312E] rounded-xl p-3.5 space-y-1.5 text-xs font-bold text-[#38312E] shadow-[2px_2px_0_#565550]">
            <div className="flex justify-between">
              <span>騙した人数:</span>
              <span className="font-black text-[#FF8F66]">{wrongVoterCount} 名</span>
            </div>
            <div className="flex justify-between border-t border-[#38312E]/20 pt-1.5 font-[900] text-sm text-[#38312E]">
              <span>獲得スコア:</span>
              <span className="text-[#3EE0CF] bg-[#38312E] px-2.5 py-0.5 rounded-md">
                +{presenterEarnedPoints} pt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {onShowScoreboard && (
          <button
            onClick={() => {
              playClickSound();
              onShowScoreboard();
            }}
            className="bg-[#ECE8DA] hover:bg-[#D1DBC7] border-[3px] border-[#38312E] rounded-[12px] shadow-[4px_5px_0_#565550] text-sm py-3 px-5 w-full sm:w-auto font-[900] text-[#38312E] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy size={16} className="text-[#FF8F66]" />
            現在の総合スコアボード
          </button>
        )}

        <button
          onClick={() => {
            playClickSound();
            onNextRound();
          }}
          className="bg-[#3EE0CF] hover:bg-[#32cebd] text-[#38312E] text-base py-3.5 px-8 w-full sm:w-auto font-[900] border-[3px] border-[#38312E] rounded-[12px] shadow-[4px_5px_0_#565550] flex items-center justify-center gap-2 ml-auto cursor-pointer"
        >
          <span>次のラウンドへ (出題者を交代)</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
