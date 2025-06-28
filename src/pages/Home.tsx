import { globalStore } from "@/store";
import { Button } from "@/components/ui/button";

export default function Home() {
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
