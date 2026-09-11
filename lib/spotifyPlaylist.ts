export type ImportedSong = {
  title: string;
  artist: string;
  url: string;
};

export type SpotifyPlaylistImport = {
  name: string;
  sourceType: 'playlist' | 'album';
  tracks: ImportedSong[];
};

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const RESOURCE_RE =
  /(?:open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:embed\/)?(playlist|album)\/|spotify:(playlist|album):)([A-Za-z0-9]+)/i;

type SpotifyResource = { type: 'playlist' | 'album'; id: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

function normalizeText(value: unknown): string {
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
  const match = raw.match(RESOURCE_RE);
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

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'ja,en;q=0.9',
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveResource(rawInput: string): Promise<SpotifyResource> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('SpotifyのプレイリストURLを入力してください');
  }
  if (trimmed.length > 2000) {
    throw new Error('URLが長すぎます');
  }

  const direct = parseSpotifyResource(trimmed);
  if (direct) return direct;

  if (!isShortSpotifyUrl(trimmed)) {
    throw new Error('Spotifyのプレイリスト（またはアルバム）URLを貼ってください');
  }

  const res = await fetchWithTimeout(trimmed, { method: 'GET' });
  const finalUrl = res.url || trimmed;
  let host = '';
  try {
    host = new URL(finalUrl).hostname;
  } catch {
    throw new Error('プレイリストURLを解決できませんでした');
  }
  if (!isAllowedSpotifyHost(host)) {
    throw new Error('Spotify以外のURLは読み込めません');
  }
  const resolved = parseSpotifyResource(finalUrl);
  if (!resolved) {
    throw new Error('公開プレイリストのURLか確認してください');
  }
  return resolved;
}

function trackIdFromUri(uri: unknown): string {
  const text = String(uri || '');
  const match = text.match(/spotify:track:([A-Za-z0-9]+)/i);
  return match ? match[1] : '';
}

function toImportedSong(title: string, artist: string, trackId: string): ImportedSong | null {
  const cleanTitle = normalizeText(title);
  const cleanArtist = normalizeText(artist);
  if (!cleanTitle || !trackId) return null;
  return {
    title: cleanTitle,
    artist: cleanArtist || 'アーティスト未定',
    url: `https://open.spotify.com/track/${trackId}`,
  };
}

function uniqueTracks(tracks: ImportedSong[]): ImportedSong[] {
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
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10_000) {
    return cachedToken.value;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetchWithTimeout('https://accounts.spotify.com/api/token', {
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
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(30, Number(data.expires_in) || 3600) * 1000,
  };
  return cachedToken.value;
}

async function fetchViaWebApi(resource: SpotifyResource): Promise<SpotifyPlaylistImport | null> {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  const headers = { Authorization: `Bearer ${token}` };
  if (resource.type === 'playlist') {
    const res = await fetchWithTimeout(
      `https://api.spotify.com/v1/playlists/${resource.id}?market=JP&fields=name,tracks.items(track(id,name,uri,type,artists(name)))`,
      { headers }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name?: string;
      tracks?: { items?: { track?: { id?: string; name?: string; uri?: string; type?: string; artists?: { name?: string }[] } }[] };
    };
    const tracks = uniqueTracks(
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
    return { name: normalizeText(data.name) || 'Spotifyプレイリスト', sourceType: 'playlist', tracks };
  }

  const res = await fetchWithTimeout(
    `https://api.spotify.com/v1/albums/${resource.id}?market=JP`,
    { headers }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    name?: string;
    tracks?: { items?: { id?: string; name?: string; uri?: string; artists?: { name?: string }[] }[] };
  };
  const tracks = uniqueTracks(
    (data.tracks?.items || [])
      .map((track) => {
        const id = track.id || trackIdFromUri(track.uri);
        const artist = (track.artists || []).map((a) => a.name).filter(Boolean).join(', ');
        return toImportedSong(track.name || '', artist, id);
      })
      .filter((track): track is ImportedSong => Boolean(track))
  );
  if (tracks.length === 0) return null;
  return { name: normalizeText(data.name) || 'Spotifyアルバム', sourceType: 'album', tracks };
}

function findTrackList(node: unknown, depth = 0): unknown[] | null {
  if (!node || depth > 10) return null;
  if (Array.isArray(node)) {
    const first = node.find((item) => item && typeof item === 'object') as { uri?: string; entityType?: string } | undefined;
    if (first && typeof first.uri === 'string' && first.uri.startsWith('spotify:track:')) {
      return node;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.trackList)) {
    const nested = findTrackList(obj.trackList, depth + 1);
    if (nested) return nested;
  }
  for (const value of Object.values(obj)) {
    const found = findTrackList(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function findEntityName(node: unknown, depth = 0): string {
  if (!node || depth > 8 || typeof node !== 'object') return '';
  const obj = node as Record<string, unknown>;
  const entity = obj.entity;
  if (entity && typeof entity === 'object') {
    const name = normalizeText((entity as { name?: unknown; title?: unknown }).name || (entity as { title?: unknown }).title);
    if (name) return name;
  }
  for (const value of Object.values(obj)) {
    const found = findEntityName(value, depth + 1);
    if (found) return found;
  }
  return '';
}

async function fetchViaEmbed(resource: SpotifyResource): Promise<SpotifyPlaylistImport> {
  const embedUrl = `https://open.spotify.com/embed/${resource.type}/${resource.id}`;
  const res = await fetchWithTimeout(embedUrl, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  if (!res.ok) {
    throw new Error('プレイリストを取得できませんでした。公開設定を確認してください');
  }
  const html = await res.text();
  const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/i);
  if (!match) {
    throw new Error('プレイリスト情報を読み取れませんでした。公開プレイリストのURLか確認してください');
  }

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    throw new Error('プレイリスト情報の解析に失敗しました');
  }

  const rawTracks = findTrackList(data) || [];
  const tracks = uniqueTracks(
    rawTracks
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as {
          uri?: string;
          title?: string;
          subtitle?: string;
          name?: string;
          entityType?: string;
        };
        if (row.entityType && row.entityType !== 'track') return null;
        const id = trackIdFromUri(row.uri);
        return toImportedSong(row.title || row.name || '', row.subtitle || '', id);
      })
      .filter((track): track is ImportedSong => Boolean(track))
  );

  if (tracks.length === 0) {
    throw new Error('曲が0件でした。公開プレイリストで、曲が入っているか確認してください');
  }

  return {
    name: findEntityName(data) || (resource.type === 'album' ? 'Spotifyアルバム' : 'Spotifyプレイリスト'),
    sourceType: resource.type,
    tracks,
  };
}

export async function importSpotifyPlaylist(rawUrl: string): Promise<SpotifyPlaylistImport> {
  const resource = await resolveResource(rawUrl);
  try {
    const fromApi = await fetchViaWebApi(resource);
    if (fromApi) return fromApi;
  } catch {
    // Fall through to the public embed page.
  }
  return fetchViaEmbed(resource);
}

export async function importSpotifyPlaylistResponse(
  rawUrl: unknown
): Promise<{ status: number; body: SpotifyPlaylistImport | { error: string } }> {
  const url = typeof rawUrl === 'string' ? rawUrl : '';
  try {
    const body = await importSpotifyPlaylist(url);
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
