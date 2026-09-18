import type { NextFunction, Request, Response } from 'express';
import type { RateLimitStore } from '../../../application/ports.js';

const WINDOW_MS = 15 * 60 * 1000;

export function createOtpRequestRateLimit(store: RateLimitStore, clock = () => new Date()) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const now = clock();
    const identity = typeof request.body?.phoneNumber === 'string' ? request.body.phoneNumber.trim() : '';
    const keys = [`ip:${request.ip}`, ...(identity ? [`identity:${identity}`] : [])];
    const limits = keys.map((key) => ({ key, maximum: key.startsWith('ip:') ? 20 : 5 }));
    for (const { key, maximum } of limits) {
      const result = await store.consume({ key, now, windowMs: WINDOW_MS, maximum });
      if (!result.allowed) {
        response.set('Retry-After', String(result.retryAfterSeconds)).status(429).json({ error: 'Too many OTP requests.' });
        return;
      }
    }
    next();
  };
}
