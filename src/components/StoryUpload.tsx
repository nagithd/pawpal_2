"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/contexts/UserContext";
import { IoClose, IoImage, IoVideocam } from "react-icons/io5";
import toast from "react-hot-toast";

interface Pet {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  pets: Pet[];
  onClose: () => void;
  onUploaded: () => void;
}

export default function StoryUpload({ pets, onClose, onUploaded }: Props) {
  const supabase = createClient();
  const { user } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file || !user || !selectedPetId) return;
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("stories").insert({
        pet_id: selectedPetId,
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
      });

      if (insertError) throw insertError;

      toast.success("Story đã được đăng!");
      onUploaded();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Lỗi khi đăng story");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-lg">Tạo Story mới</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition">
            <IoClose className="text-2xl" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Pet selector */}
          {pets.length > 1 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Đăng cho thú cưng</label>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {pets.map(pet => (
                  <button
                    key={pet.id}
                    onClick={() => setSelectedPetId(pet.id)}
                    className={`flex flex-col items-center gap-1 shrink-0 p-1 rounded-xl transition ${
                      selectedPetId === pet.id ? "ring-2 ring-pink-500" : ""
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                      {pet.avatar_url ? (
                        <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🐾</div>
                      )}
                    </div>
                    <span className="text-xs text-gray-600">{pet.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Media picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Ảnh hoặc Video</label>
            {!preview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-pink-400 hover:text-pink-400 transition"
              >
                <div className="flex gap-3 text-3xl">
                  <IoImage />
                  <IoVideocam />
                </div>
                <span className="text-sm">Nhấn để chọn ảnh hoặc video</span>
              </button>
            ) : (
              <div className="relative w-full h-64 rounded-xl overflow-hidden bg-black">
                {mediaType === "video" ? (
                  <video src={preview} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={preview} alt="preview" className="w-full h-full object-contain" />
                )}
                <button
                  onClick={() => { setPreview(""); setFile(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition"
                >
                  <IoClose />
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Caption */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Caption (tuỳ chọn)</label>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Thêm mô tả..."
              maxLength={200}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!file || !selectedPetId || loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang đăng..." : "Đăng Story"}
          </button>
        </div>
      </div>
    </div>
  );
}
