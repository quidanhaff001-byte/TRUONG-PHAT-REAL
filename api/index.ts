import type { Request, Response } from 'express';
import app from './app';

export default function handler(req: Request, res: Response) {
  // On Vercel Serverless Function, if the request URL was rewritten without /api,
  // ensure the /api prefix is present so Express routes match correctly.
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}

export { app };


