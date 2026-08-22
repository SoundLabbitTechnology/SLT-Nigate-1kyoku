import type { IncomingMessage, ServerResponse } from 'http';
import { activeRoomCount, applyClientMessage, createRoom, getRoomView } from './_lib/engine';
import type { ClientMessage } from '../src/types';

export const maxDuration = 60;

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function pathSegments(req: IncomingMessage & { query?: Record<string, unknown> }): string[] {
  const fromQuery = req.query?.path;
  if (Array.isArray(fromQuery)) {
    return fromQuery.map(String);
  }
  if (typeof fromQuery === 'string' && fromQuery.length > 0) {
    return fromQuery.split('/').filter(Boolean);
  }

  const raw = req.url || '/';
  const pathname = raw.split('?')[0];
  const trimmed = pathname.startsWith('/api') ? pathname.slice(4) : pathname;
  return trimmed.split('/').filter(Boolean);
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
    const segments = pathSegments(req as IncomingMessage & { query?: Record<string, unknown> });
    const method = (req.method || 'GET').toUpperCase();

    if (method === 'GET' && (segments.length === 0 || (segments.length === 1 && segments[0] === 'health'))) {
      return sendJson(res, 200, { status: 'ok', activeRooms: activeRoomCount() });
    }

    if (method === 'POST' && segments[0] === 'rooms' && segments[1] === 'create' && segments.length === 2) {
      const body = await readBody(req);
      const hostId = typeof body?.hostId === 'string' ? body.hostId : undefined;
      return sendJson(res, 200, { roomCode: createRoom(hostId) });
    }

    if (segments[0] === 'rooms' && segments.length === 2) {
      const code = segments[1];
      if (method === 'GET') {
        const query = (req as IncomingMessage & { query?: Record<string, unknown> }).query;
        const playerFromQuery = typeof query?.playerId === 'string' ? query.playerId : '';
        const url = new URL(req.url || '/', 'http://localhost');
        const playerId = playerFromQuery || url.searchParams.get('playerId') || '';
        const view = getRoomView(code, playerId);
        if (!view) {
          return sendJson(res, 404, { error: 'Room not found' });
        }
        return sendJson(res, 200, view);
      }
    }

    if (method === 'POST' && segments[0] === 'rooms' && segments[2] === 'action' && segments.length === 3) {
      const body = await readBody(req);
      const playerId = typeof body?.playerId === 'string' ? body.playerId : '';
      const message = body?.message as ClientMessage | undefined;
      if (!playerId || !message?.type) {
        return sendJson(res, 400, { error: 'playerId と message が必要です' });
      }
      const result = applyClientMessage(playerId, message, segments[1]);
      if (result.error && !result.view) {
        return sendJson(res, 400, { error: result.error });
      }
      return sendJson(res, 200, result.view);
    }

    return sendJson(res, 404, { error: 'Not found', method, segments });
  } catch (err) {
    return sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
}
