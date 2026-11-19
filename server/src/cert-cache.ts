import { matchDomains, parseDomainList, type DomainMatch } from './cert-list.ts';

const DEFAULT_FEED = 'https://hole.cert.pl/domains/v2/domains.txt';
const DEFAULT_REFRESH_MS = 30 * 60 * 1000;

export interface CertLookup extends DomainMatch {
  listed: boolean;
  listUpdatedAt: string | null;
  listSize: number;
}

export interface CertListLogger {
  info(message: string): void;
  error(message: string, error?: unknown): void;
}

export interface CertListCacheOptions {
  feedUrl?: string;
  refreshMs?: number;
  fetchImpl?: typeof fetch;
  logger?: CertListLogger;
}

/**
 * In-memory copy of the CERT Polska warning list.
 * The first lookup waits for the download. Later refreshes keep the previous
 * copy if the feed fails, and send If-None-Match / If-Modified-Since.
 */
export class CertListCache {
  private readonly feedUrl: string;
  private readonly refreshMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: CertListLogger;

  private domains = new Set<string>();
  private etag: string | null = null;
  private lastModified: string | null = null;
  private updatedAt: string | null = null;
  private loaded = false;
  private pending: Promise<void> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: CertListCacheOptions = {}) {
    this.feedUrl = options.feedUrl ?? DEFAULT_FEED;
    this.refreshMs = options.refreshMs ?? DEFAULT_REFRESH_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.logger = options.logger ?? console;
  }

  start(): void {
    void this.reload();
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      void this.reload();
    }, this.refreshMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  reload(): Promise<void> {
    if (this.pending) {
      return this.pending;
    }
    this.pending = this.pull().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  async lookup(input: string): Promise<CertLookup | { error: 'list-unavailable' } | null> {
    const preview = matchDomains(this.domains, input);
    if (!preview) {
      return null;
    }
    if (!this.loaded) {
      await this.reload();
    }
    if (!this.loaded) {
      return { error: 'list-unavailable' };
    }
    const found = matchDomains(this.domains, input);
    if (!found) {
      return null;
    }
    return {
      ...found,
      listed: found.matches.length > 0,
      listUpdatedAt: this.updatedAt,
      listSize: this.domains.size,
    };
  }

  private async pull(): Promise<void> {
    try {
      const headers = new Headers();
      if (this.etag) {
        headers.set('If-None-Match', this.etag);
      }
      if (this.lastModified) {
        headers.set('If-Modified-Since', this.lastModified);
      }
      const response = await this.fetchImpl(this.feedUrl, {
        headers,
        signal: AbortSignal.timeout(60_000),
      });
      if (response.status === 304) {
        this.etag = response.headers.get('etag') ?? this.etag;
        this.lastModified = response.headers.get('last-modified') ?? this.lastModified;
        return;
      }
      if (!response.ok) {
        throw new Error(`CERT feed responded ${response.status}`);
      }
      const domains = parseDomainList(await response.text());
      if (domains.size === 0) {
        throw new Error('CERT feed was empty');
      }
      this.domains = domains;
      this.etag = response.headers.get('etag');
      this.lastModified = response.headers.get('last-modified');
      this.updatedAt = new Date().toISOString();
      this.loaded = true;
      this.logger.info(`CERT warning list: ${domains.size} names`);
    } catch (error) {
      this.logger.error('CERT warning list refresh failed', error);
    }
  }
}
