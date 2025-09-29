import { TokenData } from '../adapters/IBrokerAdapter';

/**
 * In-memory token storage service
 * In production, this would be replaced with a database or Redis
 */
export class TokenService {
  private static instance: TokenService;
  private tokenStore: Map<string, TokenData> = new Map();

  private constructor() {}

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Store a token for a user and broker combination
   */
  setToken(userId: string, brokerName: string, tokenData: TokenData): void {
    const key = this.getKey(userId, brokerName);
    this.tokenStore.set(key, tokenData);
    console.log(`[TokenService] Stored token for ${userId}@${brokerName}`);
  }

  /**
   * Get a token for a user and broker combination
   */
  getToken(userId: string, brokerName: string): TokenData | null {
    const key = this.getKey(userId, brokerName);
    const tokenData = this.tokenStore.get(key);
    
    if (tokenData) {
      console.log(`[TokenService] Retrieved token for ${userId}@${brokerName}`);
      return tokenData;
    }
    
    console.log(`[TokenService] No token found for ${userId}@${brokerName}`);
    return null;
  }

  /**
   * Check if a token exists and is valid (not expired)
   */
  isTokenValid(userId: string, brokerName: string): boolean {
    const tokenData = this.getToken(userId, brokerName);
    
    if (!tokenData) {
      return false;
    }

    // Check if token is expired (with 30 second skew for safety)
    const now = new Date();
    const skewMs = parseInt(process.env.TOKEN_REFRESH_SKEW_MS || '30000', 10);
    const expiryWithSkew = new Date(tokenData.expiresAt.getTime() - skewMs);
    
    const isValid = now < expiryWithSkew;
    
    if (!isValid) {
      console.log(`[TokenService] Token expired for ${userId}@${brokerName}`);
      this.removeToken(userId, brokerName);
    }
    
    return isValid;
  }

  /**
   * Remove a token for a user and broker combination
   */
  removeToken(userId: string, brokerName: string): void {
    const key = this.getKey(userId, brokerName);
    this.tokenStore.delete(key);
    console.log(`[TokenService] Removed token for ${userId}@${brokerName}`);
  }

  /**
   * Update an existing token
   */
  updateToken(userId: string, brokerName: string, tokenData: TokenData): void {
    this.setToken(userId, brokerName, tokenData);
    console.log(`[TokenService] Updated token for ${userId}@${brokerName}`);
  }

  /**
   * Get all tokens for a user
   */
  getUserTokens(userId: string): Map<string, TokenData> {
    const userTokens = new Map<string, TokenData>();
    
    for (const [key, tokenData] of this.tokenStore.entries()) {
      if (key.startsWith(`${userId}:`)) {
        const brokerName = key.split(':')[1];
        userTokens.set(brokerName, tokenData);
      }
    }
    
    return userTokens;
  }

  /**
   * Clear all tokens (useful for testing)
   */
  clearAllTokens(): void {
    this.tokenStore.clear();
    console.log('[TokenService] Cleared all tokens');
  }

  /**
   * Get token statistics
   */
  getTokenStats(): { totalTokens: number; validTokens: number; expiredTokens: number } {
    let validTokens = 0;
    let expiredTokens = 0;
    
    for (const tokenData of this.tokenStore.values()) {
      const now = new Date();
      const skewMs = parseInt(process.env.TOKEN_REFRESH_SKEW_MS || '30000', 10);
      const expiryWithSkew = new Date(tokenData.expiresAt.getTime() - skewMs);
      
      if (now < expiryWithSkew) {
        validTokens++;
      } else {
        expiredTokens++;
      }
    }
    
    return {
      totalTokens: this.tokenStore.size,
      validTokens,
      expiredTokens,
    };
  }

  /**
   * Generate a unique key for user and broker combination
   */
  private getKey(userId: string, brokerName: string): string {
    return `${userId}:${brokerName}`;
  }
}
