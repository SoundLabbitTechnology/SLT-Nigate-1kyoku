import React from 'react';
import { Song, Player } from '../types';
import { Sparkles, Users, Flame, Volume2, ArrowRight } from 'lucide-react';
import { playClickSound, playDrumRoll } from '../utils/audio';
import { SongLinkRow, SongLinksPanel } from './SongLinksPanel';

interface HostVoteRevealViewProps {
  songs: Song[];
  presenterName: string;
  presenterAvatar: string;
  players: Player[];
  votes: Record<string, number>; // playerId -> songIndex (0..3)
  onRevealSecret: () => void;
}

export const HostVoteRevealView: React.FC<HostVoteRevealViewProps> = ({
  songs,
  presenterName,
  presenterAvatar,
  players,
  votes,
  onRevealSecret,
}) => {
  const getVotersForSong = (songIdx: number) => {
    return Object.entries(votes)
      .filter(([_, idx]) => idx === songIdx)
      .map(([pId, _]) => players.find((p) => p.id === pId))
      .filter((p): p is Player => !!p);
  };

  const handleDrumrollAndReveal = () => {
    playDrumRoll();
    setTimeout(() => {
      onRevealSecret();
    }, 1200);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Voting Distribution Revealed */}
      <div className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Decorative background note shapes */}
        <div className="absolute -left-4 -top-6 text-7xl text-[#3EE0CF]/30 font-black select-none pointer-events-none">
          ♪
        </div>
        <div className="absolute -right-4 -bottom-6 text-7xl text-[#FF8F66]/30 font-black select-none pointer-events-none">
          ♫
        </div>

        <div className="inline-flex items-center gap-2 bg-[#FF8F66] text-white text-xs sm:text-sm font-black px-4 py-1.5 rounded-full border-[2px] border-[#38312E] shadow-[1px_2px_0_#565550] mb-3">
          <Sparkles size={15} />
          VOTE COUNT COMPLETED
        </div>

        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-[900] text-[#38312E] tracking-tight leading-tight">
          投票結果オープン！誰がどの曲を疑ったのか…？
        </h2>
        <p className="text-sm sm:text-base text-[#38312E]/80 mt-2 max-w-2xl mx-auto font-bold">
          【{presenterName}さん】が手元のスマホで
          <span className="text-[#FF8F66] font-black underline decoration-2 decoration-[#38312E] mx-1">
            「カミングアウト」
          </span>
          すると、大画面で正解がド派手に発表されます！
        </p>
      </div>

      <SongLinksPanel songs={songs} compact />

      {/* 4 Song Panels with Revealed Voters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {songs.map((song, idx) => {
          const votersForThis = getVotersForSong(idx);
          const voteCount = votersForThis.length;
          const numLabel = idx + 1;

          return (
            <div
              key={song.id || idx}
              className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[16px] shadow-[5px_6px_0_#565550] p-6 relative flex flex-col justify-between min-h-[220px] transition-all"
            >
              {/* Circular Number Badge (Top-Left) */}
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#3EE0CF] border-[3px] border-[#38312E] rounded-full flex items-center justify-center font-[900] text-xl shadow-[2px_2px_0_#565550] text-[#38312E]">
                {numLabel}
              </div>

              <div>
                {/* Header with vote pill */}
                <div className="flex items-center justify-between mb-2 pl-4">
                  <span className="font-black text-xs uppercase tracking-wider text-[#FF8F66]">
                    {song.artist}
                  </span>

                  {/* Vote Count Badge */}
                  <div className="flex items-center gap-1.5 bg-[#38312E] text-white px-3 py-1 rounded-[10px] font-black text-sm shadow-[2px_2px_0_#565550]">
                    <Users size={14} className="text-[#3EE0CF]" />
                    <span>{voteCount} 票</span>
                  </div>
                </div>

                {/* Song Title */}
                <h3 className="text-2xl sm:text-3xl font-[900] text-[#38312E] tracking-tight leading-tight mb-2 break-words">
                  {song.title}
                </h3>
                <SongLinkRow url={song.url} />
              </div>

              {/* Voters Roster for this Song */}
              <div className="mt-4 pt-3 border-t-[2px] border-[#38312E]/20">
                <div className="text-[11px] font-black text-[#38312E]/70 mb-2 uppercase tracking-wider">
                  この曲を推理したメンバー:
                </div>
                {votersForThis.length === 0 ? (
                  <span className="text-xs font-bold text-[#38312E]/40 italic">
                    投票者なし（全員スルー）
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {votersForThis.map((v) => (
                      <span
                        key={v.id}
                        className="inline-flex items-center gap-1.5 bg-white border-[2px] border-[#38312E] px-3 py-1 rounded-[10px] text-xs font-black text-[#38312E] shadow-[1px_2px_0_#565550]"
                      >
                        <span className="text-sm">{v.avatar}</span>
                        <span>{v.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dramatic Action Bar */}
      <div className="bg-[#D1DBC7] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FF8F66] border-[3px] border-[#38312E] shadow-[2px_3px_0_#565550] flex items-center justify-center text-white text-2xl shrink-0">
            <Flame size={24} />
          </div>
          <div>
            <div className="font-[900] text-lg text-[#38312E]">
              いよいよカミングアウト！
            </div>
            <div className="text-xs text-[#38312E]/80 font-bold">
              出題者の手元端末または下のボタンから正解を発表します！
            </div>
          </div>
        </div>

        <button
          onClick={handleDrumrollAndReveal}
          className="bg-[#FF8F66] hover:bg-[#f77f52] text-[#38312E] text-base sm:text-lg py-3.5 px-8 font-[900] border-[3px] border-[#38312E] rounded-[12px] shadow-[4px_5px_0_#565550] flex items-center justify-center gap-2 animate-bounce w-full sm:w-auto cursor-pointer"
        >
          <Sparkles size={20} />
          <span>正解を発表する！(カミングアウト)</span>
        </button>
      </div>
    </div>
  );
};
