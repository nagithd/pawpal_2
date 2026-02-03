"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import toast from "react-hot-toast";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import ImageModal from "@/components/ImageModal";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  stock: number;
  category: string;
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const supabase = createClient();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return;

    setProduct(data);

    // Lấy sản phẩm liên quan cùng category
    const { data: relatedData } = await supabase
      .from("products")
      .select("*")
      .eq("category", data.category)
      .neq("id", data.id)
      .limit(4);

    setRelated(relatedData || []);
  };

  const addToCart = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return toast.error("Please log in");

    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      product_id: product?.id,
      quantity,
    });

    if (error) toast.error("Cannot add to cart");
    else toast.success(`Added ${quantity} items to cart 🐾`);
  };

  if (!product)
    return (
      <div className="min-h-[125vh] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="min-h-[125vh] bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 px-6 py-12">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">
        {/* Ảnh sản phẩm */}
        <div
          className="bg-white rounded-2xl p-4 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setImageModalOpen(true)}
        >
          <Image
            src={product.images?.[0] || "/no-image.png"}
            alt={product.name}
            width={600}
            height={500}
            className="rounded-xl object-cover w-full h-[400px]"
          />
        </div>

        {/* Thông tin */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 mb-6">{product.description}</p>

          <p className="text-2xl font-bold text-pink-400 mb-6">
            {product.price.toLocaleString()}₫
          </p>

          {/* Chọn số lượng */}
          <div className="flex items-center gap-4 mb-6">
            <span>Số lượng:</span>
            <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-1 text-lg"
              >
                −
              </button>
              <span className="px-4">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity((q) => Math.min(product.stock, q + 1))
                }
                className="px-3 py-1 text-lg"
              >
                +
              </button>
            </div>
            <span className="text-sm text-gray-600">
              {product.stock} items left
            </span>
          </div>

          <button
            onClick={addToCart}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90"
          >
            <ShoppingCart size={20} />
            Add to cart
          </button>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-16 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">🐾 Related Products</h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/shop/${item.id}`}
                className="bg-white rounded-2xl overflow-hidden hover:scale-[1.02] transition shadow-lg"
              >
                <Image
                  src={item.images?.[0] || "/no-image.png"}
                  alt={item.name}
                  width={400}
                  height={300}
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-gray-900 font-semibold">{item.name}</h3>
                  <p className="text-pink-400 font-bold mt-2">
                    {item.price.toLocaleString()}₫
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {product.images?.[0] && (
        <ImageModal
          isOpen={imageModalOpen}
          imageUrl={product.images[0]}
          onClose={() => setImageModalOpen(false)}
        />
      )}
    </div>
  );
}
