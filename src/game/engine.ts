import { RoomState, Player, Song, GamePhase, ClientMessage, Reaction } from '../types';

export interface RoomView {
  state: RoomState;
  isPresenterForThisClient: boolean;
  myVotedSongIndex: number | null;
}

interface InternalRoom {
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  players: Map<string, Player>;
  currentRound: {
    roundNumber: number;
    presenterId: string;
    presenterName: string;
    presenterAvatar: string;
    songs: Song[];
    secretDislikedIndex: number | null;
    secretEpisode: string;
    votes: Map<string, number>;
    votingClosed: boolean;
    isSecretRevealed: boolean;
    correctVoters: string[];
  };
  roundHistory: RoomState['roundHistory'];
  reactions: Reaction[];
}

const rooms = new Map<string, InternalRoom>();
const PRESET_AVATARS = ['🎸', '🎹', '🎷', '🥁', '🎧', '🎤', '📻', '🎺', '🪕', '🎻', '💿', '🎵'];

function emptyRound() {
  return {
    roundNumber: 1,
    presenterId: '',
    presenterName: '',
    presenterAvatar: '',
    songs: [] as Song[],
    secretDislikedIndex: null as number | null,
    secretEpisode: '',
    votes: new Map<string, number>(),
    votingClosed: false,
    isSecretRevealed: false,
    correctVoters: [] as string[],
  };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createRoom(hostId?: string): string {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }
  getOrCreateRoom(code, hostId);
  return code;
}

export function getOrCreateRoom(roomCode: string, hostId?: string): InternalRoom {
  const code = roomCode.toUpperCase().trim();
  let room = rooms.get(code);
  if (!room) {
    room = {
      roomCode: code,
      hostId: hostId || '',
      phase: 'LOBBY',
      players: new Map(),
      currentRound: emptyRound(),
      roundHistory: [],
      reactions: [],
    };
    rooms.set(code, room);
  }
  if (hostId && !room.hostId) {
    room.hostId = hostId;
  }
  return room;
}

export function activeRoomCount(): number {
  return rooms.size;
}

export function getRoomView(roomCode: string, playerId: string): RoomView | null {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) return null;
  return toRoomView(room, playerId);
}

function toRoomView(room: InternalRoom, playerId: string): RoomView {
  return {
    state: sanitizeRoomStateForPlayer(room, playerId),
    isPresenterForThisClient: room.currentRound.presenterId === playerId,
    myVotedSongIndex: room.currentRound.votes.get(playerId) ?? null,
  };
}

function sanitizeRoomStateForPlayer(room: InternalRoom, playerId: string): RoomState {
  const isPresenter = room.currentRound.presenterId === playerId;
  const isSecretRevealed =
    room.currentRound.isSecretRevealed || room.phase === 'SECRET_REVEAL' || room.phase === 'ROUND_END';
  const isVoteRevealed = isSecretRevealed || room.phase === 'VOTE_REVEAL';

  const votesRecord: Record<string, number> = {};
  if (isVoteRevealed) {
    room.currentRound.votes.forEach((songIdx, pId) => {
      votesRecord[pId] = songIdx;
    });
  } else {
    room.currentRound.votes.forEach((songIdx, pId) => {
      if (pId === playerId) {
        votesRecord[pId] = songIdx;
      }
    });
  }

  let dislikedSong: Song | null = null;
  if (
    isSecretRevealed &&
    room.currentRound.secretDislikedIndex !== null &&
    room.currentRound.songs[room.currentRound.secretDislikedIndex]
  ) {
    dislikedSong = room.currentRound.songs[room.currentRound.secretDislikedIndex];
  }

  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    phase: room.phase,
    players: Array.from(room.players.values()),
    currentRound: {
      roundNumber: room.currentRound.roundNumber,
      presenterId: room.currentRound.presenterId,
      presenterName: room.currentRound.presenterName,
      presenterAvatar: room.currentRound.presenterAvatar,
      songs: room.currentRound.songs,
      secretDislikedIndex: isPresenter || isSecretRevealed ? room.currentRound.secretDislikedIndex : null,
      secretEpisode: isPresenter || isSecretRevealed ? room.currentRound.secretEpisode : '',
      votes: votesRecord,
      votingClosed: room.currentRound.votingClosed,
      isSecretRevealed: room.currentRound.isSecretRevealed,
      correctVoters: isSecretRevealed ? room.currentRound.correctVoters : [],
      dislikedSong,
    },
    roundHistory: room.roundHistory,
    reactions: room.reactions.slice(-15),
  };
}

