"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserContextType {
  user: User | null;
  userPet: any | null;
  userPets: any[];
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [userPet, setUserPet] = useState<any | null>(null);
  const [userPets, setUserPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    setLoading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser(authUser);

        // Load all user's active pets
        const { data: petsData } = await supabase
          .from("pets")
          .select("*")
          .eq("owner_id", authUser.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (petsData && petsData.length > 0) {
          setUserPets(petsData);
          setUserPet(petsData[0]); // First pet as default
        } else {
          setUserPets([]);
          setUserPet(null);
        }
      } else {
        setUser(null);
        setUserPet(null);
        setUserPets([]);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
      setUserPet(null);
      setUserPets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUser();
      } else {
        setUser(null);
        setUserPet(null);
        setUserPets([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{ user, userPet, userPets, loading, refreshUser: loadUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
