import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Link2 } from 'lucide-react';
import { Song } from '../types';
import { playClickSound } from '../utils/audio';
import { formatSongsLinkDump } from '../utils/songLinks';

interface SongLinkRowProps {
  url?: string;
}

export const SongLinkRow: React.FC<SongLinkRowProps> = ({ url }) => {
  const [copied, setCopied] = useState(false);
  if (!url) {
    return (
      <p className="mt-3 text-[11px] font-bold text-[#38312E]/45">リンク未登録</p>
    );
  }

  const handleCopy = async () => {
    playClickSound();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => playClickSound()}
        className="inline-flex items-center gap-1 bg-[#3EE0CF] border-[2px] border-[#38312E] rounded-lg px-2.5 py-1 text-[11px] font-black text-[#38312E] shadow-[1px_2px_0_#565550]"
      >
        <ExternalLink size={12} />
        開く
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 bg-white border-[2px] border-[#38312E] rounded-lg px-2.5 py-1 text-[11px] font-black text-[#38312E] shadow-[1px_2px_0_#565550]"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'コピー済' : 'コピー'}
      </button>
      <span className="min-w-0 truncate text-[10px] font-bold text-[#38312E]/55">{url}</span>
    </div>
  );
};

interface SongLinksPanelProps {
  songs: Song[];
  compact?: boolean;
}

export const SongLinksPanel: React.FC<SongLinksPanelProps> = ({ songs, compact = false }) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const hasAny = songs.some((song) => !!song.url);

  const handleCopyAll = async () => {
    playClickSound();
    await navigator.clipboard.writeText(formatSongsLinkDump(songs));
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1600);
  };

  return (
    <div
      className={`bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[16px] shadow-[4px_5px_0_#565550] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-[900] text-sm text-[#38312E] flex items-center gap-1.5">
          <Link2 size={15} className="text-[#FF8F66]" />
          楽曲リンク
        </h3>
        <button
          type="button"
          onClick={handleCopyAll}
          className="inline-flex items-center gap-1 bg-white border-[2px] border-[#38312E] rounded-lg px-2.5 py-1 text-[11px] font-black text-[#38312E] shadow-[1px_2px_0_#565550]"
        >
          {copiedAll ? <Check size={12} /> : <Copy size={12} />}
          {copiedAll ? 'コピーした' : '4曲まとめてコピー'}
        </button>
      </div>
      {!hasAny ? (
        <p className="text-[11px] font-bold text-[#38312E]/60">
          出題者がリンクを入れていれば、ここで開いたりまとめてコピーできます。
        </p>
      ) : (
        <ul className="space-y-1.5">
          {songs.map((song, idx) => (
            <li key={song.id || idx} className="text-xs font-bold text-[#38312E]">
              <span className="font-black mr-1">[{song.label}]</span>
              {song.url ? (
                <a
                  href={song.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF8F66] underline break-all"
                >
                  {song.title}
                </a>
              ) : (
                <span className="text-[#38312E]/50">{song.title}（なし）</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
