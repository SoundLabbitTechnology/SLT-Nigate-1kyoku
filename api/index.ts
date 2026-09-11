import type { IncomingMessage, ServerResponse } from 'http';
import type { RoomState, Player, Song, GamePhase, ClientMessage, Reaction } from '../src/types';

type ImportedSong = {
  title: string;
  artist: string;
  url: string;
};

type SpotifyPlaylistImport = {
  name: string;
  sourceType: 'playlist' | 'album';
  tracks: ImportedSong[];
};

type SpotifyResource = { type: 'playlist' | 'album'; id: string };

const SPOTIFY_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SPOTIFY_RESOURCE_RE =
  /(?:open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:embed\/)?(playlist|album)\/|spotify:(playlist|album):)([A-Za-z0-9]+)/i;

let spotifyToken: { value: string; expiresAt: number } | null = null;

function normalizeSpotifyText(value: unknown): string {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAllowedSpotifyHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'open.spotify.com' ||
    host === 'spotify.link' ||
    host === 'spotify.app.link' ||
    host.endsWith('.spotify.com')
  );
}

function parseSpotifyResource(raw: string): SpotifyResource | null {
  const match = raw.match(SPOTIFY_RESOURCE_RE);
  if (!match) return null;
  const type = (match[1] || match[2] || '').toLowerCase();
  if (type !== 'playlist' && type !== 'album') return null;
  return { type, id: match[3] };
}

function isShortSpotifyUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' && isAllowedSpotifyHost(parsed.hostname) && !parseSpotifyResource(raw);
  } catch {
    return false;
  }
}

async function fetchSpotifyWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': SPOTIFY_UA,
        'Accept-Language': 'ja,en;q=0.9',
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveSpotifyResource(rawInput: string): Promise<SpotifyResource> {
  const trimmed = rawInput.trim();
  if (!trimmed) throw new Error('SpotifyのプレイリストURLを入力してください');
  if (trimmed.length > 2000) throw new Error('URLが長すぎます');
  const direct = parseSpotifyResource(trimmed);
  if (direct) return direct;
  if (!isShortSpotifyUrl(trimmed)) {
    throw new Error('Spotifyのプレイリスト（またはアルバム）URLを貼ってください');
  }
  const res = await fetchSpotifyWithTimeout(trimmed, { method: 'GET' });
  const finalUrl = res.url || trimmed;
  let host = '';
  try {
    host = new URL(finalUrl).hostname;
  } catch {
    throw new Error('プレイリストURLを解決できませんでした');
  }
  if (!isAllowedSpotifyHost(host)) throw new Error('Spotify以外のURLは読み込めません');
  const resolved = parseSpotifyResource(finalUrl);
  if (!resolved) throw new Error('公開プレイリストのURLか確認してください');
  return resolved;
}

function trackIdFromUri(uri: unknown): string {
  const match = String(uri || '').match(/spotify:track:([A-Za-z0-9]+)/i);
  return match ? match[1] : '';
}

function toImportedSong(title: string, artist: string, trackId: string): ImportedSong | null {
  const cleanTitle = normalizeSpotifyText(title);
  const cleanArtist = normalizeSpotifyText(artist);
  if (!cleanTitle || !trackId) return null;
  return {
    title: cleanTitle,
    artist: cleanArtist || 'アーティスト未定',
    url: `https://open.spotify.com/track/${trackId}`,
  };
}

function uniqueImportedTracks(tracks: ImportedSong[]): ImportedSong[] {
  const seen = new Set<string>();
  const out: ImportedSong[] = [];
  for (const track of tracks) {
    if (seen.has(track.url)) continue;
    seen.add(track.url);
    out.push(track);
  }
  return out;
}

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  if (spotifyToken && spotifyToken.expiresAt > Date.now() + 10_000) return spotifyToken.value;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetchSpotifyWithTimeout('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  spotifyToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(30, Number(data.expires_in) || 3600) * 1000,
  };
  return spotifyToken.value;
}

