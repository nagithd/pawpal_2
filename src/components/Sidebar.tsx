"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/contexts/UserContext";
import toast from "react-hot-toast";
import {
  IoHome,
  IoStorefront,
  IoChatbubbles,
  IoPerson,
  IoHeart,
  IoLogOut,
  IoCart,
  IoReceipt,
} from "react-icons/io5";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useUser();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      const getUserData = async () => {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (data) setUserData(data);
      };
      getUserData();
    } else {
      setUserData(null);
    }
  }, [user]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout error");
    } else {
      toast.success("Logged out successfully");
      router.push("/login");
    }
  };

  const menuItems = [
    { name: "Home", path: "/", icon: IoHome },
    { name: "Match", path: "/match", icon: IoHeart },
    { name: "Shop", path: "/shop", icon: IoStorefront },
    { name: "Messages", path: "/messages", icon: IoChatbubbles },
    { name: "Cart", path: "/cart", icon: IoCart },
    { name: "Orders", path: "/orders", icon: IoReceipt },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 flex-col z-50 shadow-sm">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              🐾 PawPals
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium mb-1 transition-all ${
                  isActive
                    ? "bg-pink-100 text-pink-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <IconComponent className="text-xl shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-gray-100">
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
              pathname === "/profile"
                ? "bg-pink-100 text-pink-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
              {userData?.avatar_url ? (
                <img
                  src={userData.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.email?.[0].toUpperCase() || "U"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {userData?.full_name || "Profile"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-red-600 hover:bg-red-50 transition-all"
          >
            <IoLogOut className="text-xl shrink-0" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around py-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center px-3 py-2 rounded-lg ${
                  isActive ? "text-pink-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <IconComponent className="text-2xl" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
