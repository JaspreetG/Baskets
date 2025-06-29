import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Portfolio Summary */}
      <section className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Portfolio Overview</h1>
        <div className="relative">
          <div className="before:animate-spin-slower before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:border-2 before:border-transparent before:bg-[conic-gradient(at_top_left,_rgba(34,197,94,0.2),rgba(110,231,183,0.2),rgba(34,197,94,0.2))] before:blur">
            <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-md transition hover:shadow-[0_6px_24px_rgba(0,0,0,0.05)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  Holding
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">
                  XIRR 18.3%
                </span>
              </div>
              <p className="mb-4 text-2xl font-bold text-gray-900">₹1,25,000</p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">1D Returns</p>
                <p className="text-sm font-semibold text-green-600">+1.5%</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-500">Total Return</p>
                <p className="text-sm font-semibold text-green-600">+₹25,000</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-500">Invested</p>
                <p className="text-sm font-medium text-gray-900">₹1,00,000</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Baskets Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          <span className="px-3 py-3 text-gray-500">baskets</span>
        </h2>

        <div className="space-y-4">
          {/* Basket Card 1 */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] backdrop-blur-sm">
            <div>
              <h4 className="text-base font-medium text-gray-900">
                Tech Titans
              </h4>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-green-600">₹12,000</p>
              <p className="text-xs text-gray-500">+24%</p>
            </div>
          </div>

          {/* Basket Card 2 */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] backdrop-blur-sm">
            <div>
              <h4 className="text-base font-medium text-gray-900">
                Green Energy
              </h4>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-green-600">₹8,000</p>
              <p className="text-xs text-gray-500">+16%</p>
            </div>
          </div>
        </div>

        {/* Fallback if no baskets exist */}
        {/* <p className="text-gray-500">No baskets yet. Create one!</p> */}
      </section>
      <Link
        to="/search"
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition hover:bg-green-700"
      >
        <span className="text-3xl leading-none">+</span>
      </Link>
    </div>
  );
}
