export interface SongPreset {
  id: string;
  theme: string;
  description: string;
  songs: { title: string; artist: string; comment?: string }[];
  dislikedSuggestionIndex?: number;
  sampleEpisode?: string;
}

export const SONG_PRESETS: SongPreset[] = [
  {
    id: 'karaoke-classics',
    theme: '🎤 カラオケ超定番ヒット',
    description: 'みんなが一度は熱唱したことがある国民的ソング4選',
    songs: [
      { title: '怪獣の花唄', artist: 'Vaundy', comment: 'サビの疾走感とシンガロングが最高' },
      { title: 'マリーゴールド', artist: 'あいみょん', comment: '哀愁あるメロディとギターが心地いい' },
      { title: 'Pretender', artist: 'Official髭男dism', comment: '切ない歌詞と超絶ハイトーンボイス' },
      { title: 'ドライフラワー', artist: '優里', comment: 'エモーショナルな歌声と失恋ストーリー' },
    ],
    dislikedSuggestionIndex: 2,
    sampleEpisode: 'サビが高すぎてカラオケで歌おうとすると毎回声帯が爆発するので、聴くだけで喉が痛くなるトラウマ曲です…！',
  },
  {
    id: 'summer-anthems',
    theme: '☀️ 夏のエモソング集',
    description: '夏の海・ドライブ・夕暮れに聴きたくなる名曲たち',
    songs: [
      { title: '青と夏', artist: 'Mrs. GREEN APPLE', comment: '圧倒的青春感とキラキラしたバンドサウンド' },
      { title: '真夏の果実', artist: 'サザンオールスターズ', comment: '波音とアコースティックの極上メロウ' },
      { title: '打上花火', artist: 'DAOKO × 米津玄師', comment: '儚い花火の情景が浮かぶストリングス' },
      { title: '睡蓮花', artist: '湘南乃風', comment: 'タオルを振り回したくなる爆発的夏チューン' },
    ],
    dislikedSuggestionIndex: 3,
    sampleEpisode: '大学のサークル合宿でエンドレスで流され続け、朝までタオルを回させられた悪夢が蘇るからです…！',
  },
  {
    id: 'heisei-nostalgia',
    theme: '📼 平成メガヒット懐メロ',
    description: 'イントロを聴いただけであの頃の思い出が蘇る名曲',
    songs: [
      { title: 'First Love', artist: '宇多田ヒカル', comment: '繊細な息づかいと圧倒的な歌唱表現' },
      { title: 'CHE.R.RY', artist: 'YUI', comment: '甘酸っぱい恋心を歌ったアコースティックポップ' },
      { title: 'TSUNAMI', artist: 'サザンオールスターズ', comment: '時代を超えて愛される壮大なバラード' },
      { title: '天体観測', artist: 'BUMP OF CHICKEN', comment: '疾走するギターリフと少年の物語' },
    ],
    dislikedSuggestionIndex: 1,
    sampleEpisode: '昔の片思いの相手の着信音だったため、今でもイントロのメール着信音が鳴ると心臓がキュッとなります。',
  },
  {
    id: 'midnight-drive',
    theme: '🌙 深夜のチル＆ドライブ',
    description: '夜の首都高や部屋でリラックスして聴きたいシティポップ',
    songs: [
      { title: 'Plastic Love', artist: '竹内まりや', comment: '世界中で再評価された80sシティポップの金字塔' },
      { title: 'Tokyo Flash', artist: 'Vaundy', comment: '洗練されたグルーヴと都会の夜の空気感' },
      { title: '踊り子', artist: 'Vaundy', comment: '中毒性のあるベースラインと浮遊感' },
      { title: 'フライディ・チャイナタウン', artist: '泰葉', comment: 'キレのあるホーンと疾走感溢れるビート' },
    ],
    dislikedSuggestionIndex: 0,
    sampleEpisode: 'おしゃれすぎて自分には敷居が高く感じてしまい、聴いていると落ち着かなくなります（笑）',
  },
];
