import { Router } from "express";
import { Trade } from "../models/Trade";
import { Types, PipelineStage } from "mongoose";

const router: Router = Router();

router.get("/optimize/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const userObjectId = new Types.ObjectId(userId);
    const days = 30;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - days);

    const pipeline = ([
      {
        $match: {
          userId: userObjectId,
          tradeDate: { $gte: windowStart },
        },
      },
      {
        $project: {
          strategyId: 1,
          riskLevel: 1,
          outcome: 1,
          win: 1,
          tradeDate: 1,
          riskScore: {
            $switch: {
              branches: [
                { case: { $eq: ["$riskLevel", "low"] }, then: 1 },
                { case: { $eq: ["$riskLevel", "medium"] }, then: 2 },
                { case: { $eq: ["$riskLevel", "high"] }, then: 3 },
              ],
              default: 2,
            },
          },
        },
      },
      {
        $facet: {
          byStrategy: [
            {
              $group: {
                _id: "$strategyId",
                total: { $sum: 1 },
                wins: {
                  $sum: {
                    $cond: [{ $eq: ["$win", true] }, 1, 0],
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                strategyId: "$_id",
                total: 1,
                wins: 1,
                winRate: {
                  $cond: [
                    { $gt: ["$total", 0] },
                    { $divide: ["$wins", "$total"] },
                    0,
                  ],
                },
              },
            },
            { $sort: { winRate: 1 } },
          ],
          byRisk: [
            {
              $group: {
                _id: "$riskLevel",
                avgOutcome: { $avg: "$outcome" },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                riskLevel: "$_id",
                avgOutcome: 1,
                count: 1,
              },
            },
            { $sort: { riskLevel: 1 } },
          ],
          perTrade: [
            {
              $project: {
                _id: 0,
                riskScore: 1,
                outcome: 1,
              },
            },
          ],
        },
      },
    ]) as unknown as PipelineStage[];

    const [result] = await Trade.aggregate(pipeline);

    const byStrategy: Array<{
      strategyId: string;
      total: number;
      wins: number;
      winRate: number;
    }> = result?.byStrategy ?? [];
    const byRisk: Array<{
      riskLevel: "low" | "medium" | "high" | string;
      avgOutcome: number;
      count: number;
    }> = result?.byRisk ?? [];
    const perTrade: Array<{ riskScore: number; outcome: number }> =
      result?.perTrade ?? [];

    // Underperforming strategies: winRate < 0.5
    const underperformingStrategies = byStrategy
      .filter((s) => s.total > 0 && s.winRate < 0.5)
      .map((s) => ({ strategyId: s.strategyId, winRate: s.winRate }));

    // Compute Pearson correlation between riskScore and outcome
    const n = perTrade.length;
    let correlation = null as number | null;
    if (n >= 2) {
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;
      let sumY2 = 0;
      for (const t of perTrade) {
        const x = t.riskScore ?? 0;
        const y = t.outcome ?? 0;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
      }
      const numerator = n * sumXY - sumX * sumY;
      const denomLeft = n * sumX2 - sumX * sumX;
      const denomRight = n * sumY2 - sumY * sumY;
      const denominator = Math.sqrt(denomLeft * denomRight);
      correlation = denominator === 0 ? null : numerator / denominator;
    }

    // Suggestions
    const suggestions: string[] = [];
    for (const s of underperformingStrategies) {
      suggestions.push(
        `Refine entry criteria for strategy ${s.strategyId}`
      );
    }

    const lowRisk = byRisk.find((r) => r.riskLevel === "low");
    if (lowRisk && lowRisk.count >= 3 && lowRisk.avgOutcome > 0) {
      suggestions.push("Increase position size for low-risk trades");
    }

    if (typeof correlation === "number" && correlation < -0.2) {
      suggestions.push("Reduce exposure to high-risk trades");
    }

    return res.status(200).json({
      userId,
      windowDays: days,
      underperformingStrategies,
      riskAverages: byRisk,
      riskOutcomeCorrelation: correlation,
      suggestions,
      meta: {
        totalTradesAnalyzed: n,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("/optimize error", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
