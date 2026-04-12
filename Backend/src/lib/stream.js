import {streamChat} from  "stream-chat"
import { ENV } from "./env.js"

const apiKey = ENV.STREAM_API_KEY
const apiSecret = ENV.STREAM_API_SECRET

if(!apiKey || !apiSecret)
{
    console.log("STREAM_API_KEY and STREAM_API_SECRET is missing");
}

export const chatClient = streamChat.getInstance(apiKey,apiSecret);

export const upsertStreamUser = async(userData) => {
    try {
        await chatClient.upsertUser(userData);
        console.log("stream user upserted successfully",userData);
    } catch (error) {
        console.error("error in upserting stream user",error);
    }
}


export const deleteStreamUser = async(userId) => {
    try {
        await chatClient.deleteUser(userId);
         console.log("stream user deleted successfully",userId);
    } catch (error) {
        console.error("error in deleting the stream user",error);
    }
}

// todo add another method yo generate token 