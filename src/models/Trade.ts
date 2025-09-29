import { Schema, model, Document } from "mongoose";

// Normalized Trade interface for broker integration
export interface INormalizedTrade {
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string; 
  side: 'BUY' | 'SELL';
}

// Original Trade interface for strategy optimization
interface ITrade extends Document {
  userId: Schema.Types.ObjectId;
  strategyId: string;
  tradeDate: Date;
  riskLevel: "low" | "medium" | "high";
  outcome: number;
  win: boolean;
  performanceNotes: string;
}

// Broker Trade interface for storing normalized trades
interface IBrokerTrade extends Document {
  userId: Schema.Types.ObjectId;
  brokerName: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: Date;
  side: 'BUY' | 'SELL';
  rawData?: any; // Store original broker data for reference
}

const TradeSchema = new Schema<ITrade>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    strategyId: { type: String, required: true },
    tradeDate: { type: Date, required: true },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    outcome: { type: Number, required: true },
    win: { type: Boolean, required: true },
    performanceNotes: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

const BrokerTradeSchema = new Schema<IBrokerTrade>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    brokerName: { type: String, required: true },
    symbol: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    side: { type: String, enum: ['BUY', 'SELL'], required: true },
    rawData: { type: Schema.Types.Mixed, required: false },
  },
  {
    timestamps: true,
  }
);

export const Trade = model<ITrade>("Trade", TradeSchema);
export const BrokerTrade = model<IBrokerTrade>("BrokerTrade", BrokerTradeSchema);
