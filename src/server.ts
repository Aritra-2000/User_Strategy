import express, { Express, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import strategyRoutes from "./routes/strategies";

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || "3000", 10);
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/journalyst";

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("📦 Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/strategies", strategyRoutes);

app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