function pushReaction(room: InternalRoom, reaction: Reaction) {
  room.reactions.push(reaction);
  if (room.reactions.length > 30) {
    room.reactions.shift();
  }
}

export function applyClientMessage(
  playerId: string,
  msg: ClientMessage,
  roomCodeHint?: string
): { error?: string; view?: RoomView } {
  let roomCode =
    msg.type === 'join' ? msg.roomCode : roomCodeHint || '';
  roomCode = roomCode.toUpperCase().trim();
  if (!roomCode) {
    return { error: 'ルームコードがありません' };
  }

  if (msg.type === 'join') {
    const room = getOrCreateRoom(roomCode, msg.isHost ? playerId : undefined);
    const existingPlayer = room.players.get(playerId);
    if (existingPlayer) {
      existingPlayer.connected = true;
      existingPlayer.name = msg.name || existingPlayer.name;
      existingPlayer.avatar = msg.avatar || existingPlayer.avatar;
      existingPlayer.lastActive = Date.now();
      if (msg.isHost) existingPlayer.isHost = true;
    } else {
      const newPlayer: Player = {
        id: playerId,
        name: msg.name || `メンバー ${room.players.size + 1}`,
        avatar: msg.avatar || PRESET_AVATARS[room.players.size % PRESET_AVATARS.length],
        isHost: msg.isHost || (room.players.size === 0 && !room.hostId),
        isPresenter: false,
        score: 0,
        connected: true,
        lastActive: Date.now(),
      };
      if (newPlayer.isHost && !room.hostId) {
        room.hostId = playerId;
      }
      room.players.set(playerId, newPlayer);
    }
    return { view: toRoomView(room, playerId) };
  }

  const room = rooms.get(roomCode);
  if (!room) {
    return { error: 'ルームが見つかりません' };
  }

  switch (msg.type) {
    case 'select_presenter': {
      const presenter = room.players.get(msg.presenterId);
      if (!presenter) return { error: '出題者が見つかりません', view: toRoomView(room, playerId) };
      room.players.forEach((p) => {
        p.isPresenter = p.id === msg.presenterId;
      });
      room.currentRound.presenterId = msg.presenterId;
      room.currentRound.presenterName = presenter.name;
      room.currentRound.presenterAvatar = presenter.avatar;
      room.phase = 'SONG_INPUT';
      room.currentRound.songs = [];
      room.currentRound.secretDislikedIndex = null;
      room.currentRound.secretEpisode = '';
      room.currentRound.votes.clear();
      room.currentRound.votingClosed = false;
      room.currentRound.isSecretRevealed = false;
      room.currentRound.correctVoters = [];
      break;
    }
    case 'start_song_input': {
      room.phase = 'SONG_INPUT';
      break;
    }
    case 'submit_songs': {
      const labels: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
      room.currentRound.songs = msg.songs.map((s, idx) => ({
        id: `song-${idx}`,
        index: idx,
        label: labels[idx],
        title: s.title || `楽曲 ${labels[idx]}`,
        artist: s.artist || 'アーティスト未定',
        comment: s.comment || '',
      }));
      room.currentRound.secretDislikedIndex = msg.secretDislikedIndex;
      room.currentRound.secretEpisode = msg.secretEpisode || '特に理由なし';
      room.currentRound.votes.clear();
      room.currentRound.votingClosed = false;
      room.currentRound.isSecretRevealed = false;
      room.currentRound.correctVoters = [];
      room.phase = 'PRESENTATION_AND_VOTING';
      break;
    }
    case 'submit_vote': {
      if (!room.currentRound.votingClosed && playerId !== room.currentRound.presenterId) {
        room.currentRound.votes.set(playerId, msg.songIndex);
      }
      break;
    }
    case 'close_voting':
    case 'reveal_votes': {
      room.currentRound.votingClosed = true;
      room.phase = 'VOTE_REVEAL';
      break;
    }
    case 'reveal_secret': {
      const dislikedIndex = room.currentRound.secretDislikedIndex;
      const correctVoters: string[] = [];
      let wrongCount = 0;
      room.currentRound.votes.forEach((songIdx, voterId) => {
        if (songIdx === dislikedIndex) {
          correctVoters.push(voterId);
          const voter = room.players.get(voterId);
          if (voter) voter.score += 100;
        } else {
          wrongCount++;
        }
      });
      const presenter = room.players.get(room.currentRound.presenterId);
      if (presenter) {
        presenter.score += wrongCount * 50 + 50;
      }
      room.currentRound.correctVoters = correctVoters;
      room.currentRound.isSecretRevealed = true;
      room.phase = 'SECRET_REVEAL';
      const dislikedSong = dislikedIndex !== null ? room.currentRound.songs[dislikedIndex] : null;
      if (dislikedSong) {
        room.roundHistory.unshift({
          roundNumber: room.currentRound.roundNumber,
          presenterName: room.currentRound.presenterName,
          dislikedSongTitle: dislikedSong.title,
          dislikedArtist: dislikedSong.artist,
          dislikedLabel: dislikedSong.label,
          episode: room.currentRound.secretEpisode,
          correctCount: correctVoters.length,
          totalVoters: room.currentRound.votes.size,
        });
      }
      break;
    }
    case 'next_round': {
      const playerList = Array.from(room.players.values()).filter((p) => !p.isHost || room.players.size === 1);
      let nextPresenterId = msg.nextPresenterId;
      if (!nextPresenterId) {
        const currentPresenterIndex = playerList.findIndex((p) => p.id === room.currentRound.presenterId);
        const nextIndex = (currentPresenterIndex + 1) % (playerList.length || 1);
        nextPresenterId = playerList[nextIndex]?.id || '';
      }
      const nextPresenter = room.players.get(nextPresenterId || '');
      room.players.forEach((p) => {
        p.isPresenter = p.id === nextPresenterId;
      });
      room.currentRound = {
        ...emptyRound(),
        roundNumber: room.currentRound.roundNumber + 1,
        presenterId: nextPresenterId || '',
        presenterName: nextPresenter ? nextPresenter.name : '',
        presenterAvatar: nextPresenter ? nextPresenter.avatar : '',
      };
      room.phase = nextPresenterId ? 'SONG_INPUT' : 'LOBBY';
      break;
    }
    case 'reset_game': {
      room.phase = 'LOBBY';
      room.players.forEach((p) => {
        p.score = 0;
        p.isPresenter = false;
      });
      room.currentRound = emptyRound();
      room.roundHistory = [];
      break;
    }
    case 'send_reaction': {
      const sender = room.players.get(playerId);
      pushReaction(room, {
        id: `${Date.now()}-${Math.random()}`,
        emoji: msg.emoji,
        senderName: sender ? sender.name : 'メンバー',
        timestamp: Date.now(),
      });
      break;
    }
    case 'simulate_players': {
      const botNames = ['アオイ 🎸', 'レン 🎹', 'ユウキ 🎷', 'ミサト 🥁', 'タケシ 🎧', 'ソラ 🎤'];
      const count = Math.min(msg.count || 3, 6);
      for (let i = 0; i < count; i++) {
        const botId = `bot-${i + 1}`;
        if (!room.players.has(botId)) {
          room.players.set(botId, {
            id: botId,
            name: botNames[i % botNames.length],
            avatar: PRESET_AVATARS[(i + 3) % PRESET_AVATARS.length],
            isHost: false,
            isPresenter: false,
            score: 0,
            connected: true,
            lastActive: Date.now(),
          });
        }
      }
      break;
    }
    case 'simulate_votes': {
      if (room.phase === 'PRESENTATION_AND_VOTING') {
        room.players.forEach((p) => {
          if (p.id !== room.currentRound.presenterId && p.id.startsWith('bot-')) {
            room.currentRound.votes.set(p.id, Math.floor(Math.random() * 4));
          }
        });
      }
      break;
    }
    case 'kick_player': {
      room.players.delete(msg.playerId);
      break;
    }
  }

  return { view: toRoomView(room, playerId) };
}
