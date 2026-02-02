"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // User profile info
  const [profileData, setProfileData] = useState({
    fullName: "",
    phone: "",
    bio: "",
  });

  // Pet info
  const [petData, setPetData] = useState({
    name: "",
    species: "dog", // dog, cat, other
    breed: "",
    age: "",
    gender: "male", // male, female
    description: "",
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.fullName || !profileData.phone) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setStep(2);
  };

  const handlePetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petData.name || !petData.breed || !petData.age) {
      toast.error("Vui lòng điền đầy đủ thông tin thú cưng");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: profileData, pet: petData }),
      });

      const data = await response.json();
      console.log("Setup response:", data);
      if (!response.ok) {
        throw new Error(data.error || "Có lỗi xảy ra");
      }

      toast.success("Thiết lập tài khoản thành công!");
      router.push("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[125vh] bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Bước {step} / 2
            </span>
            <span className="text-sm font-medium text-pink-600">
              {step === 1 ? "Thông tin cá nhân" : "Thêm thú cưng"}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {step === 1 ? "Thiết lập tài khoản" : "Thêm thú cưng đầu tiên"}
        </h1>
        <p className="text-gray-600 mb-8">
          {step === 1
            ? "Vui lòng điền thông tin cá nhân của bạn"
            : "Thêm ít nhất một thú cưng để bắt đầu"}
        </p>

        {/* Step 1: Profile Info */}
        {step === 1 && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) =>
                  setProfileData({ ...profileData, fullName: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) =>
                  setProfileData({ ...profileData, phone: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="0123456789"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giới thiệu bản thân
              </label>
              <textarea
                value={profileData.bio}
                onChange={(e) =>
                  setProfileData({ ...profileData, bio: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Chia sẻ một chút về bạn..."
                rows={4}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-colors"
            >
              Tiếp theo
            </button>
          </form>
        )}

        {/* Step 2: Pet Info */}
        {step === 2 && (
          <form onSubmit={handlePetSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên thú cưng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={petData.name}
                onChange={(e) =>
                  setPetData({ ...petData, name: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Milo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại thú cưng <span className="text-red-500">*</span>
              </label>
              <select
                value={petData.species}
                onChange={(e) =>
                  setPetData({ ...petData, species: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              >
                <option value="dog">Chó 🐕</option>
                <option value="cat">Mèo 🐈</option>
                <option value="other">Khác 🐾</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giống <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={petData.breed}
                onChange={(e) =>
                  setPetData({ ...petData, breed: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Golden Retriever, Mèo Ta, v.v."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tuổi <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={petData.age}
                  onChange={(e) =>
                    setPetData({ ...petData, age: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="2"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giới tính <span className="text-red-500">*</span>
                </label>
                <select
                  value={petData.gender}
                  onChange={(e) =>
                    setPetData({ ...petData, gender: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  required
                >
                  <option value="male">Đực</option>
                  <option value="female">Cái</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                value={petData.description}
                onChange={(e) =>
                  setPetData({ ...petData, description: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Tính cách, sở thích của thú cưng..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xử lý..." : "Hoàn tất"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
