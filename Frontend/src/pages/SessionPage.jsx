import { useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useEndSession, useJoinSession, useLeaveSession, useSessionById } from "../hooks/useSessions";
import { PROBLEMS } from "../data/problems";
import { executeCode } from "../lib/piston";
import Navbar from "../components/Navbar";
import { Panel, Group, Separator } from "react-resizable-panels";
import { getDifficultyBadgeClass } from "../lib/utils";
import { Loader2Icon, LogOutIcon, PhoneOffIcon } from "lucide-react";
import CodeEditorPanel from "../components/CodeEditorPanel";
import OutputPanel from "../components/OutputPanel";
import useStreamClient from "../hooks/useStreamClient";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI";

function SessionPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useUser();
    const [output, setOutput] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    const sidebarRef = useRef(null);
    const outputRef = useRef(null);
    const hasAttemptedJoin = useRef(false);
    const hasReleasedSlot = useRef(false);

    const toggleSidebar = () => {
        const sidebar = sidebarRef.current;
        if (!sidebar) return;

        if (sidebar.isCollapsed()) {
            sidebar.expand();
        } else {
            sidebar.collapse();
        }
    };

    const toggleOutput = () => {
        const outputPanel = outputRef.current;
        if (!outputPanel) return;

        if (outputPanel.isCollapsed()) {
            outputPanel.expand();
        } else {
            outputPanel.collapse();
        }
    };

    const { data: sessionData, isLoading: loadingSession, refetch } = useSessionById(id);
    const joinSessionMutation = useJoinSession();
    const leaveSessionMutation = useLeaveSession();
    const endSessionMutation = useEndSession();

    const session = sessionData?.session;
    const isHost = session?.host?.clerkId === user?.id;
    const isParticipant = session?.participant?.clerkId === user?.id;
    const participantCount = session?.participant ? 2 : 1;
    const isSessionFull = Boolean(session?.participant && !isHost && !isParticipant);

    const { call, channel, chatClient, isInitializingCall, streamClient } = useStreamClient(
        session,
        loadingSession,
        isHost,
        isParticipant
    );

    const problemData = session?.problem
        ? Object.values(PROBLEMS).find((problem) => problem.title === session.problem)
        : null;

    const [selectedLanguage, setSelectedLanguage] = useState("javascript");
    const [draftCode, setDraftCode] = useState({});
    const code = draftCode[selectedLanguage] ?? problemData?.starterCode?.[selectedLanguage] ?? "";

    useEffect(() => {
        hasAttemptedJoin.current = false;
        hasReleasedSlot.current = false;
    }, [id]);

    useEffect(() => {
        if (!session || !user || loadingSession || joinSessionMutation.isPending) return;
        if (isHost || isParticipant) return;
        if (hasAttemptedJoin.current) return;

        hasAttemptedJoin.current = true;
        joinSessionMutation.mutate(id, {
            onSuccess: refetch,
            onError: () => {
                console.error("Failed to join session. Might be full.");
            },
        });
    }, [session, user, loadingSession, isHost, isParticipant, id, joinSessionMutation, refetch]);

    useEffect(() => {
        if (!session || loadingSession) return;

        if (session.status === "completed") {
            navigate("/dashboard");
        }
    }, [session, loadingSession, navigate]);

    useEffect(() => {
        if (!id || !isParticipant || session?.status !== "active") return;

        const handlePageHide = () => {
            if (hasReleasedSlot.current) return;

            hasReleasedSlot.current = true;
            const apiBase = import.meta.env.VITE_API_URL || "";

            fetch(`${apiBase}/sessions/${id}/leave`, {
                method: "POST",
                credentials: "include",
                keepalive: true,
            }).catch(() => {
                hasReleasedSlot.current = false;
            });
        };

        window.addEventListener("pagehide", handlePageHide);
        return () => window.removeEventListener("pagehide", handlePageHide);
    }, [id, isParticipant, session?.status]);

    const handleLanguageChange = (event) => {
        setSelectedLanguage(event.target.value);
        setOutput(null);
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput(null);

        const result = await executeCode(selectedLanguage, code);
        setOutput(result);
        setIsRunning(false);
    };

    const handleLeaveSession = async () => {
        if (!isParticipant || !session || session.status !== "active") {
            navigate("/dashboard");
            return;
        }

        if (!hasReleasedSlot.current) {
            hasReleasedSlot.current = true;

            try {
                await leaveSessionMutation.mutateAsync(id);
            } catch {
                hasReleasedSlot.current = false;
                return;
            }
        }

        navigate("/dashboard");
    };

    const handleEndSession = () => {
        if (confirm("Are you sure you want to end this session? All participants will be notified.")) {
            endSessionMutation.mutate(id, { onSuccess: () => navigate("/dashboard") });
        }
    };

    if (!loadingSession && session && isSessionFull) {
        return (
            <div className="h-screen bg-[#120f10] flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="mb-4 text-3xl font-bold text-error">Session is Full</h1>
                        <p className="text-base-content/70">There are already 2 participants in this session.</p>
                        <button className="btn btn-primary mt-6" onClick={() => navigate("/dashboard")}>
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#120f10] flex flex-col">
            <Navbar />

            <div className="flex-1 overflow-hidden">
                <Group direction="horizontal" autoSaveId="session-horizontal-layout">
                    <Panel defaultSize={52} minSize={34} id="workspace-column">
                        <div className="h-full p-3 pl-4">
                            <div className="h-full overflow-hidden rounded-xl border border-[#2c2326] bg-[#171214] shadow-xl">
                                <div className="border-b border-[#34282c] bg-[#21181c] px-5 py-4">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <h1 className="text-3xl font-bold text-[#f2ece7]">
                                                {session?.problem || "Loading..."}
                                            </h1>
                                            {problemData?.category && (
                                                <p className="mt-1 text-sm text-[#b0a6a0]">{problemData.category}</p>
                                            )}
                                            <p className="mt-3 text-sm text-[#b0a6a0]">
                                                Host: {session?.host?.name || "Loading..."} / {participantCount}/2 participants
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`badge badge-lg ${getDifficultyBadgeClass(session?.difficulty)}`}>
                                                {session?.difficulty?.slice(0, 1).toUpperCase() +
                                                    session?.difficulty?.slice(1) || "Easy"}
                                            </span>
                                            {isHost && session?.status === "active" && (
                                                <button
                                                    onClick={handleEndSession}
                                                    disabled={endSessionMutation.isPending}
                                                    className="btn btn-error btn-sm gap-2"
                                                >
                                                    {endSessionMutation.isPending ? (
                                                        <Loader2Icon className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <LogOutIcon className="w-4 h-4" />
                                                    )}
                                                    End Session
                                                </button>
                                            )}
                                            {session?.status === "completed" && (
                                                <span className="badge badge-ghost badge-lg">Completed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[calc(100%-96px)] p-3">
                                    <Group direction="vertical" autoSaveId="session-left-main-stack">
                                        <Panel defaultSize={30} minSize={18} collapsible={true} ref={sidebarRef}>
                                            <div className="h-full overflow-hidden rounded-lg border border-[#34282c] bg-[#21181c]">
                                                <div className="border-b border-[#34282c] px-4 py-3">
                                                    <h2 className="text-xl font-bold text-[#f2ece7]">Description</h2>
                                                </div>

                                                <div className="h-[calc(100%-57px)] overflow-y-auto p-4 space-y-5">
                                                    {problemData?.description && (
                                                        <div className="space-y-3 text-sm leading-7 text-[#ddd3cc]">
                                                            <p>{problemData.description.text}</p>
                                                            {problemData.description.notes?.map((note, idx) => (
                                                                <p key={idx}>{note}</p>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {problemData?.examples && problemData.examples.length > 0 && (
                                                        <div className="space-y-4">
                                                            {problemData.examples.map((example, idx) => (
                                                                <div key={idx} className="rounded-lg bg-[#171214] p-4">
                                                                    <p className="mb-2 text-sm font-semibold text-[#f2ece7]">
                                                                        Example {idx + 1}
                                                                    </p>
                                                                    <div className="space-y-1 text-sm font-mono text-[#cfc4bd]">
                                                                        <p>Input: {example.input}</p>
                                                                        <p>Output: {example.output}</p>
                                                                        {example.explanation && (
                                                                            <p className="font-sans text-xs text-[#a49891]">
                                                                                Explanation: {example.explanation}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {problemData?.constraints && problemData.constraints.length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-sm font-semibold text-[#f2ece7]">Constraints</p>
                                                            {problemData.constraints.map((constraint, idx) => (
                                                                <div key={idx} className="rounded-lg bg-[#171214] px-3 py-2">
                                                                    <code className="text-sm">{constraint}</code>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Panel>

                                        <Separator className="h-2 bg-[#2b2225] hover:bg-[#3f3136] transition-colors cursor-row-resize" />

                                        <Panel defaultSize={50} minSize={24} id="editor-panel">
                                            <div className="h-full overflow-hidden rounded-lg border border-[#34282c] shadow-xl">
                                                <CodeEditorPanel
                                                    selectedLanguage={selectedLanguage}
                                                    code={code}
                                                    isRunning={isRunning}
                                                    onLanguageChange={handleLanguageChange}
                                                    onCodeChange={(value) =>
                                                        setDraftCode((currentDraftCode) => ({
                                                            ...currentDraftCode,
                                                            [selectedLanguage]: value ?? "",
                                                        }))
                                                    }
                                                    onRunCode={handleRunCode}
                                                    toggleSidebar={toggleSidebar}
                                                    toggleOutput={toggleOutput}
                                                />
                                            </div>
                                        </Panel>

                                        <Separator className="h-2 bg-[#2b2225] hover:bg-[#3f3136] transition-colors cursor-row-resize" />

                                        <Panel defaultSize={20} minSize={12} collapsible={true} ref={outputRef} id="output-panel">
                                            <div className="h-full overflow-hidden rounded-lg border border-[#34282c] bg-[#171214] shadow-xl">
                                                <OutputPanel output={output} />
                                            </div>
                                        </Panel>
                                    </Group>
                                </div>
                            </div>
                        </div>
                    </Panel>

                    <Separator className="w-2 bg-[#2b2225] hover:bg-[#3f3136] transition-colors cursor-col-resize" />

                    <Panel defaultSize={48} minSize={32}>
                        <div className="h-full p-3 pr-4">
                            {isInitializingCall ? (
                                <div className="h-full flex items-center justify-center rounded-xl border border-[#2c2326] bg-[#1c1518]">
                                    <div className="text-center">
                                        <Loader2Icon className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
                                        <p className="text-lg">Connecting to video call...</p>
                                    </div>
                                </div>
                            ) : !streamClient || !call ? (
                                <div className="h-full flex items-center justify-center rounded-xl border border-[#2c2326] bg-[#1c1518]">
                                    <div className="card max-w-md bg-base-100 shadow-xl">
                                        <div className="card-body items-center text-center">
                                            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-error/10">
                                                <PhoneOffIcon className="h-12 w-12 text-error" />
                                            </div>
                                            <h2 className="card-title text-2xl">Connection Failed</h2>
                                            <p className="text-base-content/70">Unable to connect to the video call</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full rounded-xl border border-[#2c2326] bg-[#100d0e] p-3 shadow-xl">
                                    <StreamVideo client={streamClient}>
                                        <StreamCall call={call}>
                                            <VideoCallUI
                                                chatClient={chatClient}
                                                channel={channel}
                                                onLeaveSession={handleLeaveSession}
                                                isLeavingSession={leaveSessionMutation.isPending}
                                            />
                                        </StreamCall>
                                    </StreamVideo>
                                </div>
                            )}
                        </div>
                    </Panel>
                </Group>
            </div>
        </div>
    );
}

export default SessionPage;