async function fetchSpotifyViaWebApi(resource: SpotifyResource): Promise<SpotifyPlaylistImport | null> {
  const token = await getSpotifyAccessToken();
  if (!token) return null;
  const headers = { Authorization: `Bearer ${token}` };
  if (resource.type === 'playlist') {
    const res = await fetchSpotifyWithTimeout(
      `https://api.spotify.com/v1/playlists/${resource.id}?market=JP&fields=name,tracks.items(track(id,name,uri,type,artists(name)))`,
      { headers }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name?: string;
      tracks?: { items?: { track?: { id?: string; name?: string; uri?: string; type?: string; artists?: { name?: string }[] } }[] };
    };
    const tracks = uniqueImportedTracks(
      (data.tracks?.items || [])
        .map((item) => {
          const track = item.track;
          if (!track || track.type === 'episode') return null;
          const id = track.id || trackIdFromUri(track.uri);
          const artist = (track.artists || []).map((a) => a.name).filter(Boolean).join(', ');
          return toImportedSong(track.name || '', artist, id);
        })
        .filter((track): track is ImportedSong => Boolean(track))
    );
    if (tracks.length === 0) return null;
    return { name: normalizeSpotifyText(data.name) || 'Spotifyプレイリスト', sourceType: 'playlist', tracks };
  }

  const res = await fetchSpotifyWithTimeout(`https://api.spotify.com/v1/albums/${resource.id}?market=JP`, { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    name?: string;
    tracks?: { items?: { id?: string; name?: string; uri?: string; artists?: { name?: string }[] }[] };
  };
  const tracks = uniqueImportedTracks(
    (data.tracks?.items || [])
      .map((track) => {
        const id = track.id || trackIdFromUri(track.uri);
        const artist = (track.artists || []).map((a) => a.name).filter(Boolean).join(', ');
        return toImportedSong(track.name || '', artist, id);
      })
      .filter((track): track is ImportedSong => Boolean(track))
  );
  if (tracks.length === 0) return null;
  return { name: normalizeSpotifyText(data.name) || 'Spotifyアルバム', sourceType: 'album', tracks };
}

function findSpotifyTrackList(node: unknown, depth = 0): unknown[] | null {
  if (!node || depth > 10) return null;
  if (Array.isArray(node)) {
    const first = node.find((item) => item && typeof item === 'object') as { uri?: string } | undefined;
    if (first && typeof first.uri === 'string' && first.uri.startsWith('spotify:track:')) return node;
    return null;
  }
  if (typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.trackList)) {
    const nested = findSpotifyTrackList(obj.trackList, depth + 1);
    if (nested) return nested;
  }
  for (const value of Object.values(obj)) {
    const found = findSpotifyTrackList(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function findSpotifyEntityName(node: unknown, depth = 0): string {
  if (!node || depth > 8 || typeof node !== 'object') return '';
  const obj = node as Record<string, unknown>;
  const entity = obj.entity;
  if (entity && typeof entity === 'object') {
    const name = normalizeSpotifyText((entity as { name?: unknown; title?: unknown }).name || (entity as { title?: unknown }).title);
    if (name) return name;
  }
  for (const value of Object.values(obj)) {
    const found = findSpotifyEntityName(value, depth + 1);
    if (found) return found;
  }
  return '';
}

async function fetchSpotifyViaEmbed(resource: SpotifyResource): Promise<SpotifyPlaylistImport> {
  const res = await fetchSpotifyWithTimeout(`https://open.spotify.com/embed/${resource.type}/${resource.id}`, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  if (!res.ok) throw new Error('プレイリストを取得できませんでした。公開設定を確認してください');
  const html = await res.text();
  const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/i);
  if (!match) throw new Error('プレイリスト情報を読み取れませんでした。公開プレイリストのURLか確認してください');
  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    throw new Error('プレイリスト情報の解析に失敗しました');
  }
  const tracks = uniqueImportedTracks(
    (findSpotifyTrackList(data) || [])
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as { uri?: string; title?: string; subtitle?: string; name?: string; entityType?: string };
        if (row.entityType && row.entityType !== 'track') return null;
        return toImportedSong(row.title || row.name || '', row.subtitle || '', trackIdFromUri(row.uri));
      })
      .filter((track): track is ImportedSong => Boolean(track))
  );
  if (tracks.length === 0) {
    throw new Error('曲が0件でした。公開プレイリストで、曲が入っているか確認してください');
  }
  return {
    name: findSpotifyEntityName(data) || (resource.type === 'album' ? 'Spotifyアルバム' : 'Spotifyプレイリスト'),
    sourceType: resource.type,
    tracks,
  };
}

