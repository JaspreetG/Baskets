import AnimatedLayout from "@/components/AnimatedLayout";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col font-sans relative overflow-x-hidden bg-[#fbfbfd]">
      {/* Apple Liquid Glass Ambient Backdrops */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
        <div className="absolute top-0 -left-[10%] h-[700px] w-[700px] rounded-full bg-blue-100/50 blur-[120px] mix-blend-multiply opacity-60 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-[40%] -right-[15%] h-[800px] w-[800px] rounded-full bg-indigo-50/60 blur-[130px] mix-blend-multiply opacity-70 animate-pulse" style={{ animationDuration: '12s' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] h-[600px] w-[600px] rounded-full bg-emerald-50/50 blur-[100px] mix-blend-multiply opacity-50 animate-pulse" style={{ animationDuration: '10s' }}></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="flex-1 pb-10">
          <AnimatedLayout />
        </main>
      </div>
    </div>
  );
}
