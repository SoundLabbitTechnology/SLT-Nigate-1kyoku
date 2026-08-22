import React from 'react';
import { RoomState, Song } from '../types';
import {
  Music,
  CheckCircle2,
  Lock,
  Sparkles,
  Send,
  HelpCircle,
  Smartphone,
  Eye,
  Flame,
  Volume2,
  Tv,
  ArrowRight,
  Smile,
  AlertCircle
} from 'lucide-react';
import { playClickSound, playVoteSound, playFanfare } from '../utils/audio';
import { PresenterSongForm } from './PresenterSongForm';

interface PlayerViewProps {
  roomState: RoomState;
  myPlayerId: string;
  isPresenter: boolean;
  myVotedSongIndex: number | null;
  onSubmitSongs: (
    songs: { title: string; artist: string; comment?: string }[],
    secretDislikedIndex: number,
    secretEpisode: string
  ) => void;
  onSubmitVote: (songIndex: number) => void;
  onRevealSecret: () => void;
  onSendReaction: (emoji: string) => void;
}

const AVATARS = ['🎸', '🎹', '🎷', '🥁', '🎧', '🎤', '📻', '🎺', '🪕', '🎻', '💿', '🎵'];

const SONG_BUTTON_STYLES = [
  { label: 'A', bg: 'bg-[#3EE0CF]', text: 'text-[#38312E]' },
  { label: 'B', bg: 'bg-[#FF8F66]', text: 'text-[#38312E]' },
  { label: 'C', bg: 'bg-[#D1DBC7]', text: 'text-[#38312E]' },
  { label: 'D', bg: 'bg-[#F3AE8C]', text: 'text-[#38312E]' },
];

