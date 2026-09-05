"use client";

import { CheckCircle2, FileBox, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";

import { formatDimensions } from "@/lib/formatting";

export type ArtworkRequirement = {
  id: string;
  artworkRequired: boolean;
  acceptedFormats: Array<"CDR" | "PDF">;
  maxFileSize: number | null;
  maxFiles: number;
  designWidth: string | null;
  designHeight: string | null;
  designUnit: string | null;
  bleedWidth: string | null;
  bleedHeight: string | null;
  safeAreaWidth: string | null;
  safeAreaHeight: string | null;
  finalWidth: string | null;
  finalHeight: string | null;
  pageInstructions: Array<{ pageNumber: number; label: string; colorMode?: string | null; notes?: string | null; required?: boolean }>;
  multiplePageInstructions: string | null;
  additionalInstructions: string | null;
  slots?: ArtworkSlot[];
};

export type ArtworkSlot = { id: string; slotKey: string; name: string; required: boolean; acceptedFormats: ["CDR"]; maxFileSize: number | null; instructions: string | null; sortOrder: number };
export type UploadedArtwork = { id: string; originalFileName: string; fileSize: number; fileType: string; status: string; uploadedAt: string; previewUrl?: string | null; artworkSlotId?: string | null; artworkSlotKey?: string };

function bytes(value: number) { return `${(value / 1024 / 1024).toFixed(value < 1024 * 1024 ? 1 : 0)} MB`; }
function formatLabel() { return "CDR"; }

export function ArtworkUploader({ productId, pricingRuleId, requirement, slot, showRequirements = true, compact = false, configuration, artwork, onUploaded, onRemoved }: { productId: string; pricingRuleId: string | null; requirement: ArtworkRequirement; slot?: ArtworkSlot; showRequirements?: boolean; compact?: boolean; configuration: Record<string, string>; artwork: UploadedArtwork | null; onUploaded: (artwork: UploadedArtwork) => void; onRemoved: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "failed">("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  function choose() { input.current?.click(); }

  function drop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  function uploadViaServer(file: File) {
    setPhase("uploading");
    setProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("productId", productId);
    if (pricingRuleId) formData.append("pricingRuleId", pricingRuleId);
    if (slot?.id) formData.append("artworkSlotId", slot.id);
    if (slot?.slotKey) formData.append("artworkSlotKey", slot.slotKey);
    if (artwork?.id) formData.append("replaceArtworkId", artwork.id);
    if (configuration) formData.append("configuration", JSON.stringify(configuration));

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      else setProgress(null);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result?.data) {
            setProgress(100);
            setPhase("processing");
            onUploaded(result.data);
            window.setTimeout(() => setPhase("idle"), 400);
            return;
          }
        } catch {}
      }
      let msg = "Upload failed. Please try again.";
      try {
        const err = JSON.parse(xhr.responseText);
        if (err?.error?.message) msg = err.error.message;
      } catch {}
      setError(msg);
      setPhase("failed");
    });
    xhr.addEventListener("error", () => {
      setError("Connection interrupted. Please retry.");
      setPhase("failed");
    });
    xhr.open("POST", "/api/artworks/upload");
    xhr.send(formData);
  }

  const SERVER_UPLOAD_LIMIT_BYTES = 4.5 * 1024 * 1024; // Vercel serverless function request body limit

  async function upload(file: File) {
    setError("");
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "cdr") { setError("Only CorelDRAW (.cdr) files are accepted."); return; }
    const maximumMb = slot?.maxFileSize ?? requirement.maxFileSize;
    if (maximumMb && file.size > maximumMb * 1024 * 1024) { setError(`File exceeds the ${maximumMb} MB limit.`); return; }

    // For standard files under the server body-size limit, server-assisted upload is fast and completely avoids R2 CORS errors
    if (file.size <= SERVER_UPLOAD_LIMIT_BYTES) {
      uploadViaServer(file);
      return;
    }

    // Larger files must go direct-to-R2 via a presigned URL — the server route cannot accept
    // a body this size on Vercel, so falling back to it here would only fail a second time.
    // Retry with a fresh presigned URL (it can expire, or the first attempt can hit a transient
    // network/CORS error) before surfacing an error to the customer.
    await uploadDirect(file, 1);
  }

  async function uploadDirect(file: File, attempt: number) {
    const maxAttempts = 3;
    setPhase("processing"); setProgress(null);
    try {
      const startResponse = await fetch("/api/artworks/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          pricingRuleId,
          artworkSlotId: slot?.id ?? null,
          artworkSlotKey: slot?.slotKey ?? "MAIN",
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
          replaceArtworkId: artwork?.id ?? null,
          configuration,
        }),
      });
      const started = await startResponse.json().catch(() => null);
      if (!startResponse.ok || !started?.data?.uploadUrl) {
        throw new Error(started?.error?.message || "Could not start the upload. Please try again.");
      }

      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        setPhase("uploading"); setProgress(0);
        request.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
          else setProgress(null);
        });
        request.addEventListener("load", async () => {
          if (request.status < 200 || request.status >= 300) {
            reject(new Error(`Upload to storage failed (HTTP ${request.status}).`));
            return;
          }
          setProgress(100); setPhase("processing");
          try {
            const finalizeResponse = await fetch(`/api/artworks/${started.data.artwork.id}/finalize`, { method: "POST" });
            const finalized = await finalizeResponse.json().catch(() => null);
            if (!finalizeResponse.ok || !finalized?.data) throw new Error(finalized?.error?.message || "The uploaded file could not be verified.");
            onUploaded(finalized.data);
            window.setTimeout(() => setPhase("idle"), 500);
            resolve();
          } catch (caught) {
            reject(caught instanceof Error ? caught : new Error("The uploaded file could not be verified."));
          }
        });
        request.addEventListener("error", () => reject(new Error("Connection to storage was interrupted.")));
        request.open(started.data.method || "PUT", started.data.uploadUrl);
        for (const [name, value] of Object.entries(started.data.headers as Record<string, string>)) request.setRequestHeader(name, value);
        request.send(file);
      });
    } catch (caught) {
      if (attempt < maxAttempts) {
        await uploadDirect(file, attempt + 1);
        return;
      }
      setError(caught instanceof Error ? caught.message : "Upload failed after multiple attempts. Please check your connection and try again.");
      setPhase("failed");
    }
  }

  async function remove() {
    if (!artwork) return;
    setError("");
    const artworkId = artwork.id;
    // Immediately clear local state so customer can select another CDR without waiting
    onRemoved();
    setPhase("idle");
    setProgress(null);
    try {
      await fetch(`/api/artworks/${artworkId}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Artwork remove request warning:", e);
    }
  }

  const full = formatDimensions(requirement.designWidth, requirement.designHeight, requirement.designUnit || "mm");
  const safe = formatDimensions(requirement.safeAreaWidth, requirement.safeAreaHeight, requirement.designUnit || "mm");
  const final = formatDimensions(requirement.finalWidth, requirement.finalHeight, requirement.designUnit || "mm");
  const pages = requirement.pageInstructions ?? [];
  const maximumMb = slot?.maxFileSize ?? requirement.maxFileSize;
  const busy = phase === "uploading" || phase === "processing";

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <input
          ref={input}
          type="file"
          accept=".cdr"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) upload(file);
          }}
        />
        {!artwork ? (
          <button
            type="button"
            onClick={choose}
            onDragOver={(event) => event.preventDefault()}
            onDrop={drop}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-[#9caed0] bg-white px-4 py-2 text-sm font-bold text-[#2457b8] hover:border-[#2457b8] transition disabled:opacity-60"
          >
            <UploadCloud size={16} />
            {busy ? (phase === "processing" ? "Processing..." : progress === null ? "Uploading..." : `Uploading ${progress}%`) : `Upload ${slot?.name ?? "CDR artwork"}`}
          </button>
        ) : (
          <div className="flex w-full items-center justify-between gap-2 rounded-full border border-[#c8d7f1] bg-[#f5f8ff] px-4 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-[#162237]">
              <CheckCircle2 size={15} className="shrink-0 text-[#1f633d]" />
              <span className="truncate">{artwork.originalFileName}</span>
            </span>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              title="Remove and upload another"
              aria-label="Remove artwork"
              className="grid size-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-60"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {error ? <p className="text-xs font-semibold text-[#a53025]">{error}</p> : null}
      </div>
    );
  }

  return (
    <section className="border border-[#d4dbe7] bg-[#fbfcff] p-4 sm:p-5">
      <input
        ref={input}
        type="file"
        accept=".cdr"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) upload(file);
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.13em] text-[#2457b8]">
            {slot?.name ?? "Upload artwork"}{slot && !slot.required ? " (optional)" : ""}
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[#162237]">
            {formatLabel()} only{maximumMb ? `, maximum ${maximumMb} MB` : ""}
          </p>
          {slot?.instructions ? <p className="mt-1 text-[13px] text-[#607089]">{slot.instructions}</p> : null}
        </div>
        <FileBox size={23} className="text-[#2457b8]" />
      </div>

      {showRequirements ? (
        <>
          <div className="mt-3 grid gap-2 text-[13px] text-[#52647e] sm:grid-cols-3">
            {full ? <p><strong>Full design:</strong> {full}</p> : null}
            {safe ? <p><strong>Safe area:</strong> {safe}</p> : null}
            {final ? <p><strong>Final size:</strong> {final}</p> : null}
          </div>
          {pages.length ? (
            <div className="mt-4 border-l-2 border-[#2457b8] pl-4">
              <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-[#263753]">Required artwork files</p>
              <ol className="mt-2 space-y-1.5 text-[15px] text-[#52647e]">
                {pages.map((page, index) => (
                  <li key={`${page.pageNumber}-${page.label}`}>
                    <span className="font-semibold text-[#162237]">{index + 1}. {page.label}</span>
                    {page.colorMode ? ` (${page.colorMode})` : ""}
                    {page.required === false ? " - when applicable" : ""}
                    {page.notes ? <span className="block text-[13px]">{page.notes}</span> : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {requirement.multiplePageInstructions ? <p className="mt-3 whitespace-pre-line text-[15px] leading-5 text-[#52647e]">{requirement.multiplePageInstructions}</p> : null}
          {requirement.additionalInstructions ? <p className="mt-3 whitespace-pre-line text-[15px] leading-5 text-[#52647e]">{requirement.additionalInstructions}</p> : null}
        </>
      ) : null}

      {!artwork ? (
        <button
          type="button"
          onClick={choose}
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
          disabled={phase === "uploading" || phase === "processing"}
          className="mt-4 flex w-full flex-col items-center justify-center border border-dashed border-[#9caed0] bg-white px-4 py-7 text-center hover:border-[#2457b8] transition cursor-pointer"
        >
          <UploadCloud size={28} className="text-[#2457b8]" />
          <span className="mt-2 text-[15px] font-bold text-[#162237]">Upload CDR artwork</span>
          <span className="mt-1 text-[13px] text-[#607089]">Drop your CorelDRAW file here, or select it from your device.</span>
        </button>
      ) : (
        <div
          className="relative mt-4 border border-[#c8d7f1] bg-white p-4 transition"
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
        >
          {/* Prominent Cross (X) button at top-right to easily remove/cancel */}
          <button
            type="button"
            onClick={() => void remove()}
            disabled={phase === "uploading" || phase === "processing"}
            title="Remove file and upload another"
            aria-label="Remove artwork"
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-3 pr-8">
            <div className="grid size-10 shrink-0 place-items-center bg-[#edf3ff] text-[#2457b8]">
              <FileBox size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[15px] font-bold text-[#1f633d]">
                <CheckCircle2 size={16} />Artwork uploaded successfully
              </p>
              <p className="mt-1 truncate text-[15px] font-semibold text-[#162237]">{artwork.originalFileName}</p>
              <p className="mt-1 text-[13px] text-[#607089]">{bytes(artwork.fileSize)} / {artwork.fileType.toUpperCase()} / Ready for review</p>
            </div>
          </div>
          <p className="mt-3 text-[13px] text-[#607089]">A visual document preview is not shown because CorelDRAW files are not browser-native images.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={choose}
              disabled={phase === "uploading" || phase === "processing"}
              className="inline-flex items-center gap-2 border border-[#aab9d1] px-3 py-2 text-[13px] font-bold text-[#2457b8] hover:bg-[#edf3ff] transition"
            >
              <RefreshCw size={14} />Change file / Upload another
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={phase === "uploading" || phase === "processing"}
              className="inline-flex items-center gap-2 border border-[#e3c5c0] px-3 py-2 text-[13px] font-bold text-[#a53025] hover:bg-[#fdf2f2] transition"
            >
              <Trash2 size={14} />Remove
            </button>
          </div>
        </div>
      )}

      {(phase === "uploading" || phase === "processing") ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[13px] font-semibold text-[#2457b8]">
            <span>{phase === "processing" ? "Processing artwork" : "Uploading artwork"}</span>
            <span>{progress === null ? "In progress" : `${progress}%`}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden bg-[#dbe4f3]">
            <div
              className={progress === null ? "h-full w-1/2 animate-pulse bg-[#2457b8]" : "h-full bg-[#2457b8] transition-[width]"}
              style={progress === null ? undefined : { width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-[15px] font-semibold text-[#a53025]">{error}</p> : null}
    </section>
  );
}
