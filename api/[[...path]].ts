import { createHttpApp } from '../src/game/httpApp';
import type { IncomingMessage, ServerResponse } from 'http';

export const maxDuration = 60;

const app = createHttpApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res);
}
