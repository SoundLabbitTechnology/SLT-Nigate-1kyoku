import express from 'express';
import { activeRoomCount, applyClientMessage, createRoom, getRoomView } from './engine';
import type { ClientMessage } from '../src/types';

export function createHttpApp() {
  const app = express();
  app.use(express.json());

  const api = express.Router();

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: activeRoomCount() });
  });

  api.post('/rooms/create', (req, res) => {
    const hostId = typeof req.body?.hostId === 'string' ? req.body.hostId : undefined;
    res.json({ roomCode: createRoom(hostId) });
  });

  api.get('/rooms/:code', (req, res) => {
    const playerId = (req.query.playerId as string) || '';
    const view = getRoomView(req.params.code, playerId);
    if (!view) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(view);
  });

  api.post('/rooms/:code/action', (req, res) => {
    const playerId = typeof req.body?.playerId === 'string' ? req.body.playerId : '';
    const message = req.body?.message as ClientMessage | undefined;
    if (!playerId || !message?.type) {
      return res.status(400).json({ error: 'playerId と message が必要です' });
    }
    const result = applyClientMessage(playerId, message, req.params.code);
    if (result.error && !result.view) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.view);
  });

  app.use('/api', api);
  app.use(api);
  return app;
}
