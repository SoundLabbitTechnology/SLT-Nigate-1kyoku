export default function handler(req: { url?: string; method?: string; query?: unknown }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void }) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      status: 'ok',
      probe: true,
      method: req.method || 'GET',
      url: req.url || '',
      query: req.query || null,
    })
  );
}
