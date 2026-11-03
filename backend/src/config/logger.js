import pino from 'pino';
import { env } from './env.js';

export const logger = pino({ level: env.LOG_LEVEL, redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.phone', 'req.body.email'] });
