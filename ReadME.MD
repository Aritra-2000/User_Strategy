# 🏦 Broker Integration Layer (One-Way Sync)

This is my backend engineering assessment for **Journalyst** – a trade journaling platform.

The project implements a simplified **Broker Integration Layer** that can fetch and normalize trades from external brokers. The current implementation includes simulated adapters for **MetaTrader** and **Zerodha**, and a clear architecture to add more brokers.

---

## 🚀 Goal

- Build a clean, modular backend system to sync trades from brokers.  
- Handle tokens with expiry and refresh logic.  
- Normalize raw broker data into a **consistent Trade object**.  
- Provide a simple `syncTrades(userId, brokerName)` function to fetch trades.  
- Make the system easily extensible for future brokers.  

---

## 🧩 Features Implemented

### 1. **Broker Adapter System**
- An abstract base class `IBrokerAdapter` defines:
  - `getName()`
  - `fetchTrades(token)`
  - `refreshToken(oldToken)`
- Implemented adapters: `MetaTraderAdapter` and `ZerodhaAdapter` (real API ready).

### 2. **Trade Data Normalization**
- Different brokers return trades in different formats.  
- Designed a consistent **Trade schema** (my own design):

```json
{
  "symbol": "EURUSD",
  "quantity": 1,
  "price": 1.0845,
  "timestamp": "2025-09-03T09:30:00Z",
  "side": "BUY"
}
```

---

## 📁 Folder Structure (TypeScript)

```
/src
  /adapters
    IBrokerAdapter.ts       # Abstract base
    MetaTraderAdapter.ts    # MetaTrader adapter (real API)
    index.ts                # Adapter registry
  /services
    TokenService.ts         # In-memory token management
    SyncService.ts          # Core syncTrades logic
  /models
    Trade.ts                # Normalized Trade model
  /utils
    helpers.ts              # Helpers + normalizers
run.ts                      # CLI entry (exports syncTrades + demo)
tsconfig.json               # TypeScript config
```

---

## 🔄 Workflow

1. **API Request**
   ```
   POST /sync
   {
     "userId": "user123",
     "broker": "metatrader"
   }
   ```

2. **Request Flow**
   - Request received by Express Router
   - Validated by Trade Controller
   - Processed by Sync Service
   - Broker-specific adapter handles API calls
   - Data normalized to standard format
   - Response returned to client

3. **Token Management**
   - Automatic token refresh when expired
   - In-memory token storage
   - Handles authentication errors gracefully

---

## 🌐 Run the HTTP Server (Express)

Install deps (first time): see Installation section below.

Dev server:
```
npm run dev
```

Prod server:
```
npm start
```

Default port: 3000. Change via `PORT` env.

Endpoint:
- `POST /sync` → normalized trades

Examples:
```
curl -X POST "http://localhost:3000/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user-1",
    "broker": "metatrader"
  }'

curl -X POST "http://localhost:3000/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user-1",
    "broker": "zerodha"
  }'
```

---

## 🔧 Programmatic Usage

```ts
// After build
import { syncTrades } from './dist/src/services/SyncService';

(async () => {
  const trades = await syncTrades('user-123', 'metatrader');
  console.log(trades);
})();
```

---

## Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Broker Integration Configuration

# Global Settings
NODE_ENV=development
PORT=3000

# MetaTrader Configuration
METATRADER_BASE_URL=https://api.metatrader.com
METATRADER_CLIENT_ID=your_metatrader_client_id
METATRADER_CLIENT_SECRET=your_metatrader_client_secret

# Zerodha (Kite Connect) Configuration
ZERODHA_BASE_URL=https://api.kite.trade
ZERODHA_API_KEY=your_zerodha_api_key
ZERODHA_API_SECRET=your_zerodha_api_secret

# Logging Configuration
LOG_LEVEL=info
LOG_API_CALLS=true

# Rate Limiting (requests per minute)
RATE_LIMIT_PER_MINUTE=60

