import { Button } from "@/components/ui/button";

export default function SearchBasket() {
  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Search Baskets</h2>
      <form className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          type="text"
          placeholder="Search for baskets..."
        />
        <Button type="submit">Search</Button>
      </form>
      <div className="mt-6 text-gray-500">No results found.</div>
    </div>
  );
}
