import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomState, Player, Song, GamePhase, ClientMessage, ServerMessage, Reaction } from './src/types';

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
    votes: Map<string, number>; // playerId -> songIndex
    votingClosed: boolean;
    isSecretRevealed: boolean;
    correctVoters: string[];
  };
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
  connections: Map<string, WebSocket>; // playerId -> ws
}

const rooms = new Map<string, InternalRoom>();

const PRESET_AVATARS = ['🎸', '🎹', '🎷', '🥁', '🎧', '🎤', '📻', '🎺', '🪕', '🎻', '💿', '🎵'];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getOrCreateRoom(roomCode: string, hostId?: string): InternalRoom {
  const code = roomCode.toUpperCase().trim();
  let room = rooms.get(code);
  if (!room) {
    room = {
      roomCode: code,
      hostId: hostId || '',
      phase: 'LOBBY',
      players: new Map(),
      currentRound: {
        roundNumber: 1,
        presenterId: '',
        presenterName: '',
        presenterAvatar: '',
        songs: [],
        secretDislikedIndex: null,
        secretEpisode: '',
        votes: new Map(),
        votingClosed: false,
        isSecretRevealed: false,
        correctVoters: [],
      },
      roundHistory: [],
      reactions: [],
      connections: new Map(),
    };
    rooms.set(code, room);
  }
  if (hostId && !room.hostId) {
    room.hostId = hostId;
  }
  return room;
}

function sanitizeRoomStateForPlayer(room: InternalRoom, playerId: string): RoomState {
  const isPresenter = room.currentRound.presenterId === playerId;
  const isSecretRevealed = room.currentRound.isSecretRevealed || room.phase === 'SECRET_REVEAL' || room.phase === 'ROUND_END';
  const isVoteRevealed = isSecretRevealed || room.phase === 'VOTE_REVEAL';

  // Convert votes Map to Record
  const votesRecord: Record<string, number> = {};
  if (isVoteRevealed) {
    room.currentRound.votes.forEach((songIdx, pId) => {
      votesRecord[pId] = songIdx;
    });
  } else {
    // Only disclose if this particular player has voted, but don't show all choices
    room.currentRound.votes.forEach((songIdx, pId) => {
      if (pId === playerId) {
        votesRecord[pId] = songIdx;
      }
    });
  }

  // Find secret song if revealed
  let dislikedSong: Song | null = null;
  if (isSecretRevealed && room.currentRound.secretDislikedIndex !== null && room.currentRound.songs[room.currentRound.secretDislikedIndex]) {
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
      dislikedSong: dislikedSong,
    },
    roundHistory: room.roundHistory,
    reactions: room.reactions.slice(-15),
  };
}

function broadcastRoomState(room: InternalRoom) {
  room.connections.forEach((ws, playerId) => {
    if (ws.readyState === WebSocket.OPEN) {
      const sanitized = sanitizeRoomStateForPlayer(room, playerId);
      const isPresenter = room.currentRound.presenterId === playerId;
      const myVote = room.currentRound.votes.get(playerId) ?? null;
      const msg: ServerMessage = {
        type: 'room_state',
        state: sanitized,
        isPresenterForThisClient: isPresenter,
        myVotedSongIndex: myVote,
      };
      ws.send(JSON.stringify(msg));
    }
  });
}

function broadcastReaction(room: InternalRoom, reaction: Reaction) {
  room.reactions.push(reaction);
  if (room.reactions.length > 30) {
    room.reactions.shift();
  }
  const payload = JSON.stringify({
    type: 'reaction_broadcast',
    reaction,
  });
  room.connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

const isVercel = !!process.env.VERCEL;
const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);

function mountApiRoutes(router: express.Router) {
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  router.post('/rooms/create', (req, res) => {
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }
    const { hostId } = req.body;
    const room = getOrCreateRoom(code, hostId);
    res.json({ roomCode: room.roomCode });
  });

  router.get('/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const playerId = (req.query.playerId as string) || '';
    res.json({ state: sanitizeRoomStateForPlayer(room, playerId) });
  });
}

app.use(express.json());

// Vercel rewrites /api/* onto this function; local dev uses the same /api prefix.
const apiRouter = express.Router();
mountApiRoutes(apiRouter);
app.use('/api', apiRouter);
mountApiRoutes(app);

