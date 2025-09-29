/**
 * Abstract base class for broker adapters
 * Defines the contract that all broker adapters must implement
 */

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface RawTrade {
  [key: string]: any; // Broker-specific trade data
}

export interface NormalizedTrade {
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string; // ISO 8601 format
  side: 'BUY' | 'SELL';
}

export abstract class IBrokerAdapter {
  /**
   * Get the name of the broker
   */
  abstract getName(): string;

  /**
   * Fetch trades from the broker API
   * @param token - Authentication token
   * @returns Promise<RawTrade[]> - Raw trade data from broker
   */
  abstract fetchTrades(token: string): Promise<RawTrade[]>;

  /**
   * Refresh an expired token
   * @param oldToken - The expired token
   * @returns Promise<TokenData> - New token data
   */
  abstract refreshToken(oldToken: string): Promise<TokenData>;

  /**
   * Validate if a token is still valid
   * @param token - Token to validate
   * @returns boolean - True if token is valid
   */
  abstract isTokenValid(token: string): boolean;

  /**
   * Validate token by making an API call (optional method)
   * @param token - Token to validate
   * @returns Promise<boolean> - True if token is valid
   */
  async validateToken?(token: string): Promise<boolean>;
}
