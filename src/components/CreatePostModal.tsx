"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { GiPawHeart } from "react-icons/gi";
import { IoImageOutline, IoClose, IoVideocam } from "react-icons/io5";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
}: CreatePostModalProps) {
  const supabase = createClient();
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPets, setLoadingPets] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      loadUserPets();
    }
  }, [isOpen]);

  const loadUserPets = async () => {
    setLoadingPets(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadingPets(false);
      return;
    }

    const { data: petsData } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", user.id)
      .eq("is_active", true);

    if (petsData) {
      setPets(petsData);
      if (petsData.length > 0) {
        setSelectedPet(petsData[0].id);
      }
    }
    setLoadingPets(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 4) {
      toast.error("Chỉ được chọn tối đa 4 ảnh");
      return;
    }

    // Don't allow images if video is selected
    if (selectedVideo) {
      toast.error("Không thể chọn cả ảnh và video cùng lúc");
      return;
    }

    setSelectedImages((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Don't allow video if images are selected
    if (selectedImages.length > 0) {
      toast.error("Không thể chọn cả ảnh và video cùng lúc");
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video không được vượt quá 50MB");
      return;
    }

    // Check video duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      // Max 60 seconds
      if (video.duration > 60) {
        toast.error("Video không được dài quá 60 giây");
        return;
      }
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    };
    video.src = URL.createObjectURL(file);
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setSelectedVideo(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview("");
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of selectedImages) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { data, error } = await supabase.storage
        .from("post-image")
        .upload(filePath, file);

      if (error) {
        throw new Error(`Lỗi tải ảnh: ${error.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-image").getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const uploadVideo = async (): Promise<string | null> => {
    if (!selectedVideo) return null;

    const fileExt = selectedVideo.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    const { data, error } = await supabase.storage
      .from("post-videos")
      .upload(filePath, selectedVideo);

    if (error) {
      throw new Error(`Lỗi tải video: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("post-videos").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPet || !content.trim()) {
      toast.error("Vui lòng chọn thú cưng và nhập nội dung");
      return;
    }

    setLoading(true);
    try {
      // Upload images or video
      let imageUrls: string[] = [];
      let videoUrl: string | null = null;

      if (selectedImages.length > 0) {
        imageUrls = await uploadImages();
      } else if (selectedVideo) {
        videoUrl = await uploadVideo();
      }

      const response = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: selectedPet,
          content: content.trim(),
          images: imageUrls,
          video: videoUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Có lỗi xảy ra");
      }

      toast.success("Đăng bài thành công!");
      setContent("");
      setSelectedImages([]);
      setImagePreviews([]);
      removeVideo();
      onPostCreated();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-10 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[800px] w-full p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Create Post
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 text-4xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ×
          </button>
        </div>

        {loadingPets ? (
          <div className="space-y-4 animate-pulse">
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-gray-300"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                </div>
              </div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : pets.length === 0 ? (
          <div className="text-center py-8">
            <GiPawHeart className="text-xl mx-auto mb-4 text-pink-500" />
            <p className="text-gray-600">
              You don't have any pets yet. Please add a pet to create a post.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Your Pet
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                {selectedPet && pets.find((p) => p.id === selectedPet) && (
                  <>
                    <div className="w-18 h-18 rounded-full overflow-hidden bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      {pets.find((p) => p.id === selectedPet)?.avatar_url ? (
                        <img
                          src={
                            pets.find((p) => p.id === selectedPet)?.avatar_url
                          }
                          alt="Pet"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-1xl">
                          {pets.find((p) => p.id === selectedPet)?.name?.[0] ||
                            "P"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-lg">
                        {pets.find((p) => p.id === selectedPet)?.name}
                      </p>
                      <p className="text-xs text-gray-500 text-2lg">
                        {pets.find((p) => p.id === selectedPet)?.breed ||
                          "Your pet"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
               Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share something about your pet..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 bg-gray-100 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                rows={5}
                required
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Images (Up to 4)
              </label>
              <div className="space-y-3">
                <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-pink-400 transition">
                  <IoImageOutline className="text-2xl text-gray-500" />
                  <span className="text-gray-600">Choose images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={
                      selectedImages.length >= 4 || selectedVideo !== null
                    }
                  />
                </label>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                        >
                          <IoClose className="text-lg" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Short Video (Up to 60 seconds)
              </label>
              <div className="space-y-3">
                <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition">
                  <IoVideocam className="text-2xl text-gray-500" />
                  <span className="text-gray-600">Chọn video</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="hidden"
                    disabled={
                      selectedImages.length > 0 || selectedVideo !== null
                    }
                  />
                </label>

                {videoPreview && (
                  <div className="relative group">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full h-48 object-cover rounded-lg bg-black"
                    />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <IoClose className="text-lg" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition disabled:opacity-50"
              >
                {loading ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