const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;

        switch (msg.type) {
          case 'join': {
            const { roomCode, playerId, name, avatar, isHost } = msg;
            currentRoomCode = roomCode.toUpperCase().trim();
            currentPlayerId = playerId;
            const room = getOrCreateRoom(currentRoomCode, isHost ? playerId : undefined);

            room.connections.set(playerId, ws);

            const existingPlayer = room.players.get(playerId);
            if (existingPlayer) {
              existingPlayer.connected = true;
              existingPlayer.name = name || existingPlayer.name;
              existingPlayer.avatar = avatar || existingPlayer.avatar;
              existingPlayer.lastActive = Date.now();
              if (isHost) existingPlayer.isHost = true;
            } else {
              const newPlayer: Player = {
                id: playerId,
                name: name || `メンバー ${room.players.size + 1}`,
                avatar: avatar || PRESET_AVATARS[room.players.size % PRESET_AVATARS.length],
                isHost: isHost || (room.players.size === 0 && !room.hostId),
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

            broadcastRoomState(room);
            break;
          }

          case 'select_presenter': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            const presenterId = msg.presenterId;
            const presenter = room.players.get(presenterId);
            if (!presenter) return;

            // Reset all players presenter flag
            room.players.forEach((p) => {
              p.isPresenter = p.id === presenterId;
            });

            room.currentRound.presenterId = presenterId;
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

            broadcastRoomState(room);
            break;
          }

          case 'start_song_input': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;
            room.phase = 'SONG_INPUT';
            broadcastRoomState(room);
            break;
          }

          case 'submit_songs': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

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

            broadcastRoomState(room);
            break;
          }

          case 'submit_vote': {
            if (!currentRoomCode || !currentPlayerId) return;
            const room = rooms.get(currentRoomCode);
            if (!room || room.currentRound.votingClosed) return;
            // Presenter should not vote against themselves
            if (currentPlayerId === room.currentRound.presenterId) return;

            room.currentRound.votes.set(currentPlayerId, msg.songIndex);
            broadcastRoomState(room);
            break;
          }

          case 'close_voting': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            room.currentRound.votingClosed = true;
            room.phase = 'VOTE_REVEAL';
            broadcastRoomState(room);
            break;
          }

          case 'reveal_votes': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            room.currentRound.votingClosed = true;
            room.phase = 'VOTE_REVEAL';
            broadcastRoomState(room);
            break;
          }

          case 'reveal_secret': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            const dislikedIndex = room.currentRound.secretDislikedIndex;
            const correctVoters: string[] = [];

            // Calculate points: voters who guessed correctly get 100 points
            // Presenter gets 50 points for each person they successfully fooled (who guessed wrong)!
            let wrongCount = 0;
            room.currentRound.votes.forEach((songIdx, voterId) => {
              if (songIdx === dislikedIndex) {
                correctVoters.push(voterId);
                const voter = room.players.get(voterId);
                if (voter) {
                  voter.score += 100;
                }
              } else {
                wrongCount++;
              }
            });

            const presenter = room.players.get(room.currentRound.presenterId);
            if (presenter) {
              // 50 points per fooled voter + 50 base bonus
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

            broadcastRoomState(room);
            break;
          }

          case 'next_round': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            // Pick next presenter
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
              roundNumber: room.currentRound.roundNumber + 1,
              presenterId: nextPresenterId || '',
              presenterName: nextPresenter ? nextPresenter.name : '',
              presenterAvatar: nextPresenter ? nextPresenter.avatar : '',
              songs: [],
              secretDislikedIndex: null,
              secretEpisode: '',
              votes: new Map(),
              votingClosed: false,
              isSecretRevealed: false,
              correctVoters: [],
            };

            room.phase = nextPresenterId ? 'SONG_INPUT' : 'LOBBY';
            broadcastRoomState(room);
            break;
          }

          case 'reset_game': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            room.phase = 'LOBBY';
            room.players.forEach((p) => {
              p.score = 0;
              p.isPresenter = false;
            });
            room.currentRound = {
              roundNumber: 1,
              presenterId: '',
              presenterName: '',
              presenterAvatar: '',
              songs: [],
              secretDislikedIndex: null,
              secretEpisode: '',
              votes: new Map(),
              votingClosed: false,
              isSecretRevealed: false,
              correctVoters: [],
            };
            room.roundHistory = [];
            broadcastRoomState(room);
            break;
          }

          case 'send_reaction': {
            if (!currentRoomCode || !currentPlayerId) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;
            const sender = room.players.get(currentPlayerId);
            const reaction: Reaction = {
              id: `${Date.now()}-${Math.random()}`,
              emoji: msg.emoji,
              senderName: sender ? sender.name : 'メンバー',
              timestamp: Date.now(),
            };
            broadcastReaction(room, reaction);
            break;
          }

          case 'simulate_players': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

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
            broadcastRoomState(room);
            break;
          }

          case 'simulate_votes': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room || room.phase !== 'PRESENTATION_AND_VOTING') return;

            room.players.forEach((p) => {
              if (p.id !== room.currentRound.presenterId && p.id.startsWith('bot-')) {
                // Pick a random song index (0..3)
                const randomChoice = Math.floor(Math.random() * 4);
                room.currentRound.votes.set(p.id, randomChoice);
              }
            });
            broadcastRoomState(room);
            break;
          }

          case 'kick_player': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;
            room.players.delete(msg.playerId);
            room.connections.delete(msg.playerId);
            broadcastRoomState(room);
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomCode && currentPlayerId) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          const player = room.players.get(currentPlayerId);
          if (player) {
            player.connected = false;
          }
          room.connections.delete(currentPlayerId);
          broadcastRoomState(room);
        }
      }
    });
  });

async function attachFrontend() {
  if (isVercel) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    return;
  }

  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (!isVercel) {
  attachFrontend()
    .then(() => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`Virtual Music Club server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start local server:', err);
      process.exit(1);
    });
}

export default server;
