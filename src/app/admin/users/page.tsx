"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: string | null;
  created_at: string | null;
}

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        console.error("Load users error:", error);
        setUsers([]);
        setLoading(false);
        return;
      }

      setUsers((data || []) as UserRow[]);
      setLoading(false);
    };

    loadUsers();

    return () => {
      active = false;
    };
  }, [supabase]);


  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchedSearch =
        !normalizedSearch ||
        (user.full_name || "").toLowerCase().includes(normalizedSearch) ||
        (user.email || "").toLowerCase().includes(normalizedSearch) ||
        (user.phone || "").toLowerCase().includes(normalizedSearch);

      return matchedSearch;
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE;
    return filteredUsers.slice(from, to);
  }, [filteredUsers, currentPage]);

  const handleExportExcel = async () => {
    if (users.length === 0) return;

    setExporting(true);

    try {
      const XLSX = await import("xlsx");
      const exportRows = users.map((user, index) => ({
        STT: index + 1,
        "Ho va ten": user.full_name || "",
        Email: user.email || "",
        "So dien thoai": user.phone || "",
        "Dia chi": user.address || "",
        Role: user.role || "user",
        "Ngay tao tai khoan": user.created_at
          ? new Date(user.created_at).toLocaleString()
          : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
      XLSX.writeFile(workbook, `users-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          placeholder="Search name/email/phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border p-2 rounded w-80"
        />

        <button
          onClick={handleExportExcel}
          disabled={loading || exporting || users.length === 0}
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? "Exporting..." : "Export Excel"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-600">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Address</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Created At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading users...
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user, index) => {
                return (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      {(currentPage - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {user.full_name || "N/A"}
                    </td>
                    <td className="px-4 py-3">{user.email || "N/A"}</td>
                    <td className="px-4 py-3">{user.phone || "N/A"}</td>
                    <td className="px-4 py-3">{user.address || "N/A"}</td>
                    <td className="px-4 py-3">{user.role || "user"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6 text-sm text-gray-600">
        <span>Total: {filteredUsers.length} users</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-40"
          >
            Prev
          </button>

          <span className="px-3 py-2 font-medium">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