export const PlayerView: React.FC<PlayerViewProps> = ({
  roomState,
  myPlayerId,
  isPresenter,
  myVotedSongIndex,
  onSubmitSongs,
  onSubmitVote,
  onRevealSecret,
  onSendReaction,
}) => {
  const myPlayer = roomState.players.find((p) => p.id === myPlayerId);
  const currentRound = roomState.currentRound;
  const phase = roomState.phase;

  const handleVote = (songIndex: number) => {
    playVoteSound();
    onSubmitVote(songIndex);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-5 pb-24">
      {/* Player Header Banner */}
      <div className="vmc-card p-4 bg-[#F1EFE6] flex items-center justify-between shadow-[3px_4px_0_#565550]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#3EE0CF] border-2 border-[#38312E] shadow-[2px_2px_0_#565550] flex items-center justify-center text-2xl">
            {myPlayer?.avatar || '🎵'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base text-[#38312E]">
                {myPlayer?.name || 'ゲスト'}
              </span>
              {isPresenter && (
                <span className="vmc-badge-coral text-[10px] py-0.5 px-2 font-bold">
                  あなたの出題ターン！
                </span>
              )}
            </div>
            <div className="text-xs text-[#38312E]/70 font-bold">
              マイスコア: {myPlayer?.score || 0} pt
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-bold text-[#38312E]/60 uppercase">ROOM</div>
          <div className="font-mono font-black text-sm text-[#38312E] bg-[#ECE8DA] px-2 py-0.5 rounded border border-[#38312E]">
            {roomState.roomCode}
          </div>
        </div>
      </div>

      {/* PHASE 1: LOBBY */}
      {phase === 'LOBBY' && (
        <div className="vmc-card p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#3EE0CF] border-3 border-[#38312E] shadow-[3px_3px_0_#565550] mx-auto flex items-center justify-center text-3xl">
            <Tv size={32} />
          </div>
          <h3 className="text-xl font-black text-[#38312E]">
            待機中：ホストの開始を待っています
          </h3>
          <p className="text-xs text-[#38312E]/80 font-medium">
            ホストがMeet画面で出題者を選択してゲームを開始します。
            画面を共有しているMeetを見て待機してください！
          </p>

          <div className="bg-[#ECE8DA] border-2 border-[#38312E] rounded-xl p-3 text-xs text-[#38312E] font-bold">
            💡 あなたの入室名は「{myPlayer?.name}」です
          </div>
        </div>
      )}

      {/* PHASE 2: SONG INPUT (If I am Presenter vs If I am waiting) */}
      {phase === 'SONG_INPUT' && isPresenter && (
        <div className="vmc-card p-5 sm:p-6 space-y-5">
          <div className="text-center">
            <span className="vmc-badge-coral text-xs mb-1 inline-block">
              出題者のあなたへ
            </span>
            <h3 className="text-2xl font-black text-[#38312E] tracking-tight">
              4つの楽曲と苦手な1曲を登録！
            </h3>
            <p className="text-xs text-[#38312E]/80 mt-1 font-medium">
              3曲の好きな曲と、1曲の「実は苦手な曲」を設定してください。
            </p>
          </div>
          <PresenterSongForm onSubmitSongs={onSubmitSongs} />
        </div>
      )}

      {/* PHASE 2: SONG INPUT (If I am a Voter waiting) */}
      {phase === 'SONG_INPUT' && !isPresenter && (
        <div className="vmc-card p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FF8F66] border-3 border-[#38312E] shadow-[3px_3px_0_#565550] mx-auto flex items-center justify-center text-3xl">
            <Tv size={32} className="text-white animate-pulse" />
          </div>
          <h3 className="text-xl font-black text-[#38312E]">
            出題者【{currentRound.presenterName}さん】が選定中…
          </h3>
          <p className="text-xs text-[#38312E]/80 font-medium leading-relaxed">
            出題者が手元のスマホで4曲を選定しています。
            準備ができ次第、Meet画面に4曲が表示され、あなたの手元で投票ボタンが有効になります！
          </p>

          <div className="p-3 bg-[#3EE0CF]/20 border-2 border-[#38312E] rounded-xl text-xs font-bold text-[#38312E]">
            📺 Meetの共有画面を見て待機してください！
          </div>
        </div>
      )}

      {/* PHASE 3: PRESENTATION & VOTING */}
      {phase === 'PRESENTATION_AND_VOTING' && (
        <div className="space-y-4">
          {/* If I am the Presenter */}
          {isPresenter ? (
            <div className="vmc-card p-6 text-center space-y-4">
              <span className="vmc-badge-aqua text-xs">出題者ビュー</span>
              <h3 className="text-2xl font-black text-[#38312E]">
                Meetで4曲をプレゼンしよう！
              </h3>
              <p className="text-xs text-[#38312E]/80 font-medium">
                4曲の好きなポイントや思い出を語りながら、参加者をうまく騙しましょう！
              </p>

              {/* Presenter's secret reminder card */}
              <div className="bg-[#FF8F66]/20 border-3 border-[#FF8F66] rounded-2xl p-4 text-left shadow-[3px_3px_0_#565550]">
                <div className="text-xs font-black text-[#FF8F66] mb-1 flex items-center gap-1">
                  <Lock size={14} /> あなたが設定した『実は苦手な1曲』:
                </div>
                <div className="text-base font-black text-[#38312E]">
                  【{currentRound.songs[currentRound.secretDislikedIndex ?? 0]?.label}】{' '}
                  {currentRound.songs[currentRound.secretDislikedIndex ?? 0]?.title}
                </div>
                <div className="text-xs text-[#38312E]/80 mt-1 italic">
                  「{currentRound.secretEpisode}」
                </div>
              </div>

              <div className="p-3 bg-[#ECE8DA] border-2 border-[#38312E] rounded-xl text-xs font-bold text-[#38312E]">
                👥 参加者が推理して手元で投票中です。全員の投票が終わったら結果発表に移ります。
              </div>
            </div>
          ) : (
            /* If I am a Voter */
            <div className="vmc-card p-5 sm:p-6 space-y-4">
              <div className="text-center">
                <span className="vmc-badge-coral text-xs mb-1 inline-block">
                  推理投票タイム！
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#38312E]">
                  【{currentRound.presenterName}さん】の苦手な1曲はどれ？
                </h3>
                <p className="text-xs text-[#38312E]/80 mt-1 font-medium">
                  怪しいと思った曲のボタンをタップして投票してください！
                </p>
              </div>

              {/* 4 Big Touch Buttons */}
              <div className="space-y-3">
                {currentRound.songs.map((song, idx) => {
                  const isSelected = myVotedSongIndex === idx;
                  const style = SONG_BUTTON_STYLES[idx] || SONG_BUTTON_STYLES[0];

                  return (
                    <button
                      key={song.id || idx}
                      onClick={() => handleVote(idx)}
                      className={`w-full p-4 rounded-2xl border-3 border-[#38312E] text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#3EE0CF] shadow-[4px_5px_0_#565550] translate-x-1 ring-4 ring-[#3EE0CF]/40'
                          : 'bg-white shadow-[2px_3px_0_#565550] hover:bg-[#ECE8DA] active:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-10 h-10 rounded-xl ${style.bg} border-2 border-[#38312E] flex items-center justify-center font-black text-xl text-[#38312E] shadow-[1px_2px_0_#565550] shrink-0`}
                        >
                          {song.label}
                        </span>
                        <div>
                          <div className="font-black text-base text-[#38312E] line-clamp-1">
                            {song.title}
                          </div>
                          <div className="text-xs font-bold text-[#FF8F66] line-clamp-1">
                            {song.artist}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="flex items-center gap-1 text-xs font-black bg-[#38312E] text-white px-2.5 py-1 rounded-lg">
                          <CheckCircle2 size={14} className="text-[#3EE0CF]" />
                          投票中
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[#38312E]/50">
                          タップで投票
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Voting Confirmation Feedback */}
              {myVotedSongIndex !== null && (
                <div className="p-3 bg-[#3EE0CF]/30 border-2 border-[#38312E] rounded-xl text-center text-xs font-black text-[#38312E] animate-in fade-in">
                  ✅ 【{currentRound.songs[myVotedSongIndex]?.label}】に投票しました！(締切まで変更可能)
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PHASE 4: VOTE REVEAL (Presenter has the big Coming-Out button!) */}
      {phase === 'VOTE_REVEAL' && (
        <div className="vmc-card p-6 text-center space-y-4">
          <span className="vmc-badge-coral text-xs">投票集計完了！</span>
          <h3 className="text-2xl font-black text-[#38312E]">
            みんなの推理が出揃いました！
          </h3>

          {isPresenter ? (
            <div className="space-y-4 pt-2">
              <p className="text-sm font-bold text-[#38312E] leading-relaxed">
                出題者のあなた！下のボタンを押して、Meetの大画面に
                <span className="text-[#FF8F66]">「実はこれが苦手！」</span>
                とカミングアウトしましょう！
              </p>
              <button
                onClick={() => {
                  playFanfare();
                  onRevealSecret();
                }}
                className="vmc-btn-coral text-lg py-4 px-8 w-full font-black shadow-[5px_6px_0_#565550] animate-bounce flex items-center justify-center gap-2"
              >
                <Sparkles size={24} />
                <span>カミングアウトする！(正解発表)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#38312E]/80 font-medium">
                Meet共有画面で投票の分布が公開されています。
                出題者のカミングアウトを待ちましょう！
              </p>
              <div className="p-3 bg-[#ECE8DA] border-2 border-[#38312E] rounded-xl text-xs font-bold text-[#38312E]">
                📺 Meetの大画面を見てね！
              </div>
            </div>
          )}
        </div>
      )}

      {/* PHASE 5 & ROUND END: SECRET REVEAL */}
      {(phase === 'SECRET_REVEAL' || phase === 'ROUND_END') && (
        <div className="vmc-card p-6 text-center space-y-4">
          <span className="vmc-badge-coral text-xs">正解発表！</span>

          {/* Personal result for voter */}
          {!isPresenter && (
            <div>
              {myVotedSongIndex === currentRound.secretDislikedIndex ? (
                <div className="p-4 bg-[#3EE0CF]/30 border-3 border-[#38312E] rounded-2xl shadow-[3px_4px_0_#565550]">
                  <div className="text-3xl mb-1">🎉</div>
                  <h4 className="text-xl font-black text-[#38312E]">
                    見破り成功！名探偵！
                  </h4>
                  <p className="text-xs font-bold text-emerald-800 mt-1">
                    +100 pt を獲得しました！
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-[#ECE8DA] border-2 border-[#38312E] rounded-2xl shadow-[2px_3px_0_#565550]">
                  <div className="text-3xl mb-1">😅</div>
                  <h4 className="text-lg font-black text-[#38312E]">
                    残念！出題者に騙されました！
                  </h4>
                  <p className="text-xs text-[#38312E]/70 font-semibold mt-1">
                    次のラウンドで見破ろう！
                  </p>
                </div>
              )}
            </div>
          )}

          {/* If presenter */}
          {isPresenter && (
            <div className="p-4 bg-[#3EE0CF]/30 border-3 border-[#38312E] rounded-2xl shadow-[3px_4px_0_#565550]">
              <div className="text-3xl mb-1">👑</div>
              <h4 className="text-xl font-black text-[#38312E]">
                出題お疲れ様でした！
              </h4>
              <p className="text-xs font-bold text-[#38312E] mt-1">
                騙された人数に応じたボーナススコアが加算されました！
              </p>
            </div>
          )}

          <div className="p-3 bg-white border-2 border-[#38312E] rounded-xl text-xs font-bold text-[#38312E]">
            📺 Meetの大画面で告白エピソードと順位をチェック！
          </div>
        </div>
      )}

      {/* Floating Reaction Bar at Bottom */}
      <div className="fixed bottom-3 left-0 right-0 max-w-xl mx-auto px-4 z-40">
        <div className="bg-[#F1EFE6] border-3 border-[#38312E] rounded-2xl p-2 shadow-[4px_5px_0_#565550] flex items-center justify-around gap-1">
          {['👏', '🤣', '🎵', '😱', '🔥', '🤔', '❤️'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                playClickSound();
                onSendReaction(emoji);
              }}
              className="text-2xl p-1.5 rounded-xl hover:bg-[#3EE0CF] hover:scale-125 active:scale-95 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
