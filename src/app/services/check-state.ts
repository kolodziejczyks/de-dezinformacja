import { HttpErrorResponse } from '@angular/common/http';

export type CheckErrorKind = 'network' | 'unavailable' | 'rate-limit' | 'not-found';

export type CheckState<T> =
  | { status: 'idle' }
  | { status: 'loading'; domain: string }
  | { status: 'success'; result: T }
  | { status: 'error'; domain: string; kind: CheckErrorKind };

export function classifyCheckError(error: HttpErrorResponse): CheckErrorKind {
  if (error.status === 0) {
    return 'network';
  }
  if (error.status === 429) {
    return 'rate-limit';
  }
  return 'unavailable';
}
