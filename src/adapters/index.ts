import { IBrokerAdapter } from './IBrokerAdapter';
import { ZerodhaAdapter } from './ZerodhaAdapter';

/**
 * Adapter registry for managing broker adapters
 */
export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: Map<string, IBrokerAdapter> = new Map();

  private constructor() {
    this.initializeAdapters();
  }

  static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  /**
   * Initialize all available adapters
   */
  private initializeAdapters(): void {
    try {
      // Register Zerodha adapter
      const zerodhaAdapter = new ZerodhaAdapter();
      this.adapters.set(zerodhaAdapter.getName(), zerodhaAdapter);
      console.log(`[AdapterRegistry] Registered ${zerodhaAdapter.getName()} adapter`);


      console.log(`[AdapterRegistry] Initialized ${this.adapters.size} adapters`);
    } catch (error) {
      console.error('[AdapterRegistry] Error initializing adapters:', error);
    }
  }

  /**
   * Get an adapter by name
   */
  getAdapter(brokerName: string): IBrokerAdapter {
    const adapter = this.adapters.get(brokerName.toLowerCase());
    
    if (!adapter) {
      const availableBrokers = Array.from(this.adapters.keys()).join(', ');
      throw new Error(`Unknown broker: ${brokerName}. Available brokers: ${availableBrokers}`);
    }
    
    return adapter;
  }

  /**
   * Get all available adapters
   */
  getAllAdapters(): Map<string, IBrokerAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Get list of available broker names
   */
  getAvailableBrokers(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if a broker is supported
   */
  isBrokerSupported(brokerName: string): boolean {
    return this.adapters.has(brokerName.toLowerCase());
  }

  /**
   * Register a new adapter
   */
  registerAdapter(adapter: IBrokerAdapter): void {
    this.adapters.set(adapter.getName(), adapter);
    console.log(`[AdapterRegistry] Registered new adapter: ${adapter.getName()}`);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(brokerName: string): boolean {
    const removed = this.adapters.delete(brokerName.toLowerCase());
    if (removed) {
      console.log(`[AdapterRegistry] Unregistered adapter: ${brokerName}`);
    }
    return removed;
  }

  /**
   * Get adapter statistics
   */
  getStats(): { totalAdapters: number; supportedBrokers: string[] } {
    return {
      totalAdapters: this.adapters.size,
      supportedBrokers: this.getAvailableBrokers(),
    };
  }
}

// Export singleton instance
export const adapterRegistry = AdapterRegistry.getInstance();

// Export individual adapters for direct use
export { IBrokerAdapter, ZerodhaAdapter };
export type { TokenData, RawTrade, NormalizedTrade } from './IBrokerAdapter';
