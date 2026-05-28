export class CommandCache {
  private static cache = new Map<string, { data: string; expiresAt: number }>();
  private static MAX_SIZE = 200;
  // Default TTL: 30 minutes
  private static DEFAULT_TTL = 30 * 60 * 1000;

  static get(cmd: string): string | null {
    const item = this.cache.get(cmd);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(cmd);
      return null;
    }
    return item.data;
  }

  static set(cmd: string, data: string, ttl: number = this.DEFAULT_TTL): void {
    if (this.cache.size >= this.MAX_SIZE) {
      // Hapus item terlama (yang pertama kali dimasukkan karena Map retains insertion order)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(cmd, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  static clear(): void {
    this.cache.clear();
  }
}
