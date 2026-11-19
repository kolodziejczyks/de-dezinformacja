import { HttpErrorResponse } from '@angular/common/http';
import { getDomain, getPublicSuffix } from 'tldts';
import { normalizeNewsLink } from '../news-search/news-link-validator';

export const RDAP_DOMAIN_URL = 'https://rdap.org/domain/';

/** ICANN public suffixes only, so `.co.uk` and `.com.pl` stay intact. */
const PUBLIC_SUFFIX = { allowPrivateDomains: false } as const;

export interface DomainAge {
  years: number;
  days: number;
}

export interface DomainRegistration {
  domain: string;
  registrar: string | null;
  registeredAt: string | null;
  age: DomainAge | null;
  expiresAt: string | null;
  updatedAt: string | null;
  registrantOrganization: string | null;
  registrantCountry: string | null;
  nameservers: string[];
  status: string[];
}

export type DomainCheckErrorKind =
  | 'unsupported'
  | 'not-found'
  | 'rate-limit'
  | 'network'
  | 'unavailable';

export type DomainCheckState =
  | { status: 'idle' }
  | { status: 'loading'; domain: string }
  | { status: 'success'; result: DomainRegistration }
  | { status: 'error'; domain: string; kind: DomainCheckErrorKind };

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

interface RdapEntity {
  handle?: string;
  roles?: string[];
  vcardArray?: unknown;
  entities?: RdapEntity[];
}

export interface RdapDomain {
  ldhName?: string;
  unicodeName?: string;
  status?: unknown;
  events?: RdapEvent[];
  nameservers?: { ldhName?: string }[];
  entities?: RdapEntity[];
  /** NASK (.pl) extension used when the standard status array is absent. */
  nask0_state?: string;
  title?: string;
}

export function rdapDomainUrl(domain: string): string {
  return `${RDAP_DOMAIN_URL}${encodeURIComponent(domain)}`;
}

/**
 * Registered domain of a news link (eTLD+1).
 * `przegladsportowy.onet.pl` is `onet.pl`, `news.bbc.co.uk` is `bbc.co.uk`,
 * and `news.example.com.pl` is `example.com.pl`. A public suffix that is
 * itself registered (`gov.pl`, `co.uk`) is returned unchanged.
 * `www` plus only a public suffix (`www.gov.pl`, `www.nhs.uk`) is kept so the
 * lookup can tell a separate registration from a host name of the suffix.
 */
export function extractDomain(value: string): string | null {
  const hostname = newsHostname(value);
  if (!hostname) {
    return null;
  }
  return getDomain(hostname, PUBLIC_SUFFIX) ?? hostname;
}

/** Full hostname of a news link, including subdomains. `www.bbc.co.uk` stays `www.bbc.co.uk`. */
export function extractHostname(value: string): string | null {
  return newsHostname(value);
}

/**
 * Second RDAP name when `domain` is exactly `www.<public suffix>`.
 * Tried only after that name is not found: `www.nhs.uk` has no record and
 * `nhs.uk` does, while `www.gov.pl` is a different registration from `gov.pl`.
 */
export function wwwPublicSuffixFallback(domain: string): string | null {
  const suffix = getPublicSuffix(domain, PUBLIC_SUFFIX);
  if (!suffix) {
    return null;
  }
  return domain.toLowerCase() === `www.${suffix}` ? suffix : null;
}

function newsHostname(value: string): string | null {
  const candidate = normalizeNewsLink(value);
  if (!candidate) {
    return null;
  }
  try {
    return new URL(candidate).hostname.replace(/\.$/, '').toLowerCase() || null;
  } catch {
    return null;
  }
}

export function mapRdapDomain(
  body: RdapDomain,
  queriedDomain: string,
  now: Date = new Date(),
): DomainRegistration {
  const registeredAt = eventDate(body.events, ['registration', 'registered']);
  const expiresAt = eventDate(body.events, ['expiration', 'registrar expiration']);
  const updatedAt = eventDate(body.events, ['last changed', 'last update']);
  const registrant = firstEntity(body.entities, 'registrant');
  const registrar = firstEntity(body.entities, 'registrar');

  return {
    domain: normalizeName(body.unicodeName) ?? normalizeName(body.ldhName) ?? queriedDomain,
    registrar: entityName(registrar),
    registeredAt,
    age: registeredAt ? domainAge(registeredAt, now) : null,
    expiresAt,
    updatedAt,
    registrantOrganization: registrant ? organizationName(registrant) : null,
    registrantCountry: registrant ? countryName(registrant) : null,
    nameservers: nameserverNames(body.nameservers),
    status: statusValues(body),
  };
}

