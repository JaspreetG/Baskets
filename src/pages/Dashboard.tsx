export default function Dashboard() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-semibold mb-2">Your Baskets</h3>
          <p className="text-gray-500">No baskets yet. Create one!</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-semibold mb-2">Recent Activity</h3>
          <p className="text-gray-500">No recent activity.</p>
        </div>
      </div>
    </div>
  );
}
