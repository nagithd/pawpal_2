"use client";

import { getStreamVideoToken } from "@/lib/actions/stream";
import {
  Call,
  CallControls,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import "@stream-io/video-react-sdk/dist/css/styles.css";

export default function CallPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const isIncoming = searchParams.get("incoming") === "true";

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [broadcastChannel, setBroadcastChannel] =
    useState<BroadcastChannel | null>(null);

  // Setup broadcast channel for communication with parent window
  useEffect(() => {
    const channel = new BroadcastChannel(`call-${matchId}`);
    setBroadcastChannel(channel);

    channel.onmessage = (event) => {
      if (event.data.type === "END_CALL") {
        handleCallEnd();
      }
    };

    return () => {
      channel.close();
    };
  }, [matchId]);

  useEffect(() => {
    let isMounted = true;

    async function initializeVideoCall() {
      if (hasJoined) {
        return;
      }

      try {
        setError(null);

        const { token, userId, userImage, userName } =
          await getStreamVideoToken();

        if (!isMounted) return;

        if (!process.env.NEXT_PUBLIC_STREAM_API_KEY) {
          throw new Error("NEXT_PUBLIC_STREAM_API_KEY is not set");
        }

        const videoClient = new StreamVideoClient({
          apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
          user: {
            id: userId!,
            name: userName,
            image: userImage,
          },
          token,
        });

        if (!isMounted) return;

        const videoCall = videoClient.call("default", matchId);
        if (isIncoming) {
          await videoCall.join();
        } else {
          await videoCall.join({ create: true });
        }
        if (!isMounted) return;

        setClient(videoClient);
        setCall(videoCall);
        setHasJoined(true);
        setCallStartTime(Date.now());

        // Notify that we successfully joined - this helps clear timeout
        // Small delay to ensure broadcastChannel is ready
        setTimeout(() => {
          if (broadcastChannel) {
            broadcastChannel.postMessage({ type: "CALL_ACCEPTED" });
            console.log(" Successfully joined call - Sent CALL_ACCEPTED");
          }
        }, 500);
      } catch (error: any) {
        console.error("❌ Call error:", error);
        console.error("Error details:", error.message, error.stack);
        setError(error.message || "Failed to initiate call");
      } finally {
        setLoading(false);
      }
    }

    initializeVideoCall();

    return () => {
      isMounted = false;
      if (call && hasJoined) {
        call.leave();
      }

      if (client) {
        client.disconnectUser();
      }
    };
  }, [matchId, isIncoming, hasJoined]);

  // Listen for when the other participant leaves
  useEffect(() => {
    if (!call) return;

    const handleParticipantLeft = () => {
      console.log("👋 Other participant left the call");
      // End call immediately when other person leaves
      handleCallEnd();
    };

    // Listen to call events
    call.on("call.session_participant_left", handleParticipantLeft);

    return () => {
      call.off("call.session_participant_left", handleParticipantLeft);
    };
  }, [call]);

  const handleCallEnd = async () => {
    // Calculate call duration
    let duration = 0;
    if (callStartTime) {
      duration = Math.floor((Date.now() - callStartTime) / 1000);
      console.log("📞 Call duration:", duration, "seconds");

      // Only save if call lasted more than 0 seconds
      // AND only the caller (not incoming) saves to avoid duplicate records
      if (duration > 0 && !isIncoming) {
        try {
          await fetch("/api/messages/call-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchId,
              callType: "video", // Stream.io supports video by default
              duration,
              isIncoming: false, // Always false since only caller saves
            }),
          });
          console.log("✅ Call history saved");
        } catch (error) {
          console.error("❌ Error saving call history:", error);
        }
      }
    }

    // Notify parent window that call ended
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: "CALL_ENDED",
        duration,
      });
    }

    window.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">
            {isIncoming ? "Joining call..." : "Starting call..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center text-white max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Call Error</h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={handleCallEnd}
            className="bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 px-6 rounded-full hover:from-pink-600 hover:to-red-600 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Setting up call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-[125vh]">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <StreamTheme>
            {/* Use SpeakerLayout - it handles screen sharing automatically */}
            <div className="flex-1 min-h-0">
              <SpeakerLayout participantsBarPosition="top" />
            </div>
            <div className="flex-shrink-0 pb-safe">
              <CallControls onLeave={handleCallEnd} />
            </div>
          </StreamTheme>
        </StreamCall>
      </StreamVideo>
    </div>
  );
}

// export default function CallPage() {
//   const params = useParams();
//   const searchParams = useSearchParams();
//   const matchId = params.matchId as string;
//   const callType = searchParams.get("type") as CallType;
//   const isIncoming = searchParams.get("incoming") === "true";
//   const remotePetId = searchParams.get("remotePetId") as string;
//   const remotePetName = searchParams.get("remotePetName") as string;
//   const remotePetAvatar = searchParams.get("remotePetAvatar") as string;
//   const currentPetId = searchParams.get("currentPetId") as string;

//   const supabase = createClient();
//   const [callStatus, setCallStatus] = useState<
//     "connecting" | "ringing" | "active" | "ended"
//   >(isIncoming ? "ringing" : "connecting");
//   const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//   const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
//   const webrtcManagerRef = useRef<WebRTCManager | null>(null);
//   const callStartTimeRef = useRef<number | null>(null);
//   const broadcastChannel = useRef<BroadcastChannel | null>(null);

//   useEffect(() => {
//     // Initialize broadcast channel for communication with parent window
//     broadcastChannel.current = new BroadcastChannel(`call-${matchId}`);

//     broadcastChannel.current.onmessage = (event) => {
//       if (event.data.type === "END_CALL") {
//         handleEndCall();
//       }
//     };

//     // Initialize WebRTC
//     initializeCall();

