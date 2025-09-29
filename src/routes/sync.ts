import { Router, Request, Response } from 'express';
import { SyncService } from '../services/SyncService';
import { TokenService } from '../services/TokenService';
import { adapterRegistry } from '../adapters';

const router: Router = Router();
const syncService = SyncService.getInstance();

/**
 * POST /sync - Sync trades from a broker
 * Body: { userId: string, broker: string }
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { userId, broker } = req.body;

    // Validate input
    if (!userId || !broker) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both userId and broker are required'
      });
    }

    // Check if broker is supported
    if (!adapterRegistry.isBrokerSupported(broker)) {
      const supportedBrokers = adapterRegistry.getAvailableBrokers();
      return res.status(400).json({
        error: 'Unsupported broker',
        message: `Broker '${broker}' is not supported`,
        supportedBrokers
      });
    }

    // Optionally seed tokens for real API calls (accessToken/refreshToken/expiresAt)
    const tokenService = TokenService.getInstance();
    const { accessToken, refreshToken, expiresAt } = req.body || {};

    if (accessToken) {
      tokenService.setToken(
        userId,
        broker,
        {
          accessToken,
          refreshToken,
          // default expiry 23h if not provided
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 23 * 60 * 60 * 1000),
        }
      );
    }

    // Sync trades
    const trades = await syncService.syncTrades(userId, broker);

    return res.status(200).json({
      success: true,
      userId,
      broker,
      trades,
      count: trades.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Sync Route] Error:', error);
    
    // Handle specific error types
    if (error.message.includes('Authentication failed')) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: error.message,
        suggestion: 'Please check your broker credentials and try again'
      });
    }
    
    if (error.message.includes('Unknown broker')) {
      return res.status(400).json({
        error: 'Invalid broker',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to sync trades',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /sync/brokers - Get list of supported brokers
 */
router.get('/brokers', (req: Request, res: Response) => {
  try {
    const supportedBrokers = adapterRegistry.getAvailableBrokers();
    const stats = adapterRegistry.getStats();

    return res.status(200).json({
      success: true,
      supportedBrokers,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Sync Route] Error getting brokers:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get supported brokers'
    });
  }
});

/**
 * POST /sync/test - Test connection to a broker
 * Body: { userId: string, broker: string }
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { userId, broker } = req.body;

    // Validate input
    if (!userId || !broker) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both userId and broker are required'
      });
    }

    // Check if broker is supported
    if (!adapterRegistry.isBrokerSupported(broker)) {
      const supportedBrokers = adapterRegistry.getAvailableBrokers();
      return res.status(400).json({
        error: 'Unsupported broker',
        message: `Broker '${broker}' is not supported`,
        supportedBrokers
      });
    }

    // Test connection
    const result = await syncService.testConnection(userId, broker);

    return res.status(result.success ? 200 : 400).json({
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Sync Route] Error testing connection:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to test connection',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /sync/stats/:userId - Get sync statistics for a user
 */
router.get('/stats/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId parameter'
      });
    }

    const stats = await syncService.getSyncStats(userId);

    return res.status(200).json({
      success: true,
      userId,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Sync Route] Error getting stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get sync statistics'
    });
  }
});

/**
 * DELETE /sync/tokens/:userId - Clear all tokens for a user
 */
router.delete('/tokens/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId parameter'
      });
    }

    syncService.clearUserTokens(userId);

    return res.status(200).json({
      success: true,
      message: `Cleared all tokens for user ${userId}`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Sync Route] Error clearing tokens:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to clear tokens'
    });
  }
});

export default router;
