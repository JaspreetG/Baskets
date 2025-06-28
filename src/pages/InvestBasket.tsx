import { Button } from "@/components/ui/button";

export default function InvestBasket() {
  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Invest in Basket</h2>
      <form className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          type="number"
          placeholder="Amount to invest"
          min="1"
        />
        <Button className="w-full" type="submit">
          Invest
        </Button>
      </form>
      <div className="mt-6 text-gray-500">No basket selected.</div>
    </div>
  );
}
