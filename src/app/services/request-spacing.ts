/** Spaces calls so a client stays under a fixed request rate. */
export class RequestSpacing {
  private nextAt = 0;

  constructor(
    private readonly intervalMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * Milliseconds to wait before the next call.
   * The slot is reserved even if the caller later cancels, so a cancelled
   * request that already left the browser still counts toward the limit.
   */
  reserve(): number {
    const now = this.now();
    const wait = Math.max(0, this.nextAt - now);
    this.nextAt = (wait === 0 ? now : this.nextAt) + this.intervalMs;
    return wait;
  }
}
