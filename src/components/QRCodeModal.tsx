import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Smartphone, Share2, Music } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface QRCodeModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomCode, isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  if (!isOpen) return null;

  const joinUrl = `${window.location.origin}?room=${roomCode}&role=player`;

  const handleCopy = () => {
    playClickSound();
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="vmc-card w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-150">
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
        <div className="text-center mb-5">
          <span className="vmc-badge-coral mb-2">スマホから手軽に参加！</span>
          <h3 className="text-2xl font-black text-[#38312E] tracking-tight">
            ルーム参加QRコード
          </h3>
          <p className="text-sm text-[#38312E]/80 mt-1">
            スマホのカメラでスキャンして即時入室できます
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-5 bg-white border-3 border-[#38312E] rounded-2xl shadow-[4px_5px_0_#565550] mb-5">
          <div className="p-2 bg-white rounded-xl">
            <QRCodeSVG
              value={joinUrl}
              size={190}
              level="M"
              includeMargin={false}
              fgColor="#38312E"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-bold text-[#38312E]/70">ROOM CODE:</span>
            <span className="text-xl font-black tracking-widest text-[#38312E] bg-[#3EE0CF] px-3 py-0.5 rounded-lg border-2 border-[#38312E]">
              {roomCode}
            </span>
          </div>
        </div>

        {/* Direct URL Box */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-[#38312E] mb-1">
            参加用リンク
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={joinUrl}
              className="w-full text-xs bg-white border-2 border-[#38312E] rounded-lg px-2.5 py-2 text-[#38312E] select-all font-mono"
            />
            <button
              onClick={handleCopy}
              className="vmc-btn-primary text-xs py-2 px-3 min-h-[38px]"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'コピー完了' : 'コピー'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#ECE8DA] border-2 border-[#38312E] rounded-xl p-3 text-xs text-[#38312E] space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-[#38312E]">
            <Smartphone size={14} className="text-[#FF8F66]" />
            参加者の遊び方
          </div>
          <p>
            1. スマホでQRコードを開き、ニックネームを入力して参加。
          </p>
          <p>
            2. Meet画面で出題者が紹介する4曲を聴いて、手元で苦手な1曲を推理・投票！
          </p>
        </div>
      </div>
    </div>
  );
};
