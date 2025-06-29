export default function Dashboard() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Portfolio Summary */}
      <section className="space-y-4">
        <h1 className="text-lg font-medium text-gray-800 sm:text-xl">
          Portfolio Overview
        </h1>
        <div className="grid grid-cols-2 gap-6 rounded-xl bg-white p-6 text-sm shadow-sm sm:grid-cols-4 md:text-base">
          <div className="space-y-1">
            <div className="text-gray-500">Portfolio Value</div>
            <div className="text-lg font-medium text-gray-900">₹1,25,000</div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-500">Invested</div>
            <div className="text-lg font-medium text-gray-900">₹1,00,000</div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-500">Total Return</div>
            <div className="text-lg font-medium text-green-600">+₹25,000</div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-500">Return % / XIRR</div>
            <div className="text-lg font-medium text-green-600">
              +25% / 18.3%
            </div>
          </div>
        </div>
      </section>

      {/* Baskets Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 sm:text-xl">
          Your Baskets
        </h2>

        <div className="space-y-4">
          {/* Basket Card 1 */}
          <div className="flex items-start justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 shadow transition-shadow">
            <div className="space-y-1">
              <h3 className="text-base font-medium text-gray-900">
                Tech Titans
              </h3>
              <p className="text-sm text-gray-500">Invested: ₹50,000</p>
              <p className="text-sm text-gray-500">Return: ₹12,000 (+24%)</p>
            </div>
            <div className="text-sm font-semibold text-green-600">24% ROI</div>
          </div>

          {/* Basket Card 2 */}
          <div className="flex items-start justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 shadow transition-shadow">
            <div className="space-y-1">
              <h3 className="text-base font-medium text-gray-900">
                Green Energy
              </h3>
              <p className="text-sm text-gray-500">Invested: ₹50,000</p>
              <p className="text-sm text-gray-500">Return: ₹8,000 (+16%)</p>
            </div>
            <div className="text-sm font-semibold text-green-500">16% ROI</div>
          </div>
        </div>

        {/* Fallback if no baskets exist */}
        {/* <p className="text-gray-500">No baskets yet. Create one!</p> */}
      </section>
    </div>
  );
}
