import React from 'react';
import { Song, Player } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Music, Volume2, ShieldCheck, ArrowRight, Bot, Users, Sparkles } from 'lucide-react';
import { playClickSound, playVoteSound } from '../utils/audio';

interface HostPresentationVotingViewProps {
  songs: Song[];
  presenterName: string;
  presenterAvatar: string;
  players: Player[];
  votedPlayerIds: string[]; // only list of IDs who have voted, choice is secret!
  onCloseVoting: () => void;
  onSimulateVotes?: () => void;
}

export const HostPresentationVotingView: React.FC<HostPresentationVotingViewProps> = ({
  songs,
  presenterName,
  presenterAvatar,
  players,
  votedPlayerIds,
  onCloseVoting,
  onSimulateVotes,
}) => {
  // Non-presenter voters
  const voters = players.filter((p) => p.name !== presenterName && !p.isHost);
  const eligibleVotersCount = voters.length > 0 ? voters.length : Math.max(players.length - 1, 1);
  const votedCount = votedPlayerIds.length;
  const progressPercent = Math.min(Math.round((votedCount / eligibleVotersCount) * 100), 100);
  const isAllVoted = votedCount >= eligibleVotersCount && eligibleVotersCount > 0;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* 12-Column Main Stage Layout from Artistic Flair */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left 8 Columns: Now Presenting & 2x2 Song Cards Grid */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Now Presenting Header */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#FF8F66] text-white px-4 py-1.5 rounded-full text-xs sm:text-sm font-black border-[2px] border-[#38312E] shadow-[1px_2px_0_#565550] flex items-center gap-1.5 shrink-0">
              <span className="text-base">{presenterAvatar || '🎤'}</span>
              <span>NOW PRESENTING</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-[900] text-[#38312E] tracking-tight">
              {presenterName} さんの「実は苦手な1曲」はどれ？
            </h2>
          </div>

          {/* 2x2 Song Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {songs.map((song, idx) => {
              const numLabel = idx + 1;
              return (
                <div
                  key={song.id || idx}
                  className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[16px] shadow-[5px_6px_0_#565550] p-6 relative flex flex-col justify-between min-h-[180px] transition-all hover:translate-y-[-2px]"
                >
                  {/* Circular Number Badge (Top-Left) */}
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#3EE0CF] border-[3px] border-[#38312E] rounded-full flex items-center justify-center font-[900] text-xl shadow-[2px_2px_0_#565550] text-[#38312E]">
                    {numLabel}
                  </div>

                  <div>
                    {/* Artist in Coral Bold Uppercase */}
                    <p className="text-xs sm:text-sm font-black text-[#FF8F66] uppercase mb-1 tracking-wider">
                      {song.artist}
                    </p>
                    {/* Song Title in Massive Extra-Bold */}
                    <h3 className="text-2xl sm:text-3xl font-[900] leading-tight text-[#38312E] break-words">
                      {song.title}
                    </h3>

                    {/* Presenter comment / pitch memo */}
                    {song.comment && (
                      <div className="mt-3 bg-[#ECE8DA] border-[2px] border-[#38312E] rounded-[10px] p-2.5 text-xs font-bold text-[#38312E] shadow-[1px_2px_0_#565550]">
                        <span className="font-black text-[#FF8F66] mr-1">💬 メモ:</span>
                        {song.comment}
                      </div>
                    )}
                  </div>

                  {/* Footer Protection Note */}
                  <div className="mt-4 pt-3 border-t-[2px] border-[#38312E]/20 flex items-center justify-between text-xs text-[#38312E]/70 font-bold">
                    <span className="flex items-center gap-1 text-[11px]">
                      <ShieldCheck size={14} className="text-emerald-700" />
                      投票内容は結果発表まで完全シークレット
                    </span>
                    <span className="font-mono text-xs font-black">選択肢 [{song.label}]</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Columns: Voting Status Aside & Mini QR */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Status Box in Sage #D1DBC7 */}
          <div className="bg-[#D1DBC7] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-[900] mb-4 flex items-center gap-2 text-[#38312E] tracking-tight">
                <span className="w-3 h-3 bg-[#FF8F66] rounded-full inline-block"></span>
                VOTING STATUS
              </h3>

              {/* Roster list of voters */}
              <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {players
                  .filter((p) => p.name !== presenterName && !p.isHost)
                  .map((player) => {
                    const hasVoted = votedPlayerIds.includes(player.id);
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between bg-[#F1EFE6] p-3 border-[2px] border-[#38312E] rounded-[10px] transition-all ${
                          hasVoted
                            ? 'shadow-[2px_2px_0_#565550]'
                            : 'opacity-75 animate-pulse'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{player.avatar}</span>
                          <span className="font-black text-sm text-[#38312E]">
                            {player.name}
                          </span>
                        </div>

                        {hasVoted ? (
                          <span className="text-[#3EE0CF] font-black text-xs bg-[#38312E] px-2.5 py-1 rounded-[6px] shadow-[1px_1px_0_#565550]">
                            VOTED!
                          </span>
                        ) : (
                          <span className="text-[#38312E] opacity-50 italic text-xs font-bold">
                            Thinking...
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Progress Bar with Neo-Brutalist Border */}
            <div className="mt-6 pt-4 border-t-[2px] border-[#38312E]/20">
              <div className="w-full bg-[#E1DBC5] h-6 border-[3px] border-[#38312E] rounded-full overflow-hidden">
                <div
                  className="bg-[#3EE0CF] h-full border-r-[3px] border-[#38312E] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-center text-xs font-black mt-2 tracking-widest text-[#38312E]">
                {votedCount} / {eligibleVotersCount} PLAYERS VOTED
              </p>
            </div>
          </div>

          {/* Mini QR Join Block */}
          <div className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-4 flex items-center gap-4">
            <div className="w-18 h-18 bg-white border-[2px] border-[#38312E] p-1 rounded-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0_#565550]">
              <QRCodeSVG
                value={`${window.location.origin}?room=${players[0]?.id || 'VMC'}&role=player`}
                size={64}
                bgColor="#FFFFFF"
                fgColor="#38312E"
                level="M"
              />
            </div>
            <div>
              <p className="text-xs font-black text-[#38312E] leading-tight">
                スマホで即投票！
              </p>
              <p className="text-[11px] font-bold text-[#38312E]/70 mt-0.5">
                QRをスキャンして手元から推理
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer Stage Action Bar from Artistic Flair */}
      <footer className="mt-4 pt-4 border-t-[3px] border-[#38312E]/30 flex flex-col sm:flex-row justify-between items-center gap-4 relative">
        <div className="text-xs font-black italic text-[#38312E]/80 flex items-center gap-2">
          <Volume2 size={16} className="text-[#FF8F66]" />
          <span>
            Meet Audio Sharing: <span className="text-[#FF8F66] font-extrabold uppercase">ON</span>
          </span>
          {onSimulateVotes && (
            <button
              onClick={() => {
                playVoteSound();
                onSimulateVotes();
              }}
              className="ml-3 text-xs bg-[#ECE8DA] hover:bg-[#D1DBC7] border-[2px] border-[#38312E] rounded-lg px-2.5 py-1 font-bold text-[#38312E] shadow-[1px_1px_0_#565550] flex items-center gap-1"
            >
              <Bot size={13} className="text-[#FF8F66]" />
              ボット投票
            </button>
          )}
        </div>

        {/* Big Action Button */}
        <button
          onClick={() => {
            playClickSound();
            onCloseVoting();
          }}
          className="bg-[#3EE0CF] hover:bg-[#32cebd] text-[#38312E] px-8 sm:px-12 py-3.5 sm:py-4 border-[3px] border-[#38312E] rounded-[12px] shadow-[4px_5px_0_#565550] text-base sm:text-xl font-[900] tracking-[0.15em] transition-all flex items-center gap-3 cursor-pointer"
        >
          <span>投票を締め切って結果発表へ！</span>
          <ArrowRight size={20} />
        </button>

        {/* Decorative notes on right */}
        <div className="hidden sm:flex gap-1.5 opacity-30 text-2xl select-none font-bold text-[#38312E]">
          <span>♪</span>
          <span className="mt-1">♫</span>
          <span>♪</span>
        </div>
      </footer>
    </div>
  );
};
