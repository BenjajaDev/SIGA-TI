import type { Clock } from '../../domain/ports/security';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
