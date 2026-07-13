"use client";
import { useState } from "react";

export default function ComparisonView() {
  const [data, setData] = useState<any>(null);
  const runCompare = async () => {
    const res = await fetch("http://127.0.0.1:8000/compare", { method: "POST" });
    setData(await res.json());
  };

  return (
    <div className="w-full text-center">
      <button onClick={runCompare} className="bg-[#111] border border-[#f97316] text-[#f97316] px-8 py-3 rounded-lg hover:bg-[#f97316] hover:text-white mb-8 font-bold">
        Compare With/Without Edge-Pali
      </button>
      {data && (
        <div className="grid grid-cols-3 gap-6 text-left">
          <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
            <h3 className="text-gray-400 mb-4 font-bold uppercase">WITHOUT EDGE-PALI</h3>
            <p className="text-lg">Patches: <span className="font-bold text-white">{data.without_edge_pali.patches_kept}</span></p>
          </div>
          <div className="bg-[#111] p-6 rounded-xl border border-[#ef4444]/30">
            <h3 className="text-[#ef4444] mb-4 font-bold uppercase">HEURISTIC PRUNING</h3>
            <p className="text-lg">Patches: <span className="font-bold text-white">{data.with_edge_pali_heuristic.patches_kept}</span></p>
            <p className="text-lg">Reduction: <span className="font-bold text-[#f97316]">{(data.with_edge_pali_heuristic.reduction_pct * 100).toFixed(1)}%</span></p>
          </div>
          <div className="bg-[#111] p-6 rounded-xl border border-[#f97316]/30">
            <h3 className="text-[#f97316] mb-4 font-bold uppercase">LEARNED PRUNING</h3>
            <p className="text-lg">Patches: <span className="font-bold text-white">{data.with_edge_pali_learned.patches_kept}</span></p>
            <p className="text-lg">Reduction: <span className="font-bold text-[#f97316]">{(data.with_edge_pali_learned.reduction_pct * 100).toFixed(1)}%</span></p>
          </div>
        </div>
      )}
    </div>
  );
}