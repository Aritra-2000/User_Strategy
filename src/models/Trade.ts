import { Schema, model, Document } from "mongoose";

interface ITrade extends Document {
  userId: Schema.Types.ObjectId;
  strategyId: string;
  tradeDate: Date;
  riskLevel: "low" | "medium" | "high";
  outcome: number;
  win: boolean;
  performanceNotes: string;
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

export const Trade = model<ITrade>("Trade", TradeSchema);
