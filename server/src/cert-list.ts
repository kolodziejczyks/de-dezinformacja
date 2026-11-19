import { domainToASCII, domainToUnicode } from 'node:url';
import { getPublicSuffix } from 'tldts';

/** ICANN suffixes only, so `.co.uk` and `.com.pl` stay intact. */
const PUBLIC_SUFFIX = { allowPrivateDomains: false } as const;

export interface DomainMatch {
  /** Host that was asked about, in ASCII. */
  domain: string;
  /** Names from the list that hit: the host, a parent, or a `www.` alias. */
  matches: string[];
  /** Hosts that were compared with the list, from the full name up to the registrable domain. */
  checked: string[];
}

/**
 * Hostnames to compare with the warning list.
 * Starts at the full host and walks through parents, including the registrable
 * domain, and stops before a public suffix (`co.uk`, `gov.pl`). A query that
 * is itself a public suffix is checked as that exact name.
 */
export function domainsToCheck(input: string): string[] {
  const host = normalizeHost(input);
  if (!host) {
    return [];
  }

  const names: string[] = [];
  let current = host;
  while (current.includes('.')) {
    const suffix = getPublicSuffix(current, PUBLIC_SUFFIX);
    if (suffix === current) {
      if (names.length === 0) {
        names.push(current);
      }
      break;
    }
    names.push(current);
    const parent = current.slice(current.indexOf('.') + 1);
    if (!parent || parent === current || suffix === parent) {
      break;
    }
    current = parent;
  }
  return names;
}

/**
 * Which of `domainsToCheck` are present.
 * A `www.` label is also tried for each candidate, because the feed often
 * stores that host on its own. A listed child does not flag its parent.
 */
export function matchDomains(list: ReadonlySet<string>, input: string): DomainMatch | null {
  const checked = domainsToCheck(input);
  const domain = checked[0];
  if (!domain) {
    return null;
  }

  const matches: string[] = [];
  const seen = new Set<string>();
  const add = (name: string): void => {
    if (seen.has(name)) {
      return;
    }
    seen.add(name);
    matches.push(name);
  };
  for (const name of checked) {
    const direct = hostKeys(name).find((key) => list.has(key));
    if (direct) {
      add(direct);
      continue;
    }
    if (!name.startsWith('www.')) {
      const alias = hostKeys(`www.${name}`).find((key) => list.has(key));
      if (alias) {
        add(alias);
      }
    }
  }

  return { domain, matches, checked };
}

/** One host per line. Blank lines are skipped. ASCII and Unicode forms are both stored. */
export function parseDomainList(text: string): Set<string> {
  const domains = new Set<string>();
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (const line of body.split(/\r?\n/)) {
    const host = normalizeHost(line);
    if (!host) {
      continue;
    }
    for (const key of hostKeys(host)) {
      domains.add(key);
    }
  }
  return domains;
}

export function normalizeHost(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.length > 1000 || /\s/.test(trimmed)) {
    return null;
  }

  let host = trimmed;
  if (host.includes('://') || host.includes('/') || host.includes('?') || host.includes('#')) {
    try {
      host = new URL(host.includes('://') ? host : `http://${host}`).hostname;
    } catch {
      return null;
    }
  }
  host = host.replace(/\.$/, '');

  let ascii: string;
  try {
    ascii = domainToASCII(host).toLowerCase().replace(/\.$/, '');
  } catch {
    return null;
  }
  if (!ascii || !ascii.includes('.') || ascii.includes('..')) {
    return null;
  }
  const labels = ascii.split('.');
  if (labels.some((label) => label.length === 0 || label.length > 63)) {
    return null;
  }
  return ascii;
}

function hostKeys(host: string): string[] {
  const keys = new Set<string>();
  keys.add(host);
  try {
    const unicode = domainToUnicode(host).toLowerCase().replace(/\.$/, '');
    if (unicode) {
      keys.add(unicode);
    }
  } catch {
    // Keep the ASCII form when the name cannot be shown in Unicode.
  }
  return [...keys];
}
