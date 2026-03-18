"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

export default function SuccessPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessPage />
    </Suspense>
  );
}

export function SuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  type CartItem = {
    quantity: number;
    products: {
      id: string;
      name: string;
      price: number;
      images: string[];
    }[];
  };

  useEffect(() => {
    const saveOrder = async () => {
      const orderCode = params.get("orderCode");
      if (!orderCode) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Lấy cart hiện tại trước khi bị xoá
      const { data } = await supabase
        .from("cart_items")
        .select("quantity, products(id, name, price, images)")
        .eq("user_id", user.id);

      const items = (data || []) as CartItem[];

      await fetch("/api/payment-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode,
          userId: user.id,
          items,
          address: localStorage.getItem("checkout_address"),
          phone: localStorage.getItem("checkout_phone"),
        }),
      });
      router.push("/shop");
    };

    saveOrder();
  }, []);

  return (
    <div className="min-h-[125vh] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-10 rounded-2xl text-center shadow-xl">
        <h1 className="text-3xl font-bold text-green-500 mb-4">
          Thanh toán thành công!
        </h1>
        <p className="text-gray-700 mb-2">
          Đơn hàng của bạn đang được xử lý 🐾
        </p>
        <p className="text-sm text-gray-500">
          Tự động quay về cửa hàng sau vài giây...
        </p>
      </div>
    </div>
  );
}
