import type { IncomingMessage, ServerResponse } from 'http';
import { activeRoomCount, applyClientMessage, createRoom, getRoomView } from '../lib/engine';
import type { ClientMessage } from '../src/types';

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

  const resource = req.query?.resource ?? req.query?.__path ?? req.query?.path;
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
      const result = applyClientMessage(playerId, message, segments[1]);
      if (result.error && !result.view) {
        return sendJson(res, 400, { error: result.error });
      }
      return sendJson(res, 200, result.view);
    }

    return sendJson(res, 404, {
      error: 'Not found',
      method,
      pathname,
      segments,
      url: req.url,
    });
  } catch (err) {
    return sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
}
