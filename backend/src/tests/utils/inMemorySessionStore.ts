import session from "express-session";

export class InMemorySessionStore extends session.Store {
  private sessions = new Map<string, string>();

  constructor() {
    super();
  }

  get(
    sid: string,
    callback: (err: any, session?: session.SessionData | null) => void
  ) {
    const data = this.sessions.get(sid);
    callback(null, data ? JSON.parse(data) : null);
  }

  set(
    sid: string,
    sess: session.SessionData,
    callback?: (err?: any) => void
  ) {
    this.sessions.set(sid, JSON.stringify(sess));
    callback?.();
  }

  destroy(sid: string, callback?: (err?: any) => void) {
    this.sessions.delete(sid);
    callback?.();
  }

  clear(callback?: (err?: any) => void) {
    this.sessions.clear();
    callback?.();
  }
}
