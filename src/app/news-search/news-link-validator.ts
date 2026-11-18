import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const HTTP_SCHEME = /^https?:\/\//i;
const SCHEME_PREFIX = /^([a-z][a-z0-9+.-]*):/i;
const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD = /^[a-z]{2,}$/i;

/**
 * Accepts realistic http(s) article links, with or without a scheme.
 * Hosts must have a letter TLD (so `.online` / `.museum` pass); other schemes,
 * spaces, and bare words do not.
 */
export const newsLinkValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value;
  if (value == null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || !isNewsLink(value)) {
    return { newsLink: true };
  }
  return null;
};

function isNewsLink(value: string): boolean {
  if (value !== value.trim() || /\s/.test(value)) {
    return false;
  }
  // `host:port` also contains a colon. A scheme does not contain a dot, so
  // `news.example.com:8443/...` stays a host while `javascript:` is rejected.
  if (isNonHttpScheme(value)) {
    return false;
  }

  const candidate = HTTP_SCHEME.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  return hasNewsHostname(url.hostname);
}

function isNonHttpScheme(value: string): boolean {
  const match = SCHEME_PREFIX.exec(value);
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
  if (!tld || !TLD.test(tld)) {
    return false;
  }
  return labels.every((label) => HOST_LABEL.test(label));
}
