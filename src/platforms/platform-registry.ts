import { PlatformAdapter } from '../types';

export class PlatformRegistry {
  private adapters: Map<string, PlatformAdapter> = new Map();

  register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platformId, adapter);
  }

  getAdapter(platformId: string): PlatformAdapter | undefined {
    return this.adapters.get(platformId);
  }

  getAllAdapters(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  findActiveAdapter(): PlatformAdapter | null {
    for (const adapter of this.adapters.values()) {
      if (adapter.isSupportedPage()) {
        return adapter;
      }
    }
    return null;
  }
}

export const platformRegistry = new PlatformRegistry();
