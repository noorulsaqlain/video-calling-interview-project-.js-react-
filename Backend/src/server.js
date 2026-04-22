import express from "express";
import path from "path";
import cors from "cors";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { serve } from "inngest/express";
import { clerkMiddleware } from '@clerk/express'

import { functions, inngest } from "./lib/inngest.js";
import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";

const app = express();

const __dirname = path.resolve();

// middlewares
app.use(express.json())
// CORS configuration
const allowedOrigins = [
  ENV.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isVercel = origin && (origin.endsWith(".vercel.app") || /^https?:\/\/.*\.vercel\.app$/.test(origin));
    const isLocal = origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
    const isAllowed = origin && allowedOrigins.includes(origin);

    if (isAllowed || isVercel || isLocal || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));

app.use(clerkMiddleware()); // this adds auth field to request object: req.auth()


app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "Api is runnimg in server" });
});

//make our app ready for deployment
if (ENV.NODE_ENV === "development") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

if (process.env.NODE_ENV !== "production") {
  const startServer = async () => {
    try {
      await connectDB();
      app.listen(ENV.PORT, () => {
        console.log("Server is running on port:", ENV.PORT);
      });
    } catch (error) {
      console.error("💨💨 error running in the server:", error);
    }
  };

  startServer();
} else {
  // In production (Vercel serverless execution), connect to DB directly.
  // Mongoose handles queueing requests until the connection is established.
  connectDB().catch(err => console.error("Error connecting to DB:", err));
}

export default app;
