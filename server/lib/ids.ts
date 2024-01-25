import base from 'base-x';
import secureRandom from 'secure-random';
import {Buffer} from 'buffer';
import {v4 as uuidv4} from 'uuid';

const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

export function uuid(): string {
  return base62.encode(uuidv4(null, Buffer.alloc(16)));
}

export function secureRandomId(): string {
  return base62.encode(secureRandom.randomBuffer(16));
}
