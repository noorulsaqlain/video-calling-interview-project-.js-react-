import {
    CallControls,
    CallingState,
    PaginatedGridLayout,
    useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { Loader2Icon, MessageSquareIcon, UsersIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Channel, Chat, MessageInput, MessageList, Thread, Window } from "stream-chat-react";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "stream-chat-react/dist/css/v2/index.css";

function VideoCallUI({ chatClient, channel, onLeaveSession, isLeavingSession }) {
    const { useCallCallingState, useParticipantCount } = useCallStateHooks();
    const callingState = useCallCallingState();
    const participantCount = useParticipantCount();
    const [isChatOpen, setIsChatOpen] = useState(false);

    if (callingState === CallingState.JOINING) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <Loader2Icon className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                    <p className="text-lg">Joining call...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex gap-4 relative str-video">
            <div className="min-w-0 flex-1 flex flex-col rounded-xl border border-[#2c2326] bg-[#171214] p-4 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[#34282c] bg-[#241b1f] p-4">
                    <div className="flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-emerald-400" />
                        <span className="font-semibold text-[#f2ece7]">
                            {participantCount} {participantCount === 1 ? "participant" : "participants"}
                        </span>
                    </div>
                    {chatClient && channel && (
                        <button
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={`btn btn-sm gap-2 ${isChatOpen ? "btn-primary" : "btn-ghost"}`}
                            title={isChatOpen ? "Hide chat" : "Show chat"}
                        >
                            <MessageSquareIcon className="size-4" />
                            Chat
                        </button>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#2a3945] bg-[#11202d] p-2">
                    <PaginatedGridLayout groupSize={4} />
                </div>

                <div className="mt-4 rounded-xl border border-[#34282c] bg-[#241b1f] p-4 shadow">
                    <div className="flex justify-center">
                        <CallControls onLeave={onLeaveSession} />
                    </div>
                    {isLeavingSession && (
                        <p className="mt-2 text-center text-sm text-base-content/60">
                            Releasing your session slot...
                        </p>
                    )}
                </div>
            </div>

            {chatClient && channel && (
                <div
                    className={`flex flex-col rounded-xl border border-[#2c2326] shadow overflow-hidden bg-[#272a30] transition-all duration-300 ease-in-out ${
                        isChatOpen ? "w-80 opacity-100" : "w-0 opacity-0"
                    }`}
                >
                    {isChatOpen && (
                        <>
                            <div className="bg-[#1c1e22] p-3 border-b border-[#3a3d44] flex items-center justify-between">
                                <h3 className="font-semibold text-white">Session Chat</h3>
                                <button
                                    onClick={() => setIsChatOpen(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                    title="Close chat"
                                >
                                    <XIcon className="size-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden stream-chat-dark">
                                <Chat client={chatClient} theme="str-chat__theme-dark">
                                    <Channel channel={channel}>
                                        <Window>
                                            <MessageList />
                                            <MessageInput />
                                        </Window>
                                        <Thread />
                                    </Channel>
                                </Chat>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default VideoCallUI;
