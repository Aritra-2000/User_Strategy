import { adapterRegistry } from '../adapters';
import { TokenService } from './TokenService';
import { normalizeTrade, validateNormalizedTrade, logNormalizationStats } from '../utils/helpers';
import { NormalizedTrade } from '../adapters/IBrokerAdapter';

/**
 * Core service for syncing trades from brokers
 */
export class SyncService {
  private static instance: SyncService;
  private tokenService: TokenService;

  private constructor() {
    this.tokenService = TokenService.getInstance();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Main function to sync trades from a broker
   * @param userId - User identifier
   * @param brokerName - Name of the broker (e.g., 'zerodha', 'metatrader')
   * @returns Promise<NormalizedTrade[]> - Array of normalized trades
   */
  async syncTrades(userId: string, brokerName: string): Promise<NormalizedTrade[]> {
    try {
      console.log(`[SyncService] Starting sync for user ${userId} with broker ${brokerName}`);

      // Get the appropriate adapter
      const adapter = adapterRegistry.getAdapter(brokerName);
      console.log(`[SyncService] Using adapter: ${adapter.getName()}`);

      // Get or refresh token
      const token = await this.getValidToken(userId, brokerName, adapter);
      console.log(`[SyncService] Got valid token for ${userId}@${brokerName}`);

      // Fetch raw trades from broker
      const rawTrades = await adapter.fetchTrades(token);
      console.log(`[SyncService] Fetched ${rawTrades.length} raw trades from ${brokerName}`);

      // Normalize trades
      const normalizedTrades = this.normalizeTrades(rawTrades, brokerName);
      console.log(`[SyncService] Normalized ${normalizedTrades.length} trades`);

      // Log statistics
      logNormalizationStats(brokerName, rawTrades, normalizedTrades);

      // Filter valid trades
      const validTrades = normalizedTrades.filter(validateNormalizedTrade);
      console.log(`[SyncService] ${validTrades.length} valid trades after validation`);

      return validTrades;
    } catch (error: any) {
      console.error(`[SyncService] Error syncing trades for ${userId}@${brokerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get a valid token for the user and broker, refreshing if necessary
   */
  private async getValidToken(userId: string, brokerName: string, adapter: any): Promise<string> {
    // Check if we have a valid token
    if (this.tokenService.isTokenValid(userId, brokerName)) {
      const tokenData = this.tokenService.getToken(userId, brokerName);
      if (tokenData) {
        return tokenData.accessToken;
      }
    }

    // Token is invalid or doesn't exist, try to refresh
    console.log(`[SyncService] Token invalid or missing for ${userId}@${brokerName}, attempting refresh`);
    
    // Get the old token (if any)
    const oldTokenData = this.tokenService.getToken(userId, brokerName);
    const oldToken = oldTokenData?.accessToken || '';

    try {
      // Refresh the token
      const newTokenData = await adapter.refreshToken(oldToken);
      
      // Store the new token
      this.tokenService.setToken(userId, brokerName, newTokenData);
      
      console.log(`[SyncService] Successfully refreshed token for ${userId}@${brokerName}`);
      return newTokenData.accessToken;
    } catch (error: any) {
      console.error(`[SyncService] Failed to refresh token for ${userId}@${brokerName}:`, error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Normalize raw trades to standard format
   */
  private normalizeTrades(rawTrades: any[], brokerName: string): NormalizedTrade[] {
    const normalizedTrades: NormalizedTrade[] = [];

    for (const rawTrade of rawTrades) {
      try {
        const normalizedTrade = normalizeTrade(rawTrade, brokerName);
        normalizedTrades.push(normalizedTrade);
      } catch (error: any) {
        console.warn(`[SyncService] Failed to normalize trade:`, error.message);
        // Continue with other trades
      }
    }

    return normalizedTrades;
  }

  /**
   * Get sync statistics for a user
   */
  async getSyncStats(userId: string): Promise<{
    totalBrokers: number;
    supportedBrokers: string[];
    tokenStats: any;
  }> {
    const supportedBrokers = adapterRegistry.getAvailableBrokers();
    const tokenStats = this.tokenService.getTokenStats();

    return {
      totalBrokers: supportedBrokers.length,
      supportedBrokers,
      tokenStats,
    };
  }

  /**
   * Test connection to a broker
   */
  async testConnection(userId: string, brokerName: string): Promise<{
    success: boolean;
    message: string;
    brokerName: string;
  }> {
    try {
      const adapter = adapterRegistry.getAdapter(brokerName);
      
      // Try to get a valid token
      const token = await this.getValidToken(userId, brokerName, adapter);
      
      // Test the connection by making a simple API call
      if (adapter.validateToken) {
        const isValid = await adapter.validateToken(token);
        if (isValid) {
          return {
            success: true,
            message: `Successfully connected to ${brokerName}`,
            brokerName,
          };
        }
      }

      return {
        success: false,
        message: `Connection test failed for ${brokerName}`,
        brokerName,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        brokerName,
      };
    }
  }

  /**
   * Clear all tokens for a user
   */
  clearUserTokens(userId: string): void {
    const userTokens = this.tokenService.getUserTokens(userId);
    
    for (const brokerName of userTokens.keys()) {
      this.tokenService.removeToken(userId, brokerName);
    }
    
    console.log(`[SyncService] Cleared all tokens for user ${userId}`);
  }
}

// Export the main syncTrades function for programmatic use
export async function syncTrades(userId: string, brokerName: string): Promise<NormalizedTrade[]> {
  const syncService = SyncService.getInstance();
  return syncService.syncTrades(userId, brokerName);
}
