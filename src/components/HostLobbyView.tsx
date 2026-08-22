import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Player } from '../types';
import { Users, Play, Sparkles, Bot, Copy, Check, Info, Music2 } from 'lucide-react';
import { playClickSound, playFanfare } from '../utils/audio';

interface HostLobbyViewProps {
  roomCode: string;
  players: Player[];
  onSelectPresenter: (presenterId: string) => void;
  onSimulatePlayers: (count: number) => void;
  onKickPlayer?: (playerId: string) => void;
}

export const HostLobbyView: React.FC<HostLobbyViewProps> = ({
  roomCode,
  players,
  onSelectPresenter,
  onSimulatePlayers,
  onKickPlayer,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [selectedPresenterId, setSelectedPresenterId] = React.useState<string>('');

  const joinUrl = `${window.location.origin}?room=${roomCode}&role=player`;
  const guestPlayers = players.filter((p) => !p.isHost && p.connected);
  const presenterCandidates = guestPlayers.length > 0 ? guestPlayers : players.filter((p) => p.connected);

  const handleCopy = () => {
    playClickSound();
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStartWithPresenter = (presenterId: string) => {
    playFanfare();
    onSelectPresenter(presenterId);
  };

  const handleRandomPresenter = () => {
    if (presenterCandidates.length === 0) return;
    const randomIndex = Math.floor(Math.random() * presenterCandidates.length);
    const chosen = presenterCandidates[randomIndex];
    handleStartWithPresenter(chosen.id);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Hero Banner with Retro Pop styling */}
      <div className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6 sm:p-8 relative overflow-hidden">
        {/* Decorative background note shapes */}
        <div className="absolute -right-8 -bottom-10 text-[140px] text-[#3EE0CF]/20 font-black select-none pointer-events-none">
          ♪
        </div>
        <div className="absolute right-36 -top-6 text-[90px] text-[#FF8F66]/20 font-black select-none pointer-events-none">
          ♫
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 bg-[#FF8F66] text-white text-xs font-black px-3 py-1 rounded-full border-[2px] border-[#38312E] shadow-[1px_2px_0_#565550] mb-3">
              <Sparkles size={14} />
              Google Meet 画面共有パーティゲーム
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-[900] text-[#38312E] tracking-tight leading-tight">
              4曲の中に潜む
              <span className="text-[#FF8F66] block sm:inline ml-1">
                『実は苦手な1曲』
              </span>
              を当てろ！
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#38312E]/90 leading-relaxed font-bold">
              出題者が紹介する4つの楽曲の中に、実は1曲だけ「本当は苦手・トラウマ・昔の失恋曲」が混ざっています。
              みんなでプレゼンと曲を聴いて推理し、見破りましょう！
            </p>
          </div>

          {/* Quick Meet Tips Card */}
          <div className="bg-[#D1DBC7] border-[3px] border-[#38312E] rounded-[16px] p-5 shadow-[4px_5px_0_#565550] w-full md:w-84 shrink-0">
            <div className="flex items-center gap-2 font-[900] text-sm text-[#38312E] mb-2">
              <Info size={16} className="text-[#FF8F66]" />
              ホストのMeet画面共有手順
            </div>
            <ul className="text-xs text-[#38312E] space-y-1.5 list-disc list-inside font-bold">
              <li>この画面をMeetで画面共有してください</li>
              <li>参加者はQRコードからスマホ等で入室します</li>
              <li>楽曲はYouTube/Spotify等をMeetのタブ音声共有で流せばOK！</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Grid: QR Join Section + Participants Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left: Join QR Code & Room details (5 cols) */}
        <div className="lg:col-span-5 bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6 flex flex-col items-center justify-between text-center">
          <div className="w-full">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-widest text-[#38312E]/70">
                ROOM CODE
              </span>
            </div>
            <div className="inline-block bg-[#3EE0CF] border-[3px] border-[#38312E] rounded-[16px] px-8 py-2.5 shadow-[4px_5px_0_#565550] mb-5">
              <span className="text-3xl sm:text-4xl font-[900] tracking-widest text-[#38312E]">
                {roomCode}
              </span>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] inline-block mb-4">
              <QRCodeSVG
                value={joinUrl}
                size={180}
                level="M"
                includeMargin={false}
                fgColor="#38312E"
              />
            </div>

            <p className="text-xs font-black text-[#38312E] mb-3">
              📱 スマホのカメラでQRコードを読み取って参加！
            </p>

            {/* Join Link with Copy button */}
            <div className="flex items-center gap-2 w-full max-w-sm mx-auto mb-2">
              <input
                type="text"
                readOnly
                value={joinUrl}
                className="w-full text-xs bg-white border-[2px] border-[#38312E] rounded-[10px] px-3 py-2.5 text-[#38312E] select-all font-mono truncate font-bold"
              />
              <button
                onClick={handleCopy}
                className="bg-[#3EE0CF] hover:bg-[#32cebd] text-[#38312E] border-[2px] border-[#38312E] rounded-[10px] shadow-[2px_3px_0_#565550] font-black text-xs py-2.5 px-3.5 shrink-0 cursor-pointer flex items-center gap-1"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? '完了' : 'コピー'}
              </button>
            </div>
          </div>

          {/* Simulate Bot Players Helper */}
          <div className="mt-4 pt-4 border-t-[2px] border-[#38312E]/20 w-full flex items-center justify-between">
            <span className="text-xs font-black text-[#38312E]/70">
              テスト・デモ用:
            </span>
            <button
              onClick={() => {
                playClickSound();
                onSimulatePlayers(3);
              }}
              className="bg-[#ECE8DA] hover:bg-[#D1DBC7] border-[2px] border-[#38312E] rounded-[10px] shadow-[2px_2px_0_#565550] text-xs py-1.5 px-3 min-h-[34px] font-bold text-[#38312E] flex items-center gap-1.5 cursor-pointer"
            >
              <Bot size={14} className="text-[#FF8F66]" />
              ボットを3人追加
            </button>
          </div>
        </div>

        {/* Right: Participant Roster & Start Game Controls (7 cols) */}
        <div className="lg:col-span-7 bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FF8F66] border-[2px] border-[#38312E] flex items-center justify-center font-black text-white shadow-[2px_2px_0_#565550]">
                  <Users size={18} />
                </div>
                <h3 className="text-xl font-[900] text-[#38312E]">
                  参加者リスト
                </h3>
                <span className="bg-[#3EE0CF] text-[#38312E] text-xs font-[900] px-3 py-0.5 rounded-full border-[2px] border-[#38312E] shadow-[1px_1px_0_#565550]">
                  {players.length} 名入室中
                </span>
              </div>
            </div>

            {/* Players Grid */}
            {players.length === 0 ? (
              <div className="text-center py-12 bg-[#ECE8DA] border-[2px] border-dashed border-[#38312E]/40 rounded-2xl">
                <Music2 size={36} className="mx-auto text-[#38312E]/40 mb-2 animate-bounce" />
                <p className="font-black text-[#38312E]">
                  参加者の入室を待っています…
                </p>
                <p className="text-xs font-bold text-[#38312E]/70 mt-1">
                  QRコードを読み込むか、URLを共有して参加してください
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {players.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPresenterId(player.id)}
                    className={`p-3 rounded-xl border-[2px] border-[#38312E] transition-all cursor-pointer flex items-center justify-between ${
                      selectedPresenterId === player.id
                        ? 'bg-[#3EE0CF] shadow-[3px_4px_0_#565550] translate-x-0.5'
                        : 'bg-white shadow-[2px_3px_0_#565550] hover:bg-[#ECE8DA]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#ECE8DA] border-[2px] border-[#38312E] flex items-center justify-center text-xl shadow-[1px_2px_0_#565550]">
                        {player.avatar}
                      </div>
                      <div>
                        <div className="font-[900] text-sm text-[#38312E] flex items-center gap-1.5">
                          {player.name}
                          {player.isHost && (
                            <span className="text-[10px] bg-[#38312E] text-white px-1.5 py-0.2 rounded font-bold">
                              HOST
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#38312E]/70 font-bold">
                          スコア: {player.score} pt
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {selectedPresenterId === player.id ? (
                        <span className="text-xs font-black bg-[#38312E] text-white px-2 py-0.5 rounded-md">
                          出題者に選択中
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#38312E]/70 font-bold hover:underline">
                          出題者に選ぶ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Start Actions */}
          <div className="mt-6 pt-4 border-t-[3px] border-[#38312E] space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                disabled={players.length === 0}
                onClick={() => {
                  const target =
                    selectedPresenterId ||
                    (presenterCandidates[0] ? presenterCandidates[0].id : '');
                  if (target) handleStartWithPresenter(target);
                }}
                className="bg-[#3EE0CF] hover:bg-[#32cebd] text-[#38312E] border-[3px] border-[#38312E] rounded-[12px] shadow-[4px_5px_0_#565550] w-full sm:flex-1 text-base py-3.5 font-[900] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play size={20} className="fill-current" />
                {selectedPresenterId
                  ? `「${players.find((p) => p.id === selectedPresenterId)?.name}」を出題者にして開始！`
                  : '出題者を選んでゲーム開始！'}
              </button>

              <button
                disabled={players.length === 0}
                onClick={handleRandomPresenter}
                className="bg-[#FF8F66] hover:bg-[#f77f52] text-[#38312E] border-[3px] border-[#38312E] rounded-[12px] shadow-[4px_5px_0_#565550] w-full sm:w-auto text-sm py-3.5 px-4 font-[900] shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={16} />
                ランダム決定
              </button>
            </div>
            <p className="text-center text-xs text-[#38312E]/70 font-bold">
              ※ 出題者のスマホに4曲の入力フォームが出ます。ホスト自身を出題者にすると、この画面で入力できます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
