export interface Clock {
  now(): Date;
  todayUtcString(): string;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  todayUtcString(): string {
    return this.now().toISOString().slice(0, 10);
  }
}

export class FixedClock implements Clock {
  private currentTime: Date;

  constructor(initial: Date | string = new Date("2026-11-04T12:00:00.000Z")) {
    this.currentTime = typeof initial === "string" ? new Date(initial) : new Date(initial.getTime());
  }

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  todayUtcString(): string {
    return this.currentTime.toISOString().slice(0, 10);
  }

  set(time: Date | string): void {
    this.currentTime = typeof time === "string" ? new Date(time) : new Date(time.getTime());
  }

  advanceMs(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }
}
