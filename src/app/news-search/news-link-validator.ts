import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const HTTP_SCHEME = /^https?:\/\//i;
const SCHEME_PREFIX = /^([a-z][a-z0-9+.-]*):/i;
const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const LETTER_TLD = /^[a-z]{2,}$/i;
/** IDN TLDs are punycode (`xn--p1ai`) once `URL` has parsed the host. */
const PUNYCODE_LABEL = /^xn--[a-z0-9](?:[a-z0-9-]{0,57}[a-z0-9])?$/i;

/**
 * Accepts realistic http(s) article links, with or without a scheme.
 * Surrounding whitespace is ignored so a pasted URL still validates.
 * Hosts need a letter TLD or a punycode TLD (`.online`, `.museum`, `żółw.pl`,
 * `.рф`). Other schemes, internal spaces, and bare words do not.
 */
export const newsLinkValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value;
  if (value == null) {
    return null;
  }
  if (typeof value !== 'string') {
    return { newsLink: true };
  }
  if (value.trim() === '') {
    return null;
  }
  return isNewsLink(value) ? null : { newsLink: true };
};

/** Blank and whitespace-only values are missing, not malformed. */
export const requiredNewsLink: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value;
  if (typeof value !== 'string' || value.trim() === '') {
    return { required: true };
  }
  return null;
};

/** Trimmed http(s) candidate, or null when the value is not an article link. */
export function normalizeNewsLink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return null;
  }
  if (isNonHttpScheme(trimmed)) {
    return null;
  }

  const candidate = HTTP_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }
  if (!hasNewsHostname(url.hostname)) {
    return null;
  }
  return candidate;
}

export function isNewsLink(value: string): boolean {
  return normalizeNewsLink(value) !== null;
}

function isNonHttpScheme(value: string): boolean {
  const match = SCHEME_PREFIX.exec(value);
  // A scheme does not contain a dot, so `news.example.com:8443/...` stays a
  // host while `javascript:` is rejected.
  if (!match?.[1] || match[1].includes('.')) {
    return false;
  }
  const scheme = match[1].toLowerCase();
  return scheme !== 'http' && scheme !== 'https';
}

function hasNewsHostname(hostname: string): boolean {
  const normalized = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
  const labels = normalized.split('.');
  if (labels.length < 2) {
    return false;
  }
  const tld = labels[labels.length - 1];
  if (!tld || !isTld(tld)) {
    return false;
  }
  return labels.every((label) => HOST_LABEL.test(label));
}

function isTld(label: string): boolean {
  return LETTER_TLD.test(label) || PUNYCODE_LABEL.test(label);
}
