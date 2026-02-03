"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import toast from "react-hot-toast";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 8;

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  stock: number;
};

export default function ShopPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const totalPages = Math.ceil(totalProducts / PAGE_SIZE);

  useEffect(() => {
    fetchProducts(page);
  }, [page]);

  const fetchProducts = async (pageNumber: number) => {
    setLoading(true);

    const from = (pageNumber - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // 🔎 Search theo tên
    if (search.trim() !== "") {
      query = query.ilike("name", `%${search}%`);
    }

    // 💰 Filter giá
    if (minPrice !== "") {
      query = query.gte("price", Number(minPrice));
    }
    if (maxPrice !== "") {
      query = query.lte("price", Number(maxPrice));
    }

    const { data, count, error } = await query.range(from, to);

    if (!error && data) {
      setProducts(data);
      setTotalProducts(count || 0);
    }

    setLoading(false);
  };

  const addToCart = async (productId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return toast.error("Vui lòng đăng nhập");

    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      product_id: productId,
      quantity: 1,
    });

    if (error) toast.error("Không thể thêm vào giỏ");
    else toast.success("Đã thêm vào giỏ hàng 🐾");
  };

  useEffect(() => {
    setPage(1);
    fetchProducts(1);
  }, [search, minPrice, maxPrice]);

  return (
    <div className="min-h-[125vh] bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-12">
      {loading ? (
        <div className="max-w-7xl mx-auto">
          {/* Loading Skeleton */}
          <div className="animate-pulse mb-8">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar Skeleton */}
            <div className="md:col-span-1 bg-white p-6 rounded-2xl h-fit shadow-lg">
              <div className="animate-pulse space-y-6">
                <div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>

            {/* Products Grid Skeleton */}
            <div className="md:col-span-3">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                  >
                    <div className="animate-pulse">
                      <div className="h-48 bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar Filter */}
          <div className="md:col-span-1 bg-white p-6 rounded-2xl h-fit sticky top-24 space-y-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Search</h2>

            <input
              type="text"
              placeholder="Product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-900 border border-gray-200 outline-none focus:border-pink-400"
            />

            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
                Price Range
              </h2>

              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="Price from"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-900 border border-gray-200 outline-none focus:border-pink-400"
                />

                <input
                  type="number"
                  placeholder="Price to"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-900 border border-gray-200 outline-none focus:border-pink-400"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setSearch("");
                setMinPrice("");
                setMaxPrice("");
              }}
              className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 font-semibold"
            >
              Reset Filters
            </button>
          </div>

          {/* Product List */}
          <div className="md:col-span-3">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/shop/${p.id}`}
                  className="block h-full"
                >
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:scale-[1.02] transition h-full flex flex-col"
                  >
                    <div className="relative w-full h-48 flex-shrink-0">
                      <Image
                        src={p.images?.[0] || "/no-image.png"}
                        alt={p.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="p-4 flex flex-col flex-grow">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {p.name}
                      </h2>
                      <p className="text-sm text-gray-600 line-clamp-2 flex-grow">
                        {p.description}
                      </p>

                      <div className="flex items-center justify-between mt-4">
                        <span className="text-pink-400 font-bold">
                          {p.price.toLocaleString()}₫
                        </span>

                        <button
                          onClick={() => addToCart(p.id)}
                          className="p-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90"
                        >
                          <ShoppingCart size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-12 gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-lg bg-white shadow text-gray-900 disabled:opacity-40"
              >
                ← Back
              </button>

              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-4 py-2 rounded-lg ${
                    page === i + 1
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                      : "bg-white shadow text-gray-900"
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg bg-white shadow text-gray-900 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