export function domainAge(registeredAt: string, now: Date): DomainAge | null {
  const created = new Date(registeredAt);
  if (Number.isNaN(created.getTime())) {
    return null;
  }
  if (created.getTime() >= now.getTime()) {
    return { years: 0, days: 0 };
  }

  let years = now.getUTCFullYear() - created.getUTCFullYear();
  const anniversary = Date.UTC(
    created.getUTCFullYear() + years,
    created.getUTCMonth(),
    created.getUTCDate(),
    created.getUTCHours(),
    created.getUTCMinutes(),
    created.getUTCSeconds(),
    created.getUTCMilliseconds(),
  );
  if (anniversary > now.getTime()) {
    years -= 1;
  }
  const start = Date.UTC(
    created.getUTCFullYear() + years,
    created.getUTCMonth(),
    created.getUTCDate(),
    created.getUTCHours(),
    created.getUTCMinutes(),
    created.getUTCSeconds(),
    created.getUTCMilliseconds(),
  );
  const days = Math.floor((now.getTime() - start) / 86_400_000);
  return { years: Math.max(0, years), days: Math.max(0, days) };
}

export function formatUtcDate(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export function pluralCategory(count: number, lang: 'pl' | 'en'): 'ONE' | 'FEW' | 'MANY' {
  const n = Math.abs(count);
  if (lang !== 'pl') {
    return n === 1 ? 'ONE' : 'MANY';
  }
  if (n === 1) {
    return 'ONE';
  }
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'FEW';
  }
  return 'MANY';
}

export function classifyRdapError(error: HttpErrorResponse): DomainCheckErrorKind {
  if (error.status === 0) {
    return 'network';
  }
  if (error.status === 429) {
    return 'rate-limit';
  }
  const title = errorTitle(error.error);
  if (error.status === 404 && title && /no rdap service/i.test(title)) {
    return 'unsupported';
  }
  if (error.status === 404) {
    return 'not-found';
  }
  return 'unavailable';
}

function eventDate(events: RdapEvent[] | undefined, actions: string[]): string | null {
  for (const action of actions) {
    const match = events?.find((event) => event.eventAction?.toLowerCase() === action);
    if (match?.eventDate) {
      return match.eventDate;
    }
  }
  return null;
}

function firstEntity(entities: RdapEntity[] | undefined, role: string): RdapEntity | null {
  for (const entity of entities ?? []) {
    if (entity.roles?.includes(role)) {
      return entity;
    }
    for (const child of entity.entities ?? []) {
      if (child.roles?.includes(role)) {
        return child;
      }
    }
  }
  return null;
}

function entityName(entity: RdapEntity | null): string | null {
  if (!entity) {
    return null;
  }
  return vcardText(entity, 'fn') ?? vcardText(entity, 'org') ?? clean(entity.handle);
}

function organizationName(entity: RdapEntity): string | null {
  const org = vcardText(entity, 'org');
  if (org) {
    return org;
  }
  // A personal registrant name is not an organization. `kind` is often omitted
  // when the formatted name is the company, so only `individual` is excluded.
  if (vcardText(entity, 'kind') === 'individual') {
    return null;
  }
  return vcardText(entity, 'fn');
}

function countryName(entity: RdapEntity): string | null {
  for (const entry of vcardEntries(entity)) {
    if (entry[0] !== 'adr') {
      continue;
    }
    const value = entry[3];
    if (Array.isArray(value)) {
      const country = clean(value[6]);
      if (country) {
        return normalizeCountry(country);
      }
    }
    const params = entry[1];
    if (params && typeof params === 'object' && 'cc' in params) {
      const cc = clean((params as { cc?: unknown }).cc);
      if (cc) {
        return normalizeCountry(cc);
      }
    }
  }
  return null;
}

function nameserverNames(nameservers: { ldhName?: string }[] | undefined): string[] {
  const names: string[] = [];
  for (const nameserver of nameservers ?? []) {
    const name = normalizeName(nameserver.ldhName);
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

function statusValues(body: RdapDomain): string[] {
  const status = Array.isArray(body.status)
    ? body.status.map((value) => clean(value)).filter((value): value is string => value !== null)
    : [];
  if (status.length > 0) {
    return status;
  }
  const naskState = clean(body.nask0_state);
  return naskState ? [naskState] : [];
}

function normalizeName(value: unknown): string | null {
  const name = clean(value);
  return name ? name.toLowerCase().replace(/\.$/, '') : null;
}

function normalizeCountry(value: string): string {
  return /^[a-z]{2}$/i.test(value) ? value.toUpperCase() : value;
}

function vcardText(entity: RdapEntity, name: string): string | null {
  for (const entry of vcardEntries(entity)) {
    if (entry[0] === name) {
      const text = clean(entry[3]);
      if (text) {
        return text;
      }
    }
  }
  return null;
}

function vcardEntries(entity: RdapEntity): unknown[][] {
  const vcard = entity.vcardArray;
  if (!Array.isArray(vcard) || !Array.isArray(vcard[1])) {
    return [];
  }
  return vcard[1].filter((entry): entry is unknown[] => Array.isArray(entry));
}

function errorTitle(error: unknown): string | null {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'title' in error) {
    return clean((error as { title?: unknown }).title);
  }
  return null;
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
