import React from 'react';
import { Volume2, VolumeX, QrCode, Copy, Check, Radio } from 'lucide-react';
import { isSoundEnabled, toggleSound, playClickSound } from '../utils/audio';

interface HeaderProps {
  roomCode: string;
  isHost: boolean;
  connected: boolean;
  onOpenQR?: () => void;
  playerCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  isHost,
  connected,
  onOpenQR,
  playerCount = 0,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [soundOn, setSoundOn] = React.useState(isSoundEnabled());

  const handleCopy = () => {
    playClickSound();
    const url = `${window.location.origin}?room=${roomCode}&role=player`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
    if (next) playClickSound();
  };

  return (
    <header className="w-full bg-[#E1DBC5] px-4 py-4 sm:px-8 border-b-[3px] border-[#38312E] select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Title with Artistic Flair */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#3EE0CF] border-[3px] border-[#38312E] rounded-full shadow-[4px_5px_0_#565550] flex items-center justify-center text-2xl shrink-0 font-black">
            ♪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-[900] tracking-tighter leading-none text-[#38312E]">
                バーチャル音楽部
              </h1>
              {isHost && (
                <span className="hidden sm:inline-block bg-[#FF8F66] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full border-[2px] border-[#38312E] shadow-[1px_2px_0_#565550]">
                  HOST STAGE
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest mt-1 text-[#38312E]/80">
              Virtual Music Club // Main Stage
            </p>
          </div>
        </div>

        {/* Room Badges & Actions */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Room Code Badge */}
          {roomCode && (
            <div className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[12px] shadow-[4px_5px_0_#565550] px-4 sm:px-6 py-2 sm:py-2.5 flex items-center gap-3">
              <div>
                <span className="block text-[10px] font-bold uppercase opacity-60 leading-tight">
                  Room Code
                </span>
                <span className="text-lg sm:text-2xl font-black tracking-widest text-[#38312E]">
                  {roomCode}
                </span>
              </div>
              <div className="flex items-center gap-1 border-l-2 border-[#38312E]/30 pl-2">
                <button
                  onClick={handleCopy}
                  title="参加URLをコピー"
                  className="p-1.5 rounded-lg hover:bg-[#ECE8DA] transition-colors text-[#38312E]"
                >
                  {copied ? <Check size={16} className="text-emerald-700 font-bold" /> : <Copy size={16} />}
                </button>
                {onOpenQR && (
                  <button
                    onClick={onOpenQR}
                    title="QRコードを表示"
                    className="p-1.5 rounded-lg hover:bg-[#ECE8DA] transition-colors text-[#38312E]"
                  >
                    <QrCode size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Players Count Badge */}
          <div className="bg-[#FF8F66] border-[3px] border-[#38312E] rounded-[12px] shadow-[4px_5px_0_#565550] px-4 sm:px-6 py-2 sm:py-2.5 text-white flex flex-col justify-center items-center min-w-[70px]">
            <span className="text-lg sm:text-xl font-black leading-tight">{playerCount}</span>
            <span className="text-[10px] font-bold uppercase leading-tight">Players</span>
          </div>

          {/* Sound & Live Status Controls */}
          <div className="flex items-center gap-2 bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[12px] shadow-[4px_5px_0_#565550] px-3 py-2.5">
            <button
              onClick={handleToggleSound}
              title={soundOn ? '効果音ミュート' : '効果音ON'}
              className="p-1 rounded hover:bg-[#ECE8DA] transition-colors text-[#38312E]"
            >
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} className="opacity-50" />}
            </button>
            <div className="flex items-center gap-1 text-[11px] font-black ml-1 border-l-2 border-[#38312E]/30 pl-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="hidden md:inline uppercase text-[10px] text-[#38312E]">
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
