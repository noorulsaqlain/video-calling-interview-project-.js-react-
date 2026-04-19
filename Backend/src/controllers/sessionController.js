import { chatClient, streamClient, upsertStreamUser } from "../lib/stream.js";
import Session from "../models/Session.js";

export async function createSession(req, res) {
  try {
    const { problem, difficulty } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    console.log(`[Session] Creating session for user ${clerkId} with problem ${problem}`);

    if (!problem || !difficulty) {
      return res.status(400).json({ message: "Problem and difficulty are required" });
    }

    // generate a unique call id for stream video
    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // create session in db
    console.log("[Session] Saving to database...");
    const session = await Session.create({ problem, difficulty, host: userId, callId });
    console.log(`[Session] Database record created: ${session._id}`);

    // ensure user exists in stream
    console.log("[Session] Syncing user to Stream...");
    await upsertStreamUser({
      id: clerkId,
      name: req.user.name,
      image: req.user.profileImage,
    });

    // create stream video call
    console.log("[Session] Creating Stream Video call...");
    await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { problem, difficulty, sessionId: session._id.toString() },
      },
    });

    // chat messaging
    console.log("[Session] Creating Stream Chat channel...");
    const channel = chatClient.channel("messaging", callId, {
      name: `${problem} Session`,
      created_by_id: clerkId,
      members: [clerkId],
    });

    await channel.create();

    console.log("[Session] Success! Session created.");
    res.status(201).json({ session });
  } catch (error) {
    console.error("❌ Error in createSession controller:", error);
    res.status(500).json({ message: error.message || "Failed to create session" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate("host", "name profileImage email clerkId")
      .populate("participant", "name profileImage email clerkId")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getActiveSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    // get sessions where user is either host or participant
    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(6);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getMyRecentSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participant", "name email profileImage clerkId");

    if (!session) return res.status(404).json({ message: "Session not found" });

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in getSessionById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    console.log(`[Diagnostic] Join Attempt - Session: ${id}, User: ${userId}, Host: ${session.host}, Current Participant: ${session.participant}`);

    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot join a completed session" });
    }

    if (session.host.toString() === userId.toString()) {
      return res.status(400).json({ message: "Host cannot join their own session as participant" });
    }

    // check if session is already full - has a participant
    if (session.participant) {
      // if the current user is already the participant, return success (idempotent)
      // BUT ensure they are synced to Stream chat first, in case a previous attempt crashed halfway.
      if (session.participant.toString() === userId.toString()) {
        await upsertStreamUser({
          id: clerkId,
          name: req.user.name,
          image: req.user.profileImage,
        });
        const channel = chatClient.channel("messaging", session.callId);
        await channel.addMembers([clerkId]);

        return res.status(200).json({ session });
      }

      // check if the recorded participant actually exists in the db (handle deleted/ghost accounts)
      const { default: User } = await import("../models/User.js");
      const existingParticipant = await User.findById(session.participant);

      if (existingParticipant) {
        return res.status(409).json({ message: "Session is full" });
      } else {
        console.log(`[Diagnostic] Removing ghost participant from session ${id}`);
        session.participant = null;
      }
    }

    // Ensure the joining user exists in Stream before adding to the channel
    await upsertStreamUser({
      id: clerkId,
      name: req.user.name,
      image: req.user.profileImage,
    });

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);

    // Only save to our database AFTER Stream succeeds, to prevent split-brain state
    session.participant = userId;
    await session.save();

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in joinSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function leaveSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
      return res.status(200).json({ session, message: "Session is already completed" });
    }

    if (!session.participant || session.participant.toString() !== userId.toString()) {
      return res.status(200).json({ session, message: "You are not the active participant" });
    }

    try {
      const channel = chatClient.channel("messaging", session.callId);
      await channel.removeMembers([clerkId]);
    } catch (error) {
      console.log("Stream chat member removal skipped:", error.message);
    }

    session.participant = null;
    await session.save();

    const populatedSession = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participant", "name email profileImage clerkId");

    res.status(200).json({
      session: populatedSession,
      message: "Session left successfully",
    });
  } catch (error) {
    console.log("Error in leaveSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if user is the host
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can end the session" });
    }

    // check if session is already completed
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    // delete stream video call
    try {
      const call = streamClient.video.call("default", session.callId);
      await call.delete({ hard: true });
    } catch (error) {
      console.log("Stream video call already deleted or missing:", error.message);
    }

    // delete stream chat channel
    try {
      const channel = chatClient.channel("messaging", session.callId);
      await channel.delete();
    } catch (error) {
      console.log("Stream chat channel already deleted or missing:", error.message);
    }

    session.status = "completed";
    await session.save();

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.log("Error in endSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
