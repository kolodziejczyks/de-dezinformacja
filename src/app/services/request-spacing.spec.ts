import { RequestSpacing } from './request-spacing';

describe('RequestSpacing', () => {
  it('spaces calls by the interval and allows a later call immediately', () => {
    let now = 1_000;
    const spacing = new RequestSpacing(1_000, () => now);

    expect(spacing.reserve()).toBe(0);
    expect(spacing.reserve()).toBe(1_000);
    expect(spacing.reserve()).toBe(2_000);

    now = 4_000;
    expect(spacing.reserve()).toBe(0);
    expect(spacing.reserve()).toBe(1_000);
  });
});
