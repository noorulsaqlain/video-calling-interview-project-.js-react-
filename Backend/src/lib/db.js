import mongoose from "mongoose";

import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
    let conn;
    try {
      conn = await mongoose.connect(ENV.DB_URL, {
        serverSelectionTimeoutMS: 10000,
      });
    } catch (primaryError) {
      const primaryMsg = primaryError?.message || "";
      const isSrvIssue = primaryMsg.includes("querySrv");
      if (!isSrvIssue || !ENV.DB_URL_ALT) {
        throw primaryError;
      }

      conn = await mongoose.connect(ENV.DB_URL_ALT, {
        serverSelectionTimeoutMS: 10000,
      });
    }

    console.log("✅ connected to mongoDB:", conn.connection.host);
  } catch (error) {
    const msg = error?.message || "Unknown database error";
    if (msg.includes("❌ Could not connect to any servers")) {
      console.error(
        "error connecting to mongoDB: Atlas network access blocked. Add your current IP in Atlas Network Access."
      );
    } else if (msg.includes("querySrv")) {
      console.error(
        "error connecting to mongoDB: DNS/SRV lookup failed. Use the exact Atlas URI or switch to standard mongodb:// host list."
      );
    } else {
      console.error("error connecting to mongoDB:", msg);
    }
    process.exit(1); // 0 means success or 1 means failure
  }
};