async function importSpotifyPlaylistResponse(
  rawUrl: unknown
): Promise<{ status: number; body: SpotifyPlaylistImport | { error: string } }> {
  const url = typeof rawUrl === 'string' ? rawUrl : '';
  try {
    const resource = await resolveSpotifyResource(url);
    let body: SpotifyPlaylistImport | null = null;
    try {
      body = await fetchSpotifyViaWebApi(resource);
    } catch {
      body = null;
    }
    if (!body) body = await fetchSpotifyViaEmbed(resource);
    return { status: 200, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'プレイリストの読み込みに失敗しました';
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      status: 400,
      body: { error: aborted ? 'Spotifyへの接続がタイムアウトしました' : message },
    };
  }
}

interface RoomView {
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

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function sanitizeSongUrl(raw: unknown): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function createRoom(hostId?: string): string {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }
  getOrCreateRoom(code, hostId);
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

function activeRoomCount(): number {
  return rooms.size;
}

function getRoomView(roomCode: string, playerId: string): RoomView | null {
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

function restoreSnapshot(room: InternalRoom, snapshot: RoomState | undefined, joinerId: string) {
  if (!snapshot || (snapshot.roomCode || '').toUpperCase() !== room.roomCode) return;
  const phaseOrder: RoomState['phase'][] = [
    'LOBBY',
    'SONG_INPUT',
    'PRESENTATION_AND_VOTING',
    'VOTE_REVEAL',
    'SECRET_REVEAL',
    'ROUND_END',
  ];
  const snapRound = snapshot.currentRound?.roundNumber || 1;
  const roomRound = room.currentRound.roundNumber || 1;
  if (snapRound < roomRound) return;

  const incomingRank = phaseOrder.indexOf(snapshot.phase);
  const currentRank = phaseOrder.indexOf(room.phase);
  const newerRound = snapRound > roomRound;
  if (newerRound && snapshot.phase) {
    room.phase = snapshot.phase;
    room.currentRound = emptyRound();
    room.currentRound.roundNumber = snapRound;
  } else if (incomingRank > currentRank) {
    room.phase = snapshot.phase;
  }
  if (snapshot.hostId && !room.hostId) room.hostId = snapshot.hostId;
  if (Array.isArray(snapshot.players)) {
    for (const p of snapshot.players) {
      if (!p?.id) continue;
      const prev = room.players.get(p.id);
      room.players.set(p.id, {
        id: p.id,
        name: p.name || prev?.name || 'メンバー',
        avatar: p.avatar || prev?.avatar || '🎸',
        isHost: p.id === room.hostId,
        isPresenter: Boolean(p.isPresenter),
        score: Math.max(prev?.score || 0, p.score || 0),
        connected: p.id === joinerId ? true : Boolean(prev?.connected || p.connected),
        lastActive: Date.now(),
      });
    }
  }
  const round = snapshot.currentRound;
  if (!round) return;
  if (round.roundNumber) room.currentRound.roundNumber = round.roundNumber;
  if (round.presenterId) {
    room.currentRound.presenterId = round.presenterId;
    room.currentRound.presenterName = round.presenterName || '';
    room.currentRound.presenterAvatar = round.presenterAvatar || '';
  }
  if (Array.isArray(round.songs) && round.songs.length > 0) {
    if (newerRound || room.currentRound.songs.length === 0 || incomingRank >= currentRank) {
      room.currentRound.songs = round.songs;
    }
  }
  if (typeof round.secretDislikedIndex === 'number') {
    room.currentRound.secretDislikedIndex = round.secretDislikedIndex;
  }
  if (round.secretEpisode) room.currentRound.secretEpisode = round.secretEpisode;
  if (round.votes && typeof round.votes === 'object') {
    Object.entries(round.votes).forEach(([id, idx]) => {
      if (typeof idx === 'number' && !room.currentRound.votes.has(id)) {
        room.currentRound.votes.set(id, idx);
      }
    });
  }
  room.currentRound.votingClosed = Boolean(round.votingClosed) || room.currentRound.votingClosed;
  room.currentRound.isSecretRevealed = Boolean(round.isSecretRevealed) || room.currentRound.isSecretRevealed;
  if (Array.isArray(round.correctVoters) && round.correctVoters.length > 0) {
    room.currentRound.correctVoters = round.correctVoters;
  }
  if (Array.isArray(snapshot.roundHistory) && snapshot.roundHistory.length > 0 && room.roundHistory.length === 0) {
    room.roundHistory = snapshot.roundHistory;
  }
}

function pushReaction(room: InternalRoom, reaction: Reaction) {
  room.reactions.push(reaction);
  if (room.reactions.length > 30) {
    room.reactions.shift();
  }
}

function getOrSeedRoom(
  roomCode: string,
  playerId: string,
  snapshot: RoomState | undefined,
  allowEmptyCreate: boolean
): InternalRoom | undefined {
  let room = rooms.get(roomCode);
  if (room) {
    if (snapshot) restoreSnapshot(room, snapshot, playerId);
    return room;
  }
  if (!snapshot && !allowEmptyCreate) return undefined;
  room = getOrCreateRoom(roomCode, playerId);
  if (snapshot) restoreSnapshot(room, snapshot, playerId);
  return room;
}

function applyClientMessage(
  playerId: string,
  msg: ClientMessage,
  roomCodeHint?: string,
  extraSnapshot?: RoomState
): { error?: string; view?: RoomView; closed?: boolean } {
  let roomCode =
    msg.type === 'join' ? msg.roomCode : roomCodeHint || '';
  roomCode = roomCode.toUpperCase().trim();
  if (!roomCode) {
    return { error: 'ルームコードがありません' };
  }
  const snapshot = (msg.type === 'join' ? msg.snapshot : undefined) || extraSnapshot;

  if (msg.type === 'join') {
    const room = getOrSeedRoom(roomCode, playerId, snapshot, Boolean(msg.isHost));
    if (!room) {
      return { error: 'ルームが見つかりません' };
    }
    const claimingHost = Boolean(msg.isHost) && (!room.hostId || room.hostId === playerId);
    if (claimingHost) {
      room.hostId = playerId;
    }
    const existingPlayer = room.players.get(playerId);
    if (existingPlayer) {
      existingPlayer.connected = true;
      existingPlayer.name = msg.name || existingPlayer.name;
      existingPlayer.avatar = msg.avatar || existingPlayer.avatar;
      existingPlayer.lastActive = Date.now();
      existingPlayer.isHost = claimingHost || existingPlayer.id === room.hostId;
    } else {
      const newPlayer: Player = {
        id: playerId,
        name: msg.name || `メンバー ${room.players.size + 1}`,
        avatar: msg.avatar || PRESET_AVATARS[room.players.size % PRESET_AVATARS.length],
        isHost: claimingHost,
        isPresenter: false,
        score: 0,
        connected: true,
        lastActive: Date.now(),
      };
      room.players.set(playerId, newPlayer);
    }
    room.players.forEach((p) => {
      p.isHost = p.id === room.hostId;
    });
    return { view: toRoomView(room, playerId) };
  }

  const room = getOrSeedRoom(roomCode, playerId, snapshot, false);
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
      const incoming = Array.isArray(msg.songs) ? msg.songs.slice(0, 4) : [];
      if (incoming.length === 0) {
        return { error: '楽曲データがありません', view: toRoomView(room, playerId) };
      }
      const labels: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
      room.currentRound.songs = incoming.map((s, idx) => ({
        id: `song-${idx}`,
        index: idx,
        label: labels[idx] || 'A',
        title: s.title || `楽曲 ${labels[idx] || idx + 1}`,
        artist: s.artist || 'アーティスト未定',
        comment: s.comment || '',
        url: sanitizeSongUrl(s.url),
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
      const count = Math.min(msg.count || 3, 16);
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
      room.currentRound.votes.delete(msg.playerId);
      break;
    }
    case 'leave_room': {
      const leaving = room.players.get(playerId);
      const leavingIsHost = Boolean(leaving?.isHost) || room.hostId === playerId;
      room.players.delete(playerId);
      room.currentRound.votes.delete(playerId);
      if (leavingIsHost) {
        rooms.delete(room.roomCode);
        return { closed: true };
      }
      break;
    }
  }

  return { view: toRoomView(room, playerId) };
}

export const maxDuration = 60;

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function originalPath(req: IncomingMessage & { query?: Record<string, unknown> }): string {
  const headerPath =
    req.headers['x-invoke-path'] ||
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-original-url'] ||
    req.headers['x-forwarded-uri'];
  if (typeof headerPath === 'string' && headerPath.length > 0) {
    return headerPath.split('?')[0];
  }

  const resource = req.query?.resource ?? req.query?.path;
  if (typeof resource === 'string' && resource.length > 0) {
    return resource.startsWith('/') ? resource : `/${resource}`;
  }
  if (Array.isArray(resource) && resource.length > 0) {
    return `/${resource.join('/')}`;
  }

  return (req.url || '/').split('?')[0];
}

function segmentsFrom(pathname: string): string[] {
  const trimmed = pathname.startsWith('/api') ? pathname.slice(4) : pathname;
  return trimmed.split('/').filter(Boolean);
}

function playerIdFrom(req: IncomingMessage & { query?: Record<string, unknown> }): string {
  if (typeof req.query?.playerId === 'string') return req.query.playerId;
  try {
    return new URL(req.url || '/', 'http://localhost').searchParams.get('playerId') || '';
  } catch {
    return '';
  }
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const reqWithQuery = req as IncomingMessage & { query?: Record<string, unknown> };
    const pathname = originalPath(reqWithQuery);
    const segments = segmentsFrom(pathname);
    const method = (req.method || 'GET').toUpperCase();

    if (method === 'GET' && (segments.length === 0 || segments[0] === 'health')) {
      return sendJson(res, 200, { status: 'ok', activeRooms: activeRoomCount() });
    }

    if (segments[0] === 'spotify' && segments[1] === 'playlist' && segments.length === 2) {
      let rawUrl: unknown = '';
      if (method === 'GET') {
        rawUrl = reqWithQuery.query?.url;
        if (!rawUrl) {
          try {
            rawUrl = new URL(req.url || '/', 'http://localhost').searchParams.get('url') || '';
          } catch {
            rawUrl = '';
          }
        }
      } else if (method === 'POST') {
        const body = await readBody(req);
        rawUrl = body?.url;
      } else {
        return sendJson(res, 405, { error: 'Method not allowed' });
      }
      const result = await importSpotifyPlaylistResponse(rawUrl);
      return sendJson(res, result.status, result.body);
    }

    if (method === 'POST' && segments[0] === 'rooms' && segments[1] === 'create' && segments.length === 2) {
      const body = await readBody(req);
      const hostId = typeof body?.hostId === 'string' ? body.hostId : undefined;
      return sendJson(res, 200, { roomCode: createRoom(hostId) });
    }

    if (method === 'GET' && segments[0] === 'rooms' && segments.length === 2) {
      const view = getRoomView(segments[1], playerIdFrom(reqWithQuery));
      if (!view) {
        return sendJson(res, 404, { error: 'Room not found' });
      }
      return sendJson(res, 200, view);
    }

    if (method === 'POST' && segments[0] === 'rooms' && segments[2] === 'action' && segments.length === 3) {
      const body = await readBody(req);
      const playerId = typeof body?.playerId === 'string' ? body.playerId : '';
      const message = body?.message as ClientMessage | undefined;
      if (!playerId || !message?.type) {
        return sendJson(res, 400, { error: 'playerId と message が必要です' });
      }
      const result = applyClientMessage(playerId, message, segments[1], body?.snapshot);
      if (result.closed) {
        return sendJson(res, 200, { closed: true });
      }
      if (result.error && !result.view) {
        console.log(`[${segments[1]}] ${message.type}: ${result.error}`);
        return sendJson(res, 400, { error: result.error });
      }
      return sendJson(res, 200, result.view);
    }

    return sendJson(res, 404, { error: 'Not found', method, pathname, segments, url: req.url });
  } catch (err) {
    return sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
}
