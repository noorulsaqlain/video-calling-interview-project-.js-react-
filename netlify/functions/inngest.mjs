// netlify/functions/inngest.mjs
import { Inngest } from "inngest";
import { serve } from "inngest/netlify";
import mongoose from "mongoose";

// --- MongoDB Connection ---
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const dbUrl = Netlify.env.get("DB_URL");
  if (!dbUrl) throw new Error("DB_URL is not defined in environment variables");
  await mongoose.connect(dbUrl);
  isConnected = true;
}

// --- User Model ---
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    profileImage: { type: String, default: "" },
    clerkId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

// --- Inngest Client & Functions ---
export const inngest = new Inngest({ id: "online-interview" });

const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    await connectDB();
    const { id, email_addresses, first_name, last_name, image_url } = event.data;
    const newUser = {
      clerkId: id,
      email: email_addresses[0]?.email_address,
      name: `${first_name || ""} ${last_name || ""}`,
      profileImage: image_url,
    };
    await User.create(newUser);
  }
);

const deleteUserFromDB = inngest.createFunction(
  { id: "delete-user-from-db" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    await connectDB();
    const { id } = event.data;
    await User.deleteOne({ clerkId: id });
  }
);

const functions = [syncUser, deleteUserFromDB];

// --- Netlify Handler via Inngest serve ---
const handler = serve({ client: inngest, functions });

export default handler;

export const config = {
  path: "/api/inngest",
};
