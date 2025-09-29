import { RawTrade, NormalizedTrade } from '../adapters/IBrokerAdapter';

/**
 * Normalize Zerodha trade data to standard format
 */
export function normalizeZerodhaTrade(rawTrade: RawTrade): NormalizedTrade {
  try {
    return {
      symbol: rawTrade.tradingsymbol || rawTrade.instrument_token?.toString() || 'UNKNOWN',
      quantity: parseInt(rawTrade.quantity?.toString() || '0', 10),
      price: parseFloat(rawTrade.average_price?.toString() || '0'),
      timestamp: rawTrade.order_timestamp || rawTrade.exchange_timestamp || new Date().toISOString(),
      side: rawTrade.transaction_type?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
    };
  } catch (error) {
    console.error('[Helpers] Error normalizing Zerodha trade:', error);
    throw new Error('Failed to normalize Zerodha trade data');
  }
}

/**
 * Normalize MetaTrader trade data to standard format
 */
export function normalizeMetaTraderTrade(rawTrade: RawTrade): NormalizedTrade {
  try {
    return {
      symbol: rawTrade.symbol || rawTrade.instrument || 'UNKNOWN',
      quantity: Math.abs(parseFloat(rawTrade.volume?.toString() || '0')),
      price: parseFloat(rawTrade.price?.toString() || '0'),
      timestamp: rawTrade.time || rawTrade.close_time || new Date().toISOString(),
      side: parseFloat(rawTrade.volume?.toString() || '0') > 0 ? 'BUY' : 'SELL',
    };
  } catch (error) {
    console.error('[Helpers] Error normalizing MetaTrader trade:', error);
    throw new Error('Failed to normalize MetaTrader trade data');
  }
}

/**
 * Normalize trade data based on broker type
 */
export function normalizeTrade(rawTrade: RawTrade, brokerName: string): NormalizedTrade {
  switch (brokerName.toLowerCase()) {
    case 'zerodha':
      return normalizeZerodhaTrade(rawTrade);
    case 'metatrader':
      return normalizeMetaTraderTrade(rawTrade);
    default:
      throw new Error(`Unknown broker: ${brokerName}`);
  }
}

/**
 * Validate normalized trade data
 */
export function validateNormalizedTrade(trade: NormalizedTrade): boolean {
  return Boolean(
    trade.symbol &&
    trade.symbol !== 'UNKNOWN' &&
    trade.quantity > 0 &&
    trade.price > 0 &&
    trade.timestamp &&
    (trade.side === 'BUY' || trade.side === 'SELL')
  );
}

/**
 * Format timestamp to ISO 8601
 */
export function formatTimestamp(timestamp: string | Date): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp');
    }
    return date.toISOString();
  } catch (error) {
    console.error('[Helpers] Error formatting timestamp:', error);
    return new Date().toISOString();
  }
}

/**
 * Clean and validate symbol name
 */
export function cleanSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') {
    return 'UNKNOWN';
  }
  
  // Remove common prefixes/suffixes and clean up
  return symbol
    .replace(/^[A-Z]+:/, '') // Remove exchange prefix like "NSE:"
    .replace(/[^A-Z0-9.-]/g, '') // Keep only alphanumeric, dots, and dashes
    .toUpperCase()
    .trim();
}

/**
 * Convert price to number with proper precision
 */
export function parsePrice(price: any): number {
  if (typeof price === 'number') {
    return price;
  }
  
  if (typeof price === 'string') {
    const parsed = parseFloat(price);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * Convert quantity to number
 */
export function parseQuantity(quantity: any): number {
  if (typeof quantity === 'number') {
    return Math.abs(quantity);
  }
  
  if (typeof quantity === 'string') {
    const parsed = parseInt(quantity, 10);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  }
  
  return 0;
}

/**
 * Log trade normalization statistics
 */
export function logNormalizationStats(
  brokerName: string,
  rawTrades: RawTrade[],
  normalizedTrades: NormalizedTrade[]
): void {
  const validTrades = normalizedTrades.filter(validateNormalizedTrade);
  const invalidTrades = normalizedTrades.length - validTrades.length;
  
  console.log(`[Helpers] ${brokerName} normalization stats:`);
  console.log(`  Raw trades: ${rawTrades.length}`);
  console.log(`  Normalized trades: ${normalizedTrades.length}`);
  console.log(`  Valid trades: ${validTrades.length}`);
  console.log(`  Invalid trades: ${invalidTrades}`);
}
