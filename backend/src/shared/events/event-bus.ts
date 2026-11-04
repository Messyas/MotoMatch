import type { Logger } from "../logging/logger";

export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  readonly type: TType;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => Promise<void> | void;

export interface EventBus {
  publish<E extends DomainEvent>(event: E): Promise<void>;
  subscribe<E extends DomainEvent>(type: E["type"], handler: EventHandler<E>): () => void;
}

export class InProcessEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<any>>>();

  constructor(private readonly logger?: Logger) {}

  subscribe<E extends DomainEvent>(type: E["type"], handler: EventHandler<E>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as EventHandler<any>);

    return () => {
      set?.delete(handler as EventHandler<any>);
      if (set && set.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  async publish<E extends DomainEvent>(event: E): Promise<void> {
    const set = this.handlers.get(event.type);
    if (!set || set.size === 0) {
      return;
    }

    const promises: Promise<void>[] = [];
    for (const handler of set) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          promises.push(
            result.catch((error) => {
              this.logger?.error("events.handler_failed", {
                eventType: event.type,
                error: error instanceof Error ? error.message : String(error),
              });
            }),
          );
        }
      } catch (error) {
        this.logger?.error("events.handler_sync_failed", {
          eventType: event.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }
}
