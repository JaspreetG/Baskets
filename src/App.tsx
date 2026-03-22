import AnimatedLayout from "@/components/AnimatedLayout";
import Header from "@/components/Header";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
      <Header />
      <main className="flex-1">
        <AnimatedLayout />
      </main>
    </div>
  );
}
