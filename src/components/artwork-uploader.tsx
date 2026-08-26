"use client";

import { CheckCircle2, FileBox, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

export type ArtworkRequirement = {
  artworkRequired: boolean;
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
  additionalInstructions: string | null;
};

export type UploadedArtwork = { id: string; originalFileName: string; fileSize: number; status: string; uploadedAt: string; previewUrl?: string | null };

function bytes(value: number) { return `${(value / 1024 / 1024).toFixed(value < 1024 * 1024 ? 1 : 0)} MB`; }
function dimensions(width: string | null, height: string | null, unit: string | null) { return width && height ? `${width} x ${height} ${unit || "mm"}` : null; }

export function ArtworkUploader({ productId, pricingRuleId, requirement, configuration, artwork, onUploaded, onRemoved }: { productId: string; pricingRuleId: string | null; requirement: ArtworkRequirement; configuration: Record<string, string>; artwork: UploadedArtwork | null; onUploaded: (artwork: UploadedArtwork) => void; onRemoved: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "failed">("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  function choose() { input.current?.click(); }
  function drop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) upload(file);
  }
  async function upload(file: File) {
    setError("");
    if (!file.name.toLowerCase().endsWith(".cdr")) { setError("Only CorelDRAW (.cdr) files are accepted."); return; }
    if (requirement.maxFileSize && file.size > requirement.maxFileSize * 1024 * 1024) { setError(`File exceeds the ${requirement.maxFileSize} MB limit.`); return; }
    setPhase("processing"); setProgress(null);
    try {
      const startResponse = await fetch("/api/artworks/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, pricingRuleId, filename: file.name, contentType: file.type || "application/octet-stream", fileSize: file.size, replaceArtworkId: artwork?.id ?? null, configuration }) });
      const started = await startResponse.json().catch(() => null);
      if (!startResponse.ok || !started?.data?.uploadUrl) throw new Error(started?.error?.message || "Upload could not be started.");
      const request = new XMLHttpRequest();
      setPhase("uploading"); setProgress(0);
      request.upload.addEventListener("progress", (event) => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); else setProgress(null); });
      request.addEventListener("load", async () => {
        if (request.status < 200 || request.status >= 300) { setError("Upload failed. Please try again."); setPhase("failed"); return; }
        setProgress(100); setPhase("processing");
        try {
          const finalizeResponse = await fetch(`/api/artworks/${started.data.artwork.id}/finalize`, { method: "POST" });
          const finalized = await finalizeResponse.json().catch(() => null);
          if (!finalizeResponse.ok || !finalized?.data) throw new Error(finalized?.error?.message || "The uploaded file could not be verified.");
          onUploaded(finalized.data);
          window.setTimeout(() => setPhase("idle"), 500);
        } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload failed. Please try again."); setPhase("failed"); }
      });
      request.addEventListener("error", () => { setError("Connection interrupted. Please retry."); setPhase("failed"); });
      request.open(started.data.method || "PUT", started.data.uploadUrl);
      for (const [name, value] of Object.entries(started.data.headers as Record<string, string>)) request.setRequestHeader(name, value);
      request.send(file);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed. Please try again.");
      setPhase("failed");
    }
  }
  async function remove() {
    if (!artwork) return;
    setError("");
    const response = await fetch(`/api/artworks/${artwork.id}`, { method: "DELETE" });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message || "Could not remove the file."); return; }
    onRemoved();
  }
  const full = dimensions(requirement.designWidth, requirement.designHeight, requirement.designUnit);
  const safe = dimensions(requirement.safeAreaWidth, requirement.safeAreaHeight, requirement.designUnit);
  const final = dimensions(requirement.finalWidth, requirement.finalHeight, requirement.designUnit);
  return <section className="border border-[#d4dbe7] bg-[#fbfcff] p-4 sm:p-5"><input ref={input} type="file" accept=".cdr" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) upload(file); }} />
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#2457b8]">Artwork requirements</p><p className="mt-1 text-sm font-semibold text-[#162237]">CDR only{requirement.maxFileSize ? `, maximum ${requirement.maxFileSize} MB` : ""}</p></div><FileBox size={23} className="text-[#2457b8]" /></div>
    <div className="mt-3 grid gap-2 text-xs text-[#52647e] sm:grid-cols-3">{full ? <p><strong>Full design:</strong> {full}</p> : null}{safe ? <p><strong>Safe area:</strong> {safe}</p> : null}{final ? <p><strong>Final size:</strong> {final}</p> : null}</div>{requirement.additionalInstructions ? <p className="mt-3 text-sm leading-5 text-[#52647e]">{requirement.additionalInstructions}</p> : null}
    {!artwork ? <button type="button" onClick={choose} onDragOver={(event) => event.preventDefault()} onDrop={drop} disabled={phase === "uploading" || phase === "processing"} className="mt-4 flex w-full flex-col items-center justify-center border border-dashed border-[#9caed0] bg-white px-4 py-7 text-center hover:border-[#2457b8]"><UploadCloud size={28} className="text-[#2457b8]" /><span className="mt-2 text-sm font-bold text-[#162237]">Upload CDR artwork</span><span className="mt-1 text-xs text-[#607089]">Drop a CDR file here, or select it from your device.</span></button> : <div className="mt-4 border border-[#c8d7f1] bg-white p-4"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center bg-[#edf3ff] text-[#2457b8]"><FileBox size={20} /></div><div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-sm font-bold text-[#1f633d]"><CheckCircle2 size={16} />Artwork uploaded successfully</p><p className="mt-1 truncate text-sm font-semibold text-[#162237]">{artwork.originalFileName}</p><p className="mt-1 text-xs text-[#607089]">{bytes(artwork.fileSize)} / CDR / Ready for review</p></div></div><p className="mt-3 text-xs text-[#607089]">A visual document preview is not shown because CorelDRAW files are not browser-native images.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={choose} className="inline-flex items-center gap-2 border border-[#aab9d1] px-3 py-2 text-xs font-bold text-[#2457b8]"><RefreshCw size={14} />Change file</button><button type="button" onClick={() => void remove()} className="inline-flex items-center gap-2 border border-[#e3c5c0] px-3 py-2 text-xs font-bold text-[#a53025]"><Trash2 size={14} />Remove</button></div></div>}
    {(phase === "uploading" || phase === "processing") ? <div className="mt-4"><div className="flex items-center justify-between text-xs font-semibold text-[#2457b8]"><span>{phase === "processing" ? "Processing artwork" : "Uploading artwork"}</span><span>{progress === null ? "In progress" : `${progress}%`}</span></div><div className="mt-2 h-2 overflow-hidden bg-[#dbe4f3]"><div className={progress === null ? "h-full w-1/2 animate-pulse bg-[#2457b8]" : "h-full bg-[#2457b8] transition-[width]"} style={progress === null ? undefined : { width: `${progress}%` }} /></div></div> : null}
    {error ? <p className="mt-3 text-sm font-semibold text-[#a53025]">{error}</p> : null}
  </section>;
}
