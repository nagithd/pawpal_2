"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { GiPawHeart } from "react-icons/gi";
import { IoImageOutline, IoClose, IoAdd } from "react-icons/io5";

interface PetData {
  name: string;
  breed: string;
  age: number;
  species: string;
  image: File | null;
  imagePreview: string;
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [userAvatar, setUserAvatar] = useState<File | null>(null);
  const [userAvatarPreview, setUserAvatarPreview] = useState<string>("");
  const [pets, setPets] = useState<PetData[]>([
    {
      name: "",
      breed: "",
      age: 1,
      species: "dog",
      image: null,
      imagePreview: "",
    },
  ]);
  const router = useRouter();
  const supabase = createClient();

  const handleUserAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUserAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePetImageSelect = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const newPets = [...pets];
      newPets[index].image = file;
      const reader = new FileReader();
      reader.onloadend = () => {
        newPets[index].imagePreview = reader.result as string;
        setPets(newPets);
      };
      reader.readAsDataURL(file);
    }
  };

  const updatePet = (index: number, field: keyof PetData, value: any) => {
    const newPets = [...pets];
    newPets[index] = { ...newPets[index], [field]: value };
    setPets(newPets);
  };

  const addPet = () => {
    setPets([
      ...pets,
      {
        name: "",
        breed: "",
        age: 1,
        species: "dog",
        image: null,
        imagePreview: "",
      },
    ]);
  };

  const removePet = (index: number) => {
    if (pets.length > 1) {
      setPets(pets.filter((_, i) => i !== index));
    }
  };

  const uploadImage = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from("avatar")
      .upload(filePath, file);

    if (error) throw new Error(`Lỗi tải ảnh: ${error.message}`);

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatar").getPublicUrl(filePath);
    return publicUrl;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate pets
    const invalidPet = pets.find(
      (pet) => !pet.name || !pet.breed || !pet.image,
    );
    if (invalidPet) {
      toast.error(
        "Vui lòng điền đầy đủ thông tin và tải ảnh cho tất cả thú cưng",
      );
      return;
    }

    setLoading(true);

    try {
      // Register with Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Không thể tạo tài khoản");
      }

      // Now user is authenticated, upload user avatar if provided
      let avatarUrl = null;
      if (userAvatar) {
        avatarUrl = await uploadImage(userAvatar, "avatars");
      }

      // Create user profile in database with avatar
      const { error: profileError } = await supabase.from("users").insert([
        {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          phone: phone,
          address: address,
          avatar_url: avatarUrl,
        },
      ]);

      if (profileError) {
        console.error("Profile error:", profileError);
      }

      // Upload pet images and create pet profiles
      for (const pet of pets) {
        if (pet.image) {
          const petImageUrl = await uploadImage(pet.image, "pets");

          const { error: petError } = await supabase.from("pets").insert([
            {
              owner_id: authData.user.id,
              name: pet.name,
              breed: pet.breed,
              age: pet.age,
              species: pet.species,
              avatar_url: petImageUrl,
              is_active: true,
            },
          ]);

          if (petError) {
            console.error("Pet error:", petError);
          }
        }
      }

      toast.success("Register success!");
      router.push("/login");
      router.refresh();
    } catch (error: any) {
      console.error("Register error:", error);
      toast.error(error.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[125vh] flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-12 px-4">
      <div className="w-full max-w-4xl px-8 py-10 bg-white rounded-3xl shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <GiPawHeart className="text-5xl" /> PawPal
          </h1>
          <p className="text-gray-600 mt-2"> Create a new account</p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          {/* User Avatar */}
          <div className="col-span-2">
            <label className="block text-md font-medium text-gray-700 mb-2">
              User Avatar (optional)
            </label>
            <div className="flex items-center gap-4">
              {userAvatarPreview ? (
                <div className="relative">
                  <img
                    src={userAvatarPreview}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUserAvatar(null);
                      setUserAvatarPreview("");
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <IoClose />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200">
                  <IoImageOutline className="text-3xl text-gray-500" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUserAvatarSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 2 Column Grid for Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-md font-medium text-gray-700 mb-2"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-gray-900 bg-gray-100 border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-md font-medium text-gray-700 mb-2"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-gray-900 bg-gray-100 border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-md font-medium text-gray-700 mb-2"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-gray-900 bg-gray-100 border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-md font-medium text-gray-700 mb-2"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 text-gray-900 bg-gray-100 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent transition"
              />
              <p className="text-sm text-gray-600 mt-1">Minimum 6 characters</p>
            </div>

            {/* Address takes full width */}
            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="block text-md font-medium text-gray-700 mb-2"
              >
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={3}
                placeholder="Enter your address..."
                className="w-full px-4 py-3 rounded-xl text-gray-900 bg-gray-100 border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent transition resize-none"
              />
            </div>
          </div>

          {/* Pets Section */}
          <div className="border-t border-gray-300 pt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[21px] font-semibold text-gray-900">Your Pets</h3>
              <button
                type="button"
                onClick={addPet}
                className="flex items-center gap-1 px-3 py-1 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600"
              >
                <IoAdd /> Add Pet
              </button>
            </div>

            {pets.map((pet, index) => (
              <div
                key={index}
                className="mb-6 p-4 bg-gray-100 rounded-xl relative"
              >
                {pets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePet(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-600"
                  >
                    <IoClose className="text-xl" />
                  </button>
                )}

                {/* <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Pet #{index + 1}
                </h4> */}

                {/* Pet Image */}
                <div className="mb-3">
                  <label className="block text-md text-gray-600 mb-2">
                    Pet Image <span className="text-red-500">*</span>
                  </label>
                  {pet.imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={pet.imagePreview}
                        alt="Pet"
                        className="w-30 h-30 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updatePet(index, "image", null);
                          updatePet(index, "imagePreview", "");
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <IoClose />
                      </button>
                    </div>
                  ) : (
                    <label className="w-30 h-30 rounded-lg bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-300">
                      <IoImageOutline className="text-2xl text-gray-500" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePetImageSelect(index, e)}
                        className="hidden"
                        required
                      />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-md text-gray-600 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pet.name}
                      onChange={(e) => updatePet(index, "name", e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-md text-gray-600 mb-1">
                      Breed <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pet.breed}
                      onChange={(e) =>
                        updatePet(index, "breed", e.target.value)
                      }
                      required
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={pet.age}
                      onChange={(e) =>
                        updatePet(index, "age", parseInt(e.target.value) || 1)
                      }
                      required
                      min="0"
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Species <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={pet.species}
                      onChange={(e) =>
                        updatePet(index, "species", e.target.value)
                      }
                      required
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    >
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-pink-500 hover:text-pink-600 font-semibold"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
