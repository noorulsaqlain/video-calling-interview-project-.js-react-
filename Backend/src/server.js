import express from "express";
import path from "path";
import cors from "cors";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { Serve } from "inngest/express";
import { inngest } from "./lib/inngest.js";

const app = express();

const __dirname = path.resolve();

// middlewares
app.use(express.json())
//credentials:true ?? MEANS SERVER ALLOWS TO BROWSER TO INCLDE COOKIES ON REQ
app.use(cors({origin:ENV.CLIENT_URL,credentials:true}))

app.use("/api/inngest", Serve({client: inngest, functions}))

app.get("/kela", (req, res) => {
  res.status(200).json({ msg: "Api is runnimg in server" });
});
app.get("/mango", (req, res) => {
  res.status(200).json({ msg: "this is the endpoint of Api" });
});
//make our app ready for deployment
if (ENV.NODE_ENV === "development") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const startServer = async () => {
  try {
    await connectDB();
  app.listen(ENV.PORT, () => {
    console.log("Server is running on port:", ENV.PORT);
  });
  } catch (error) {
    console.error("💨💨 error running in the server:",error);
  }
 
};

startServer();
