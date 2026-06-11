import type { Request, Response } from 'express';
import geoip from 'geoip-lite';

const DEFAULT_LANGUAGE = 'es';
const US_LANGUAGE = 'en';

export class PublicController {
  context = async (request: Request, response: Response) => {
    const ip = this.extractIp(request);
    const geo = ip ? geoip.lookup(ip) : null;
    const countryCode = geo?.country ?? null;
    const language = countryCode === 'US' ? US_LANGUAGE : DEFAULT_LANGUAGE;

    response.json({
      ip,
      countryCode,
      language
    });
  };

  private extractIp(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const rawIp = forwarded?.split(',')[0]?.trim() || request.ip || request.socket.remoteAddress || '';
    if (!rawIp) return null;

    return rawIp
      .replace('::ffff:', '')
      .replace('[', '')
      .replace(']', '');
  }
}
