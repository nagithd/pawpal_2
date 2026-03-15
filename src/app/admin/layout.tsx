import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BarChart2, Package, ShoppingCart, Users } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-[125vh] bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-6 space-y-4">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>

        <Link
          href="/admin/statistics"
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          <BarChart2 size={18} />
          Statistics
        </Link>

        <Link
          href="/admin/orders"
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          <ShoppingCart size={18} />
          Orders
        </Link>

        <Link
          href="/admin/products"
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          <Package size={18} />
          Products
        </Link>

        <Link
          href="/admin/users"
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          <Users size={18} />
          Users
        </Link>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center bg-white px-10 py-4 border-b">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <LogoutButton />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-10">{children}</main>
      </div>
    </div>
  );
}