# Token Management
TOKEN_REFRESH_SKEW_MS=30000
```

## Broker-Specific Configuration

### MetaTrader
- **Base URL**: The MetaTrader API endpoint
- **Client ID**: Your MetaTrader application client ID
- **Client Secret**: Your MetaTrader application client secret

### Zerodha (Kite Connect)
- **Base URL**: Kite Connect API endpoint (usually https://api.kite.trade)
- **API Key**: Your Kite Connect API key
- **API Secret**: Your Kite Connect API secret

## Security Notes

1. **Never commit your `.env` file** to version control
2. **Use environment-specific configurations** for different deployments
3. **Rotate API keys regularly** for security
4. **Use HTTPS** for all API communications
5. **Implement proper error handling** for API failures

## Testing

Use sandbox credentials or a staging environment from your broker when testing.

---

## 🧠 Design Decisions

- **Abstract adapter class** (`IBrokerAdapter`) gives a clear contract and allows common orchestration in services.
- **Normalization separate from fetching**: fetch returns broker raw rows; service applies a broker-specific normalizer to map into the `Trade` model.
- **In-memory token service** to simulate per-user tokens with expiry and refresh; easily swappable with DB/Redis in real systems.
- **Strict TS types** improve clarity and future maintainability.

---

## ➕ Adding a New Broker

1. Create `src/adapters/MyBrokerAdapter.ts` extending `IBrokerAdapter`:
   - `getName(): 'mybroker'`
   - `fetchTrades(token)` → returns raw trades as returned by the broker
   - `refreshToken(oldToken)` → returns `{ accessToken, refreshToken, expiresAt }`
2. Register in `src/adapters/index.ts`:
   - `registry.mybroker = new MyBrokerAdapter()`
3. Add a normalizer in `src/utils/helpers.ts` and update `SyncService` switch-case to use it.

---

## ✅ Assumptions & Simplifications

- Real broker APIs are used (no mock mode).
- In-memory token storage (swap with DB/Redis in production).
- Two brokers supported: `metatrader` and `zerodha`.
- Robust error handling, logging, and configuration.

---

## 🌐 Real API Integration

The system is **production-ready** for real broker API integration:

### 🔧 Quick Setup for Real APIs

1. **Configure Broker Credentials**:
```bash
# MetaTrader
METATRADER_CLIENT_ID=your_client_id
METATRADER_CLIENT_SECRET=your_client_secret

# Zerodha
ZERODHA_API_KEY=your_api_key
ZERODHA_API_SECRET=your_api_secret
```

2. **Run with Real APIs**:
```bash
npm run dev:api
```

### 🚀 Features for Real APIs

- ✅ **HTTP Client**: Axios-based HTTP client with retry logic
- ✅ **Error Handling**: Comprehensive error handling for API failures
- ✅ **Token Management**: Automatic token refresh with expiry handling
- ✅ **Rate Limiting**: Built-in rate limiting and retry mechanisms
- ✅ **Logging**: Detailed API call logging and debugging
- ✅ **Configuration**: Environment-based configuration system
- ✅ **Security**: HTTPS-only communication with credential management

### 📚 Documentation

- **[API Integration Guide](./API_INTEGRATION_GUIDE.md)**: Complete guide for real API setup
- **[Configuration Guide](./src/config/README.md)**: Environment and broker configuration

---

## 🧱 Architecture Diagram (Mermaid)

```mermaid
flowchart LR
  A[Caller: syncTrades(userId, broker)] --> B[getAdapter(broker)]
  B --> C{Adapter}
  A --> D[getValidToken(userId, broker, adapter)]
  D -->|expired/missing| E[adapter.refreshToken]
  D -->|valid| F[adapter.fetchTrades]
  E --> F
  F --> G[Normalizer (per broker)]
  G --> H[Trade[]]
```

---

## (Optional) API Notes

The Express server exposes a single endpoint `POST /sync`. See "Run the HTTP Server (Express)" above for curl examples.

---

## (Optional) Walkthrough Video

Link: <your-video-link-here>

---

## Submission

- Source code ready for a GitHub repo.
- This README includes design decisions, how to add a broker, assumptions, architecture diagram, and run instructions.