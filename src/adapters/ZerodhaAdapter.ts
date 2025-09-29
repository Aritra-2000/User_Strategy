import { IBrokerAdapter, TokenData, RawTrade } from './IBrokerAdapter';
import axios, { AxiosInstance } from 'axios';

/**
 * Zerodha Kite Connect Adapter
 * Implements IBrokerAdapter for Zerodha's Kite Connect API
 */
export class ZerodhaAdapter extends IBrokerAdapter {
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    super();
    this.baseUrl = process.env.ZERODHA_BASE_URL || 'https://api.kite.trade';
    this.apiKey = process.env.ZERODHA_API_KEY || '';
    this.apiSecret = process.env.ZERODHA_API_SECRET || '';

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Kite-Version': '3',
      },
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config: any) => {
        console.log(`[Zerodha] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error: any) => {
        console.error('[Zerodha] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response: any) => {
        console.log(`[Zerodha] Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error: any) => {
        console.error('[Zerodha] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  getName(): string {
    return 'zerodha';
  }

  async fetchTrades(token: string): Promise<RawTrade[]> {
    try {
      const response = await this.httpClient.get('/orders', {
        headers: {
          'Authorization': `token ${this.apiKey}:${token}`,
        },
        params: {
          status: 'COMPLETE', // Only fetch completed orders
        },
      });

      if (response.data && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      console.error('[Zerodha] Error fetching trades:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid or expired token');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Insufficient permissions');
      }
      
      throw new Error(`Failed to fetch trades: ${error.message}`);
    }
  }

  async refreshToken(oldToken: string): Promise<TokenData> {
    try {
      // For Zerodha, we need to use the refresh token flow
      // This is a simplified implementation - in production, you'd need to handle the full OAuth flow
      const response = await this.httpClient.post('/session/refresh_token', {
        refresh_token: oldToken,
        api_key: this.apiKey,
      });

      if (response.data && response.data.data) {
        const { access_token, refresh_token } = response.data.data;
        
        return {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        };
      }

      throw new Error('Invalid response from token refresh');
    } catch (error: any) {
      console.error('[Zerodha] Error refreshing token:', error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  isTokenValid(token: string): boolean {
    // For Zerodha, we can make a simple API call to validate the token
    // In a real implementation, you might want to cache this or use JWT validation
    return Boolean(token && token.length > 0);
  }

  /**
   * Get user profile to validate token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/user/profile', {
        headers: {
          'Authorization': `token ${this.apiKey}:${token}`,
        },
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get instruments for symbol mapping
   */
  async getInstruments(): Promise<any[]> {
    try {
      const response = await this.httpClient.get('/instruments');
      return response.data || [];
    } catch (error: any) {
      console.error('[Zerodha] Error fetching instruments:', error.message);
      return [];
    }
  }
}
