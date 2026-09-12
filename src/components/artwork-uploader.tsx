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

export function ArtworkUploader({ productId, pricingRuleId, requirement, slot, showRequirements = true, compact = false, inline = false, configuration, artwork, onUploaded, onRemoved }: { productId: string; pricingRuleId: string | null; requirement: ArtworkRequirement; slot?: ArtworkSlot; showRequirements?: boolean; compact?: boolean; inline?: boolean; configuration: Record<string, string>; artwork: UploadedArtwork | null; onUploaded: (artwork: UploadedArtwork) => void; onRemoved: () => void }) {
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

  if (inline) {
    return (
      <div className="inline-flex items-center gap-1">
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
            disabled={busy}
            title={slot?.name ? `Upload ${slot.name} CDR` : "Upload CDR artwork"}
            className="inline-flex items-center gap-1 h-7 rounded border border-dashed border-[var(--mc-accent)] bg-blue-50/60 px-2 text-xs font-bold text-[var(--mc-accent)] hover:bg-blue-100/80 transition disabled:opacity-60 whitespace-nowrap"
          >
            <UploadCloud size={13} />
            <span>{busy ? (progress === null ? "..." : `${progress}%`) : "Upload CDR"}</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 h-7 rounded bg-emerald-50 px-2 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="max-w-[110px] truncate text-[11px]" title={artwork.originalFileName}>
              {artwork.originalFileName}
            </span>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              title="Remove"
              aria-label="Remove artwork"
              className="text-slate-400 hover:text-rose-600 transition ml-0.5"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {error ? <span className="text-[10px] font-semibold text-rose-600" title={error}>!</span> : null}
      </div>
    );
  }

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
    <section className="rounded-xl border border-[#d4dbe7] bg-[#f8faff] p-3 sm:p-3.5">
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[12px] font-bold uppercase tracking-wider text-[#2457b8]">
            {slot?.name ?? "Production artwork"}{slot && !slot.required ? " (optional)" : ""}
          </span>
          <span className="rounded bg-[#e8eefa] px-2 py-0.5 text-[11px] font-semibold text-[#1e4da1]">
            {formatLabel()} only{maximumMb ? ` · Max ${maximumMb}MB` : ""}
          </span>
        </div>
        <FileBox size={18} className="text-[#2457b8] shrink-0" />
      </div>

      {showRequirements && (full || safe || final) ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[#e0e7f3] bg-white px-2.5 py-1.5 text-xs text-[#52647e]">
          {full ? <span><strong className="text-[#162237]">Design:</strong> {full}</span> : null}
          {safe ? <span><strong className="text-[#162237]">Safe:</strong> {safe}</span> : null}
          {final ? <span><strong className="text-[#162237]">Final:</strong> {final}</span> : null}
        </div>
      ) : null}

      {showRequirements && pages.length ? (
        <div className="mt-1.5 text-xs text-[#52647e]">
          <span className="font-semibold text-[#162237]">Required files: </span>
          {pages.map((page, index) => (
            <span key={`${page.pageNumber}-${page.label}`}>
              {index > 0 ? ", " : ""}
              {page.label}
              {page.colorMode ? ` (${page.colorMode})` : ""}
            </span>
          ))}
          {pages.some((p) => p.notes) ? (
            <span className="block text-[11px] text-[#607089] mt-0.5">
              {pages.map((p) => p.notes).filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </div>
      ) : null}

      {!artwork ? (
        <button
          type="button"
          onClick={choose}
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
          disabled={busy}
          className="mt-2.5 flex w-full items-center justify-center gap-3 rounded-lg border border-dashed border-[#9caed0] bg-white px-3 py-3 hover:border-[#2457b8] hover:bg-[#f3f7fd] transition cursor-pointer disabled:opacity-60"
        >
          <UploadCloud size={22} className="text-[#2457b8] shrink-0" />
          <div className="text-left min-w-0">
            <span className="block text-xs font-bold text-[#162237]">Upload CDR artwork</span>
            <span className="block text-[11px] text-[#607089] truncate">Drop CorelDRAW (.cdr) file or click to browse</span>
          </div>
        </button>
      ) : (
        <div
          className="relative mt-2.5 rounded-lg border border-[#c8d7f1] bg-white p-2.5 sm:p-3 transition"
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
        >
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            title="Remove file and upload another"
            aria-label="Remove artwork"
            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-60"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-2.5 pr-6">
            <div className="grid size-8 shrink-0 place-items-center rounded bg-[#edf3ff] text-[#2457b8]">
              <FileBox size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-xs font-bold text-[#1f633d]">
                <CheckCircle2 size={13} className="shrink-0" /> Artwork uploaded
              </p>
              <p className="truncate text-xs font-semibold text-[#162237] mt-0.5">{artwork.originalFileName}</p>
              <p className="text-[11px] text-[#607089]">{bytes(artwork.fileSize)} · CDR file ready</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-1.5">
            <button
              type="button"
              onClick={choose}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2457b8] hover:underline transition"
            >
              <RefreshCw size={12} /> Change file
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#a53025] hover:underline transition"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      )}

      {busy ? (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#2457b8]">
            <span>{phase === "processing" ? "Processing artwork..." : "Uploading artwork..."}</span>
            <span>{progress === null ? "In progress" : `${progress}%`}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-[#dbe4f3]">
            <div
              className={progress === null ? "h-full w-1/2 animate-pulse bg-[#2457b8]" : "h-full bg-[#2457b8] transition-[width]"}
              style={progress === null ? undefined : { width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs font-semibold text-[#a53025]">{error}</p> : null}
    </section>
  );
}
