import Dashboard from "@/components/Dashboard";
import ComparisonView from "@/components/ComparisonView";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 font-mono flex flex-col items-center">
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm py-4 w-full text-center mb-8 border-b border-gray-800">
        <h1 className="text-4xl font-bold text-[#ef4444]">Edge-Pali</h1>
        <p className="text-gray-500 text-sm mt-1">Dynamic VRAM Optimizer</p>
      </header>

      <div className="flex flex-col items-center gap-10 w-full max-w-6xl">
        <Dashboard />
        <ComparisonView />
      </div>
    </main>
  );
}