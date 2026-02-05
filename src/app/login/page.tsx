"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { GiPawHeart } from "react-icons/gi";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has completed setup
      const checkResponse = await fetch("/api/auth/check-setup");
      const { setupCompleted } = await checkResponse.json();

      if (!setupCompleted) {
        router.push("/setup");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user!.id)
          .single();

        if (profile?.role === "admin") {
          router.push("/admin");
        } else router.push("/");
      }

      router.refresh();
    } catch (error: any) {
      toast.error("Tài khoản hoặc mật khẩu không đúng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[125vh] flex items-center justify-center bg-[url('/login_background.jpg')] bg-repeat bg-auto">
      <div className="w-full max-w-2xl px-8 py-10 bg-white rounded-3xl shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-black font-biscuit bg-[#f28125] bg-clip-text text-transparent flex items-center justify-center gap-2"
            style={{ WebkitTextStroke: "2px rgba(242, 129, 37, 0.3)" }}
          >
            <GiPawHeart className="text-5xl" />{" "}
            <span className="font-biscuit">PawPal</span>
          </h1>
          <p className="text-gray-600 mt-4 text-lg italic">
            Find friends for your pets
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-lg font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-lg rounded-xl text-gray-900 bg-gray-100 border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-lg font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-lg px-4 py-3 rounded-xl text-gray-900 bg-gray-100 border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#f28125] text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 text-center">
          <p className="text-lg text-gray-600">
            Don't have an account?{" "}
            <Link href="/register" className="text-[#f28125] font-semibold">
              Sign up now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
