export type GamePhase =
  | 'LOBBY'
  | 'SONG_INPUT'
  | 'PRESENTATION_AND_VOTING'
  | 'VOTE_REVEAL'
  | 'SECRET_REVEAL'
  | 'ROUND_END';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isPresenter: boolean;
  score: number;
  connected: boolean;
  lastActive: number;
}

export interface Song {
  id: string;
  index: number; // 0, 1, 2, 3
  label: 'A' | 'B' | 'C' | 'D';
  title: string;
  artist: string;
  comment?: string;
  url?: string;
  genre?: string;
}

export interface VoteInfo {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  songIndex: number;
}

export interface RoundData {
  roundNumber: number;
  presenterId: string;
  presenterName: string;
  presenterAvatar: string;
  songs: Song[];
  secretDislikedIndex?: number | null; // Sanitized on server if not presenter or not revealed
  secretEpisode?: string;
  votes: Record<string, number>; // playerId -> songIndex (0..3)
  votingClosed: boolean;
  isSecretRevealed: boolean;
  correctVoters: string[]; // playerIds
  dislikedSong?: Song | null;
}

export interface Reaction {
  id: string;
  emoji: string;
  senderName: string;
  timestamp: number;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  players: Player[];
  currentRound: RoundData;
  roundHistory: {
    roundNumber: number;
    presenterName: string;
    dislikedSongTitle: string;
    dislikedArtist: string;
    dislikedLabel: string;
    episode: string;
    correctCount: number;
    totalVoters: number;
  }[];
  reactions: Reaction[];
}

export type ClientMessage =
  | { type: 'join'; roomCode: string; playerId: string; name: string; avatar: string; isHost?: boolean }
  | { type: 'select_presenter'; presenterId: string }
  | { type: 'start_song_input' }
  | { type: 'submit_songs'; songs: { title: string; artist: string; comment?: string; url?: string }[]; secretDislikedIndex: number; secretEpisode: string }
  | { type: 'submit_vote'; songIndex: number }
  | { type: 'close_voting' }
  | { type: 'reveal_votes' }
  | { type: 'reveal_secret' }
  | { type: 'next_round'; nextPresenterId?: string }
  | { type: 'reset_game' }
  | { type: 'send_reaction'; emoji: string }
  | { type: 'simulate_players'; count: number }
  | { type: 'simulate_votes' }
  | { type: 'kick_player'; playerId: string }
  | { type: 'leave_room' };

export type ServerMessage =
  | { type: 'room_state'; state: RoomState; isPresenterForThisClient?: boolean; myVotedSongIndex?: number | null }
  | { type: 'reaction_broadcast'; reaction: Reaction }
  | { type: 'error'; message: string };
