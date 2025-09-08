# Journalyst Backend - Strategy Optimization Endpoint

## Overview
This backend adds a user strategy optimization endpoint that analyzes recent trades and returns underperforming strategies and actionable suggestions.

## Endpoint
- Method: `GET`
- Path: `/api/strategies/optimize/:userId`

### Behavior
- Looks at last 30 days of trades for the given `userId`.
- Computes win rate per `strategyId` and flags those below 50%.
- Computes average outcome grouped by `riskLevel` (`low`, `medium`, `high`).
- Calculates correlation between risk level (scored as low=1, medium=2, high=3) and outcome.
- Generates suggestions:
  - Refine entry criteria for underperforming strategies.
  - Increase position size for low-risk trades if average outcome is positive.
  - Reduce exposure to high-risk trades if correlation suggests higher risk → worse outcomes.

## Example Response
```json
{
  "userId": "66f0a6b5c5f8b4d6e3a9f012",
  "windowDays": 30,
  "underperformingStrategies": [
    { "strategyId": "mean-reversion", "winRate": 0.42 }
  ],
  "riskAverages": [
    { "riskLevel": "low", "avgOutcome": 45.2, "count": 12 },
    { "riskLevel": "medium", "avgOutcome": 5.7, "count": 9 },
    { "riskLevel": "high", "avgOutcome": -38.4, "count": 6 }
  ],
  "riskOutcomeCorrelation": -0.36,
  "suggestions": [
    "Refine entry criteria for strategy mean-reversion",
    "Increase position size for low-risk trades",
    "Reduce exposure to high-risk trades"
  ],
  "meta": {
    "totalTradesAnalyzed": 27,
    "generatedAt": "2025-01-01T12:00:00.000Z"
  }
}
```

## Implementation Notes
- Implemented in `src/routes/strategies.ts` with a MongoDB aggregation utilizing `$facet` to compute:
  - `byStrategy`: totals, wins, winRate per strategy
  - `byRisk`: average outcome per risk level
  - `perTrade`: per-trade `riskScore` and `outcome` used for correlation
- Correlation is computed in TypeScript without external libraries (Pearson correlation on riskScore vs outcome).

## Testing & Edge Cases
- No trades in last 30 days: endpoint returns empty lists, `riskOutcomeCorrelation` may be `null`, suggestions empty.
- All wins: underperforming list empty; low-risk positive averages can trigger the size increase suggestion.
- All losses: underperforming likely populated; correlation may suggest reducing high-risk exposure if negative.
- Invalid `userId`: responds `400` with `{ error: "Invalid userId" }`.
- Server errors: responds `500` with `{ error: "Internal Server Error" }`.

## Local Development
1. Ensure MongoDB is running and `Trade` documents follow the schema in `src/models/Trade.ts`.
2. In `src/server.ts`, configure `MONGODB_URI` and enable the connection.
3. Install deps and start the server:
   - `npm i`
   - `npm run dev`
4. Hit the endpoint:
   - `GET http://localhost:3000/api/strategies/optimize/<userId>`

## Data Model
See `src/models/Trade.ts` for the `Trade` schema containing `userId`, `strategyId`, `tradeDate`, `riskLevel`, `outcome`, `win`, and optional `performanceNotes`.
