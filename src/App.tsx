import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { globalStore } from "@/store";
export function Home() {
  const count = globalStore((state) => state.count);
  const increment = globalStore((state) => state.increment);
  const decrement = globalStore((state) => state.decrement);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Home</h2>
      <p>Count: {count}</p>
      <div className="flex gap-2 justify-center">
        <Button onClick={increment}>Increment</Button>
        <Button onClick={decrement}>Decrement</Button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="container mx-auto py-8">
      <nav className="mb-6 flex gap-4 justify-center">
        <Link to="/" className="text-blue-600 hover:underline">
          Home
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
