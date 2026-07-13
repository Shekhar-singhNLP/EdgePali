"use client";
import { useState, useRef } from "react";

const API_URL = "http://127.0.0.1:8000/process-document";

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const runProcess = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(API_URL, { method: "POST", body: formData });
    setResult(await res.json());
    setLoading(false);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="flex items-center gap-4 bg-[#161616] p-2 rounded-xl border border-gray-800">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <button onClick={() => fileInputRef.current?.click()} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">
          {file ? file.name : "Browse File"}
        </button>
        <button onClick={runProcess} disabled={!file || loading} className="bg-[#ef4444] text-white px-6 py-2 rounded-lg font-bold hover:opacity-90">
          {loading ? "Processing..." : "Run Edge-Pali"}
        </button>
      </div>

      {result && (
        <div className="flex w-full gap-6">
          <div className="w-1/3 bg-[#111] p-6 rounded-xl border border-gray-800">
            <h3 className="text-gray-400 text-xs mb-4 font-bold uppercase tracking-wider">WITHOUT EDGE-PALI</h3>
            <p className="text-lg">Patches: <span className="font-bold text-white">{result.without_edge_pali.patches}</span></p>
            <p className="text-lg">Storage: <span className="font-bold text-white">{(result.without_edge_pali.storage_bytes/1024).toFixed(1)} KB</span></p>
          </div>
          <div className="w-2/3 bg-[#111] p-6 rounded-xl border border-[#ef4444]/40">
            <h3 className="text-[#ef4444] text-xs mb-4 font-bold uppercase tracking-wider">WITH EDGE-PALI</h3>
            <div className="grid grid-cols-2 gap-6 text-xl">
              <p>Patches Kept: <span className="font-bold text-white">{result.with_edge_pali.patches_kept}</span></p>
              <p>Reduction: <span className="font-bold text-[#f97316]">{(result.with_edge_pali.reduction_pct * 100).toFixed(1)}%</span></p>
              <p>Storage: <span className="font-bold text-white">{result.with_edge_pali.storage_bytes} B</span></p>
              <p>Honest Accuracy: <span className="font-bold text-white">{result.with_edge_pali.honest_tradeoff_accuracy_pct}%</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}