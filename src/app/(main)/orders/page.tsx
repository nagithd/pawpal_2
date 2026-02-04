"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/contexts/UserContext";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  Package,
  MapPin,
  Phone,
  Calendar,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingBag,
} from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  products: {
    name: string;
    images: string[];
  } | null;
};

type Order = {
  id: string;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
  order_items: OrderItem[];
  phone: string;
  shipping_address: string;
};

export default function OrdersPage() {
  const supabase = createClient();
  const { user } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 5;

  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const toggleOrder = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchOrders(page);
  }, [page]);

  const totalPages = Math.ceil(totalOrders / PAGE_SIZE);

  const fetchOrders = async (currentPage = 1) => {
    if (!user) return;

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count } = await supabase
      .from("orders")
      .select(
        `
      id,
      total_price,
      status,
      payment_status,
      created_at,
      phone,
      shipping_address
    `,
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data: orderItems, error } = await supabase.from("order_items")
      .select(`
        id,
        order_id,
        price,
        quantity,
        products:product_id (
          name,
          images
        )
      `);

    if (error) {
      console.error(error);
    }

    const mergedOrders: Order[] = (data || []).map((order: any) => ({
      ...order,
      order_items: orderItems!.filter(
        (item: any) => item.order_id === order.id,
      ),
    }));

    setOrders(mergedOrders);
    setTotalOrders(count || 0);
    setLoading(false);
  };

  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case "paid":
        return {
          text: "Paid",
          color: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          icon: CheckCircle2,
        };
      case "pending":
        return {
          text: "Pending",
          color: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
          icon: Clock,
        };
      case "failed":
        return {
          text: "Failed",
          color: "text-red-700",
          bg: "bg-red-50",
          border: "border-red-200",
          icon: XCircle,
        };
      default:
        return {
          text: status,
          color: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-200",
          icon: CreditCard,
        };
    }
  };

  const getShippingStatusConfig = (status: string) => {
    switch (status) {
      case "processing":
        return {
          text: "Processing",
          color: "text-blue-700",
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: Package,
        };
      case "shipping":
        return {
          text: "Shipping",
          color: "text-purple-700",
          bg: "bg-purple-50",
          border: "border-purple-200",
          icon: Truck,
        };
      case "completed":
        return {
          text: "Completed",
          color: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          icon: CheckCircle2,
        };
      case "cancelled":
        return {
          text: "Cancelled",
          color: "text-red-700",
          bg: "bg-red-50",
          border: "border-red-200",
          icon: XCircle,
        };
      default:
        return {
          text: status,
          color: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-200",
          icon: Package,
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[125vh] bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>

          {/* Orders List Skeleton */}
          <div className="space-y-6">
            {[1].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="animate-pulse">
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-8 bg-gray-200 rounded-full w-24"></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-4 bg-gray-200 rounded w-40"></div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {[1, 2].map((j) => (
                        <div key={j} className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          </div>
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <div className="h-6 bg-gray-200 rounded w-24"></div>
                        <div className="h-8 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="mt-8 flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-[125vh] bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              Do not have orders yet
            </h3>
            <p className="text-gray-600">Start to shop now!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[125vh] bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">
            Manage and keep track with your orders
          </p>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.map((order) => {
            const shippingConfig = getShippingStatusConfig(order.status);
            const paymentConfig = getPaymentStatusConfig(order.payment_status);
            const ShippingIcon = shippingConfig.icon;
            const PaymentIcon = paymentConfig.icon;
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300"
              >
                {/* Order Header */}
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-gray-400" />
                          <span className="font-semibold text-gray-900">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(order.created_at).toLocaleString("vi-VN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Status & Price */}
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-2">
                        {/* Shipping Status */}
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${shippingConfig.bg} ${shippingConfig.border}`}
                        >
                          <ShippingIcon
                            className={`w-4 h-4 ${shippingConfig.color}`}
                          />
                          <span
                            className={`text-sm font-medium ${shippingConfig.color}`}
                          >
                            {shippingConfig.text}
                          </span>
                        </div>

                        {/* Payment Status */}
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${paymentConfig.bg} ${paymentConfig.border}`}
                        >
                          <PaymentIcon
                            className={`w-4 h-4 ${paymentConfig.color}`}
                          />
                          <span
                            className={`text-sm font-medium ${paymentConfig.color}`}
                          >
                            {paymentConfig.text}
                          </span>
                        </div>
                      </div>

                      {/* Total Price */}
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">
                          Total price
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(order.total_price ?? 0).toLocaleString()}₫
                        </p>
                      </div>

                      {/* Toggle Button */}
                      <button
                        onClick={() => toggleOrder(order.id)}
                        className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label={isExpanded ? "Thu gọn" : "Xem chi tiết"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Shipping Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Phone</p>
                        <p className="text-sm font-medium text-gray-900">
                          {order.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Address</p>
                        <p className="text-sm font-medium text-gray-900">
                          {order.shipping_address}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items (Expanded) */}
                {isExpanded && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">
                      Detail ({order.order_items.length} products)
                    </h4>
                    <div className="space-y-3">
                      {order.order_items.map((item) => {
                        const product = item.products;
                        if (!product) return null;

                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                          >
                            {/* Product Image */}
                            <div className="relative w-16 h-16 flex-shrink-0">
                              <Image
                                src={product.images?.[0] || "/no-image.png"}
                                alt={product.name}
                                fill
                                className="rounded-lg object-cover"
                              />
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 truncate mb-1">
                                {product.name}
                              </h5>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>Số lượng: {item.quantity}</span>
                                <span>•</span>
                                <span>
                                  {(item.price ?? 0).toLocaleString()}₫
                                </span>
                              </div>
                            </div>

                            {/* Item Total */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-semibold text-blue-600">
                                {(
                                  (item.price ?? 0) * item.quantity
                                ).toLocaleString()}
                                ₫
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => {
                  // Show first, last, current, and adjacent pages
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= page - 1 && pageNum <= page + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                          page === pageNum
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (pageNum === page - 2 || pageNum === page + 2) {
                    return (
                      <span key={pageNum} className="px-2 text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                },
              )}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
