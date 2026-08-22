import React from 'react';
import { Player, RoomState } from '../types';
import { Trophy, X, Medal, History, RotateCcw, Award } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  roundHistory: RoomState['roundHistory'];
  isHost: boolean;
  onResetGame?: () => void;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  isOpen,
  onClose,
  players,
  roundHistory,
  isHost,
  onResetGame,
}) => {
  if (!isOpen) return null;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="vmc-card w-full max-w-2xl max-h-[90vh] flex flex-col p-6 relative animate-in fade-in zoom-in duration-150">
        {/* Close Button */}
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-[#38312E] bg-[#F1EFE6] hover:bg-[#FF8F66] transition-colors"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="text-center mb-5 shrink-0">
          <div className="inline-flex items-center gap-1.5 vmc-badge-coral mb-2">
            <Trophy size={14} />
            バーチャル音楽部 ランキング
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-[#38312E] tracking-tight">
            スコアボード ＆ アーカイブ
          </h3>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-6 pr-1">
          {/* Leaderboard Table */}
          <div>
            <h4 className="font-black text-sm text-[#38312E] mb-3 flex items-center gap-2">
              <Medal size={16} className="text-[#FF8F66]" />
              総合順位表
            </h4>
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                const isTop = rank === 1;
                const isSecond = rank === 2;
                const isThird = rank === 3;

                return (
                  <div
                    key={player.id}
                    className={`p-3.5 rounded-xl border-3 border-[#38312E] flex items-center justify-between transition-all ${
                      isTop
                        ? 'bg-[#3EE0CF] shadow-[3px_4px_0_#565550]'
                        : isSecond
                        ? 'bg-[#FF8F66]/30 shadow-[2px_3px_0_#565550]'
                        : isThird
                        ? 'bg-[#D1DBC7] shadow-[2px_3px_0_#565550]'
                        : 'bg-white shadow-[1px_2px_0_#565550]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 font-black text-lg text-center text-[#38312E]">
                        {isTop ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `${rank}位`}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#38312E] flex items-center justify-center text-xl shadow-[1px_1px_0_#565550]">
                        {player.avatar}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-[#38312E]">
                          {player.name}
                        </div>
                        <div className="text-[11px] text-[#38312E]/70 font-semibold">
                          {player.isHost ? 'ホスト' : 'メンバー'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-lg text-[#38312E]">
                        {player.score}
                      </span>
                      <span className="text-xs font-bold text-[#38312E]/70 ml-1">
                        pt
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Round History */}
          {roundHistory.length > 0 && (
            <div>
              <h4 className="font-black text-sm text-[#38312E] mb-3 flex items-center gap-2">
                <History size={16} className="text-[#3EE0CF]" />
                過去の告白履歴
              </h4>
              <div className="space-y-3">
                {roundHistory.map((history) => (
                  <div
                    key={history.roundNumber}
                    className="p-4 bg-[#ECE8DA] border-2 border-[#38312E] rounded-xl shadow-[2px_3px_0_#565550] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-black text-[#38312E]">
                      <span className="bg-[#38312E] text-white px-2 py-0.5 rounded text-[10px]">
                        ROUND {history.roundNumber}
                      </span>
                      <span>出題者: 【{history.presenterName}さん】</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-[#38312E]">
                      <div className="font-black text-sm text-[#FF8F66]">
                        実は苦手な1曲: 【{history.dislikedLabel}】 {history.dislikedSongTitle} ({history.dislikedArtist})
                      </div>
                      <p className="text-[#38312E] italic mt-1 font-medium">
                        「{history.episode}」
                      </p>
                    </div>

                    <div className="text-[11px] text-[#38312E]/80 font-bold flex justify-between">
                      <span>見破った名探偵: {history.correctCount} / {history.totalVoters} 名</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {isHost && onResetGame && (
          <div className="mt-5 pt-4 border-t-2 border-[#38312E]/20 flex justify-between items-center shrink-0">
            <button
              onClick={() => {
                playClickSound();
                if (window.confirm('スコアをリセットして最初からやり直しますか？')) {
                  onResetGame();
                  onClose();
                }
              }}
              className="text-xs text-red-700 hover:underline font-bold flex items-center gap-1"
            >
              <RotateCcw size={12} />
              ゲームとスコアをリセット
            </button>
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="vmc-btn-secondary text-xs py-1.5 px-4"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
