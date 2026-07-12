"use client";

import { useState } from "react";

const API_URL = "http://127.0.0.1:8000/process-document";

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    if (f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const runProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(API_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Processing failed");
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setError("Could not process document. Is backend running?");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-6xl">
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="text-sm text-gray-400 font-mono"
        />
        <button
          onClick={runProcess}
          disabled={!file || loading}
          className="bg-amdred hover:bg-neonorange transition-colors text-white font-mono px-6 py-2 rounded-md disabled:opacity-50"
        >
          {loading ? "Processing..." : "Run Edge-Pali"}
        </button>
      </div>

      {error && <p className="text-neonorange font-mono">{error}</p>}

      {result && (
        <div className="flex w-full gap-4">
          {/* LEFT ~35% - Without Edge-Pali */}
          <div className="w-[35%] border border-gray-700 rounded-lg p-5 bg-obsidian-light flex flex-col gap-4">
            <h3 className="text-gray-400 text-xs uppercase tracking-wider">
              Without Edge-Pali
            </h3>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="original"
                className="rounded-md border border-gray-800 max-h-48 object-contain"
              />
            )}
            <div className="font-mono text-sm text-gray-300">
              <p>Patches: <span className="text-white">{result.without_edge_pali.patches}</span></p>
              <p>Storage: <span className="text-white">{formatBytes(result.without_edge_pali.storage_bytes)}</span></p>
              <p>Accuracy: <span className="text-white">{result.without_edge_pali.accuracy_pct}%</span></p>
            </div>
          </div>

          {/* RIGHT ~65% - With Edge-Pali */}
          <div className="w-[65%] border border-amdred/40 rounded-lg p-5 bg-obsidian-light flex flex-col gap-4">
            <h3 className="text-amdred text-xs uppercase tracking-wider">
              With Edge-Pali
            </h3>
            <div className="grid grid-cols-2 gap-4 font-mono text-sm">
              <div>
                <p className="text-gray-400 text-xs">Patches Kept</p>
                <p className="text-2xl text-white">{result.with_edge_pali.patches_kept}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Reduction</p>
                <p className="text-2xl text-neonorange">
                  {(result.with_edge_pali.reduction_pct * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Storage</p>
                <p className="text-lg text-white">{formatBytes(result.with_edge_pali.storage_bytes)}</p>
                <p className="text-xs text-neonorange">
                  ({(result.with_edge_pali.storage_saved_pct * 100).toFixed(1)}% saved)
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Honest Tradeoff Accuracy</p>
                <p className="text-lg text-white">
                  {result.with_edge_pali.honest_tradeoff_accuracy_pct}%
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-mono">
              Latency: {result.latency_ms}ms
            </p>
          </div>
        </div>
      )}
    </div>
  );
}