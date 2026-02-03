"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

export default function CartPage() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetchCart();
    fetchUserInfo(); // 👈 thêm dòng này
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("cart_items")
      .select("id, quantity, products(*)")
      .eq("user_id", user.id);

    setItems(data || []);
    setLoading(false);
  };

  const fetchUserInfo = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("users")
      .select("address, phone")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setAddress(data.address || "");
      setPhone(data.phone || "");
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) return;

    await supabase.from("cart_items").update({ quantity }).eq("id", id);
    fetchCart();
  };

  const removeItem = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    toast.success("Đã xoá sản phẩm");
    fetchCart();
  };

  const total = items.reduce(
    (sum, item) => sum + item.products.price * item.quantity,
    0,
  );

  const handleCheckout = async () => {
    if (items.length === 0) return toast.error("Giỏ hàng trống");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return toast.error("Vui lòng đăng nhập");

    const productIds = items.map((i: any) => i.products?.id).filter(Boolean);

    // 🔍 Lấy giá thật từ DB
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, price")
      .in("id", productIds);

    if (productError) throw productError;

    const priceMap: Record<string, number> = {};
    products.forEach((p) => {
      priceMap[p.id] = p.price;
    });

    // 🧮 Tính tổng tiền chuẩn
    const totalAmount = items.reduce((sum: number, item: any) => {
      const productId = item.products?.id;
      const price = priceMap[productId] ?? 0;
      return sum + price * item.quantity;
    }, 0);

    if (!address.trim()) {
      return toast.error("Vui lòng nhập địa chỉ giao hàng");
    }

    if (!phone.trim()) {
      return toast.error("Vui lòng nhập số điện thoại");
    }

    // regex kiểm tra SĐT Việt Nam cơ bản
    const phoneRegex = /^(0|\+84)[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return toast.error("Số điện thoại không hợp lệ");
    }

    // COD → tạo đơn hàng trực tiếp
    if (paymentMethod === "cod") {
      // 1️⃣ Tạo order và LẤY LẠI ORDER ID
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total_price: totalAmount,
          status: "processing",
          order_code: null,
          payment_method: "COD",
          payment_status: "pending", // COD chưa thanh toán
          paid_at: null,
          shipping_address: address,
          phone: phone,
        })
        .select()
        .single(); // 👈 QUAN TRỌNG

      if (error || !order) {
        toast.error("Không thể tạo đơn hàng");
        return;
      }

      // 2️⃣ Tạo order_items
      const orderItems = items.map((item: any) => {
        const productId = item.products?.id;

        return {
          order_id: order.id, // 👈 giờ đã có id thật
          product_id: productId,
          price: priceMap[productId] ?? 0,
          quantity: item.quantity,
        };
      });

      const { error: itemError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemError) {
        console.error(itemError);
        toast.error("Lỗi lưu sản phẩm trong đơn hàng");
        return;
      }

      // 3️⃣ Xoá giỏ hàng
      await supabase.from("cart_items").delete().eq("user_id", user.id);

      toast.success("Đặt hàng thành công! 🐾");
      fetchCart();
      return;
    }

    localStorage.setItem("checkout_address", address);
    localStorage.setItem("checkout_phone", phone);

    // PayOS → gọi API tạo link thanh toán
    const res = await fetch("/api/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: total,
        address,
        phone,
        items,
      }),
    });

    const data = await res.json();

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      toast.error("Không tạo được link thanh toán");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[125vh] bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-12">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-1/3 mb-10"></div>
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Left - Product List Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 bg-white p-4 rounded-2xl shadow-lg">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="w-24 space-y-2">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right - Summary Skeleton */}
            <div className="bg-white p-6 rounded-2xl shadow-lg h-fit sticky top-24">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-4 mb-6">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
              <div className="h-12 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[125vh] bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-12">
      <h1 className="text-4xl font-bold mb-10 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
        🛒 Your Cart
      </h1>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Product List */}
        <div className="lg:col-span-2 space-y-6">
          {items.length === 0 && (
            <p className="text-gray-600">Empty Cart...</p>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 bg-white p-4 rounded-2xl items-center shadow-lg"
            >
              <Image
                src={item.products.images?.[0] || "/no-image.png"}
                alt={item.products.name}
                width={50}
                height={50}
                className="rounded-lg object-cover"
              />

              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">
                  {item.products.name}
                </h2>
                <p className="text-pink-400 font-bold">
                  {item.products.price.toLocaleString()}₫
                </p>

                {/* Quantity */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-2 py-1 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
                  >
                    −
                  </button>
                  <span className="text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="px-2 py-1 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>

              <button onClick={() => removeItem(item.id)}>
                <Trash2 className="text-red-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>

        {/* Thanh toán */}
        <div className="bg-white p-6 rounded-2xl shadow-lg h-fit">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Thanh toán
          </h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-gray-700">Địa chỉ giao hàng</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full mt-1 p-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="Nhập địa chỉ nhận hàng..."
              />
            </div>

            <div>
              <label className="text-sm text-gray-700">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 p-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="Nhập số điện thoại..."
              />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <label className="flex items-center gap-2 text-gray-900">
              <input
                type="radio"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              Thanh toán khi nhận hàng (COD)
            </label>

            <label className="flex items-center gap-2 text-gray-900">
              <input
                type="radio"
                value="bank"
                checked={paymentMethod === "bank"}
                onChange={() => setPaymentMethod("bank")}
              />
              Chuyển khoản ngân hàng
            </label>
          </div>

          <div className="flex justify-between text-lg font-semibold mb-6 text-gray-900">
            <span>Tổng tiền:</span>
            <span className="text-pink-400">{total.toLocaleString()}₫</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={items.length === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
          >
            {paymentMethod === "cod" ? "Đặt hàng (COD)" : "Thanh toán online"}
          </button>
        </div>
      </div>
    </div>
  );
}
