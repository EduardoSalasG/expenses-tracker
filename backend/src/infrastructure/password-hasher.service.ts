import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from '../application/ports.js';

const scrypt = promisify(scryptCallback);

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scrypt(password, salt, 64) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(password: string, passwordHash: string) {
    const [salt, hash] = passwordHash.split(':');
    if (!salt || !hash) return false;

    const derivedKey = await scrypt(password, salt, 64) as Buffer;
    const storedHash = Buffer.from(hash, 'hex');
    if (storedHash.length !== derivedKey.length) return false;
    return timingSafeEqual(storedHash, derivedKey);
  }
}
