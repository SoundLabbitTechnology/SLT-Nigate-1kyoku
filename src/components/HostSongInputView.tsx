import React from 'react';
import { Disc3, Music } from 'lucide-react';
import { PresenterSongForm } from './PresenterSongForm';

interface HostSongInputViewProps {
  presenterName: string;
  presenterAvatar: string;
  isSelfPresenter?: boolean;
  onSubmitSongs?: (
    songs: { title: string; artist: string; comment?: string; url?: string }[],
    secretDislikedIndex: number,
    secretEpisode: string
  ) => void;
}

export const HostSongInputView: React.FC<HostSongInputViewProps> = ({
  presenterName,
  presenterAvatar,
  isSelfPresenter = false,
  onSubmitSongs,
}) => {

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="bg-[#F1EFE6] border-[3px] border-[#38312E] rounded-[20px] shadow-[5px_6px_0_#565550] p-8 sm:p-12 text-center relative overflow-hidden">
        <div className="absolute top-4 left-6 text-3xl animate-bounce text-[#FF8F66]/60">♪</div>
        <div className="absolute bottom-6 right-8 text-4xl animate-bounce text-[#3EE0CF]/80">♫</div>

        <div className="inline-block relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-[24px] bg-[#3EE0CF] border-[3px] border-[#38312E] shadow-[5px_6px_0_#565550] flex items-center justify-center text-5xl">
            {presenterAvatar || '🎸'}
          </div>
          <span className="absolute -bottom-2 -right-2 bg-[#FF8F66] text-white text-xs font-[900] px-3 py-1 rounded-full border-[2px] border-[#38312E] shadow-[2px_2px_0_#565550]">
            出題者
          </span>
        </div>

        <div className="mb-3">
          <span className="bg-[#38312E] text-white text-xs font-[900] px-4 py-1.5 rounded-full border-[2px] border-[#38312E] shadow-[1px_2px_0_#565550] inline-block uppercase tracking-wider">
            楽曲セレクト中
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-[900] text-[#38312E] tracking-tight mb-3">
          【{presenterName}さん】が4曲を選定中…！
        </h2>

        {isSelfPresenter ? (
          <p className="text-sm sm:text-base text-[#38312E]/85 max-w-lg mx-auto mb-6 font-bold leading-relaxed">
            ホスト自身が出題者です。下のフォームで4曲を登録するとプレゼンに進みます。
            Meetで画面共有中なら、苦手曲指定が見えるので共有を止めてから入力してください。
          </p>
        ) : (
          <p className="text-sm sm:text-base text-[#38312E]/85 max-w-lg mx-auto mb-8 font-bold leading-relaxed">
            出題者が手元のスマホで「好きな3曲」と「実は苦手な1曲」をセットしています。
            登録が完了すると、Meet画面に4曲のパネルが表示されます！
          </p>
        )}

        {!isSelfPresenter && (
          <div className="inline-flex items-center justify-center p-6 bg-[#ECE8DA] border-[3px] border-[#38312E] rounded-[16px] shadow-[4px_5px_0_#565550] mb-8">
            <div className="flex items-center gap-4">
              <Disc3 size={48} className="text-[#38312E] animate-spin" style={{ animationDuration: '4s' }} />
              <div className="text-left">
                <div className="font-[900] text-sm text-[#38312E] flex items-center gap-1.5">
                  <Music size={16} className="text-[#FF8F66]" />
                  出題者のターン！
                </div>
                <div className="text-xs text-[#38312E]/70 font-bold">
                  曲を聴きながらプレゼンする準備をしよう
                </div>
              </div>
            </div>
          </div>
        )}

        {isSelfPresenter && onSubmitSongs && (
          <div className="text-left max-w-xl mx-auto">
            <PresenterSongForm onSubmitSongs={onSubmitSongs} />
          </div>
        )}
      </div>
    </div>
  );
};