//     // If outgoing call, start automatically after a small delay
//     // This ensures the page is fully loaded and can request permissions
//     if (!isIncoming) {
//       setTimeout(() => {
//         startCall();
//       }, 500);
//     }

//     return () => {
//       cleanup();
//     };
//   }, []);

//   const initializeCall = async () => {
//     if (!webrtcManagerRef.current) {
//       webrtcManagerRef.current = new WebRTCManager(matchId);

//       webrtcManagerRef.current.onRemoteStream((stream) => {
//         setRemoteStream(stream);
//       });

//       webrtcManagerRef.current.onCallEnd(() => {
//         handleEndCall();
//       });
//     }

//     // Subscribe to signals for BOTH incoming and outgoing calls
//     if (isIncoming) {
//       console.log("🟢 Incoming call - subscribing to receive offer");
//       // Wait for offer from caller
//       await webrtcManagerRef.current.subscribeToSignals(currentPetId);

//       // Signal to caller that we're ready to receive offer
//       console.log("🟢 Sending receiver-ready signal");
//       await webrtcManagerRef.current.sendReceiverReady(currentPetId);
//     }
//   };

//   const startCall = async () => {
//     if (!webrtcManagerRef.current) return;

//     try {
//       // Request permissions first with better error handling
//       console.log("Requesting media permissions for", callType);
//       const stream = await webrtcManagerRef.current.startCall(
//         callType,
//         remotePetId,
//         currentPetId,
//       );
//       console.log("Media stream acquired:", stream.getTracks());
//       setLocalStream(stream);

//       // Notify parent window that call started
//       broadcastChannel.current?.postMessage({ type: "CALL_STARTED" });
//     } catch (error: any) {
//       console.error("Error starting call:", error);

//       let errorMessage = "Could not access camera/microphone.";
//       if (error.name === "NotAllowedError") {
//         errorMessage =
//           "Permission denied. Please allow camera/microphone access and try again.";
//       } else if (error.name === "NotFoundError") {
//         errorMessage = "No camera/microphone found. Please check your devices.";
//       } else if (error.name === "NotReadableError") {
//         errorMessage =
//           "Camera/microphone is already in use by another application.";
//       }

//       alert(errorMessage);
//       window.close();
//     }
//   };

//   const acceptCall = async () => {
//     if (!webrtcManagerRef.current) return;

//     try {
//       console.log("Accepting call and requesting media for", callType);
//       const stream = await webrtcManagerRef.current.acceptCall(
//         callType,
//         remotePetId,
//         currentPetId,
//       );
//       console.log("Media stream acquired:", stream.getTracks());
//       setLocalStream(stream);
//       setCallStatus("active");
//       callStartTimeRef.current = Date.now();

//       // Notify parent window that call was accepted
//       broadcastChannel.current?.postMessage({ type: "CALL_ACCEPTED" });
//     } catch (error: any) {
//       console.error("Error accepting call:", error);

//       let errorMessage = "Could not access camera/microphone.";
//       if (error.name === "NotAllowedError") {
//         errorMessage =
//           "Permission denied. Please allow camera/microphone access in your browser settings and refresh.";
//       } else if (error.name === "NotFoundError") {
//         errorMessage = "No camera/microphone found. Please check your devices.";
//       } else if (error.name === "NotReadableError") {
//         errorMessage =
//           "Camera/microphone is already in use by another application.";
//       }

//       alert(errorMessage);
//       window.close();
//     }
//   };

//   const rejectCall = async () => {
//     if (webrtcManagerRef.current) {
//       await webrtcManagerRef.current.sendRejectSignal();
//     }

//     // Notify parent window that call was rejected
//     broadcastChannel.current?.postMessage({ type: "CALL_REJECTED" });

//     cleanup();
//     window.close();
//   };

//   const handleEndCall = async () => {
//     // Calculate duration and save history
//     let duration = 0;
//     if (callStartTimeRef.current) {
//       duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);

//       if (duration > 0) {
//         try {
//           await fetch("/api/messages/call-history", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               matchId,
//               callType,
//               duration,
//             }),
//           });
//         } catch (error) {
//           console.error("Error saving call history:", error);
//         }
//       }
//     }

//     // Notify parent window that call ended
//     broadcastChannel.current?.postMessage({
//       type: "CALL_ENDED",
//       duration,
//     });

//     cleanup();
//     window.close();
//   };

//   const cleanup = () => {
//     if (webrtcManagerRef.current) {
//       webrtcManagerRef.current.endCall();
//       webrtcManagerRef.current = null;
//     }

//     if (localStream) {
//       localStream.getTracks().forEach((track) => track.stop());
//       setLocalStream(null);
//     }

//     if (broadcastChannel.current) {
//       broadcastChannel.current.close();
//     }
//   };

//   // Listen for answer event from WebRTC
//   useEffect(() => {
//     if (!isIncoming) {
//       // For outgoing calls, listen for when call is answered
//       const channel = supabase.channel(`call:${matchId}`);
//       channel
//         .on("broadcast", { event: "answer" }, (payload: any) => {
//           if (payload.payload.to === currentPetId) {
//             setCallStatus("active");
//             callStartTimeRef.current = Date.now();
//           }
//         })
//         .subscribe();

//       return () => {
//         channel.unsubscribe();
//       };
//     }
//   }, [isIncoming, matchId, currentPetId]);

//   return (
//     <VideoCallModal
//       isOpen={true}
//       callType={callType}
//       isIncoming={isIncoming}
//       callerName={remotePetName || "Unknown"}
//       callerAvatar={remotePetAvatar || null}
//       onAccept={acceptCall}
//       onReject={rejectCall}
//       onEnd={handleEndCall}
//     </div>
//   );
// }
