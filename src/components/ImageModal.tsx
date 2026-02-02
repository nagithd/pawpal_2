"use client";

import Image from "next/image";
import { IoClose } from "react-icons/io5";

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

export default function ImageModal({
  isOpen,
  imageUrl,
  onClose,
}: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <IoClose size={32} />
      </button>
      <div
        className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={imageUrl}
          alt="Full size image"
          width={1200}
          height={1200}
          className="object-contain max-w-full max-h-full rounded-lg"
          onClick={onClose}
        />
      </div>
    </div>
  );
}
