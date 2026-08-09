"use client";

import { useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGES = 3;
const MAX_SIDE = 1200;
const QUALITY = 0.8;
const MAX_INPUT_BYTES = 30 * 1024 * 1024; // 30MB per file

type UploadRow = {
  url: string;
  preview: string;
};

async function fileToWebP(file: File): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Cannot read image"));
    image.src = url;
  });

  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))),
      "image/webp",
      QUALITY
    );
  });
}

export default function ProductImageUploader({
  name = "image_urls",
}: {
  name?: string;
}) {
  const { pending } = useFormStatus();
  const [images, setImages] = useState<UploadRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        setError(`You can upload up to ${MAX_IMAGES} images.`);
        return;
      }

      const selected = Array.from(files).slice(0, remaining);
      setUploading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      try {
        const rows: UploadRow[] = [];
        for (const file of selected) {
          if (!file.type.startsWith("image/")) {
            setError("Only image files are allowed.");
            continue;
          }
          if (file.size > MAX_INPUT_BYTES) {
            setError("Image is larger than 30MB.");
            continue;
          }
          if (!user) {
            setError("Please sign in to upload images.");
            break;
          }

          const webp = await fileToWebP(file);
          const path = `${user.id}/${crypto.randomUUID()}.webp`;
          const { error: upError } = await supabase.storage
            .from("product-images")
            .upload(path, webp, { contentType: "image/webp" });
          if (upError) {
            setError(upError.message || "Upload failed.");
            continue;
          }
          const { data: publicUrl } = supabase.storage
            .from("product-images")
            .getPublicUrl(path);
          rows.push({
            url: publicUrl.publicUrl,
            preview: URL.createObjectURL(file),
          });
        }
        setImages((prev) => [...prev, ...rows]);
      } finally {
        setUploading(false);
      }
    },
    [images.length, supabase]
  );

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {images.map((img, i) => (
          <div
            key={img.url}
            className="relative aspect-square overflow-hidden rounded-lg border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.preview || img.url}
              alt={`Upload ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              disabled={pending}
              className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
            >
              ✕
            </button>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-accent">
            {uploading ? "Uploading…" : "+ Add"}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={pending || uploading}
              onChange={(e) => handleFiles(e.target.files)}
              className="sr-only"
            />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Up to {MAX_IMAGES} images. Converted to WebP, max {MAX_SIDE / 1000}px,
        ~0.8 quality.
      </p>

      {images.map((img) => (
        <input key={img.url} type="hidden" name={name} value={img.url} />
      ))}
    </div>
  );
}