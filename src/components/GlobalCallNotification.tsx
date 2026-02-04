"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/contexts/UserContext";
import { IoCall, IoVideocam, IoClose } from "react-icons/io5";
import Image from "next/image";

interface IncomingCall {
  matchId: string;
  callType: "audio" | "video";
  callerPetId: string;
  callerPetName: string;
  callerPetAvatar: string | null;
  currentPetId: string;
}

export default function GlobalCallNotification() {
  const supabase = createClient();
  const { user } = useUser();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPets, setUserPets] = useState<any[]>([]);
  const callChannelsRef = useRef<Map<string, any>>(new Map());
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }

    // Setup ringtone
    if (typeof window !== "undefined") {
      // Sử dụng simple beep thay vì file
      // ringtoneRef.current = new Audio("/ringtone.mp3");
      // ringtoneRef.current.loop = true;
    }

    return () => {
      // Cleanup all channels
      callChannelsRef.current.forEach((channel) => {
        channel.unsubscribe();
      });
      callChannelsRef.current.clear();

      // Stop ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, []);

  const loadUserData = async () => {
    if (!user) {
      return;
    }
    setCurrentUserId(user.id);
    // Load user's pets
    const { data: petsData } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", user.id)
      .eq("is_active", true);
    if (petsData) {
      setUserPets(petsData);
      subscribeToAllMatches(petsData);
    }
  };

  const subscribeToAllMatches = async (pets: any[]) => {
    // Get all matches for user's pets
    const petIds = pets.map((p) => p.id);

    const { data: matches } = await supabase
      .from("matches")
      .select(
        `
        id, 
        pet_1_id, 
        pet_2_id,
        pet1:pets!matches_pet_1_id_fkey(id, name, avatar_url),
        pet2:pets!matches_pet_2_id_fkey(id, name, avatar_url)
      `,
      )
      .or(
        `pet_1_id.in.(${petIds.join(",")}),pet_2_id.in.(${petIds.join(",")})`,
      );

    if (!matches || matches.length === 0) {
      return;
    }

    // Subscribe to each match's call channel
    matches.forEach((match: any) => {
      const currentPet = pets.find(
        (p) => p.id === match.pet_1_id || p.id === match.pet_2_id,
      );
      const otherPet =
        match.pet_1_id === currentPet.id ? match.pet2 : match.pet1;

      const channelName = `call:${match.id}`;
      const channel = supabase.channel(channelName);

      channel
        .on("broadcast", { event: "incoming-call" }, async (payload: any) => {
          if (payload.payload.to === currentPet.id) {
            // Incoming call!
            setIncomingCall({
              matchId: match.id,
              callType: payload.payload.type,
              callerPetId: payload.payload.from,
              callerPetName: otherPet?.name || "Unknown",
              callerPetAvatar: otherPet?.avatar_url || null,
              currentPetId: currentPet.id,
            });

            // Play ringtone
            if (ringtoneRef.current) {
              ringtoneRef.current
                ?.play()
                .catch((e) => console.error("Ringtone error:", e));
            } else {
            }
          }
        })
        .subscribe((status) => {
          console.log(
            "📡 Subscribed to call channel:",
            match.id,
            "status:",
            status,
          );
        });

      callChannelsRef.current.set(match.id, channel);
    });
  };

  const handleAccept = () => {
    if (!incomingCall) return;

    // Stop ringtone
    ringtoneRef.current?.pause();
    if (ringtoneRef.current) {
      ringtoneRef.current.currentTime = 0;
    }

    // Open call window with Stream.io
    const callUrl = `/call/${incomingCall.matchId}?incoming=true`;

    window.open(callUrl, "_blank", "width=800,height=600");

    // Clear notification
    setIncomingCall(null);
  };

  const handleReject = async () => {
    if (!incomingCall) return;

    // Stop ringtone
    ringtoneRef.current?.pause();
    if (ringtoneRef.current) {
      ringtoneRef.current.currentTime = 0;
    }

    // Send rejection signal
    const channel = supabase.channel(`call:${incomingCall.matchId}`);
    await channel.send({
      type: "broadcast",
      event: "call-rejected",
      payload: {},
    });

    // Clear notification
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scaleIn">
        <div className="text-center">
          {/* Caller Avatar */}
          <div className="mb-6">
            {incomingCall.callerPetAvatar ? (
              <Image
                src={incomingCall.callerPetAvatar}
                alt={incomingCall.callerPetName}
                width={120}
                height={120}
                className="rounded-full mx-auto object-cover ring-4 ring-pink-500 animate-pulse"
              />
            ) : (
              <div className="w-30 h-30 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold mx-auto ring-4 ring-pink-500 animate-pulse">
                {incomingCall.callerPetName?.[0] || "?"}
              </div>
            )}
          </div>

          {/* Caller Name */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {incomingCall.callerPetName}
          </h2>

          {/* Call Type */}
          <p className="text-lg text-gray-600 mb-8">
            {incomingCall.callType === "video" ? (
              <span className="flex items-center justify-center gap-2">
                <IoVideocam className="text-2xl" />
                Incoming video call...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <IoCall className="text-2xl" />
                Incoming call...
              </span>
            )}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-6 justify-center">
            <button
              onClick={handleReject}
              className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
            >
              <IoClose size={40} className="text-white" />
            </button>
            <button
              onClick={handleAccept}
              className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
            >
              {incomingCall.callType === "video" ? (
                <IoVideocam size={40} className="text-white" />
              ) : (
                <IoCall size={40} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
