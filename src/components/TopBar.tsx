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
import { GiPawHeart } from "react-icons/gi";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useUser();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      const getUserData = async () => {
        const { data: userDataFromDB } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (userDataFromDB) {
          setUserData(userDataFromDB);
        }
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
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex flex-row items-center space-x-2 text-2xl font-bold"
          >
            <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              🐾 PawPals
            </span>
          </Link>

          {/* Menu điều hướng */}
          <div className="hidden md:flex items-center space-x-6 mr-30">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? "bg-pink-100 text-pink-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <IconComponent className="text-xl" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Avatar & Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <button className="flex items-center space-x-2 hover:opacity-80 transition">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
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
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-t-lg flex items-center gap-2"
                >
                  <IoPerson /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded-b-lg flex items-center gap-2"
                >
                  <IoLogOut /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden border-t border-gray-200">
        <div className="flex justify-around py-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center px-3 py-2 rounded-lg ${
                  isActive
                    ? "text-pink-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <IconComponent className="text-2xl" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
