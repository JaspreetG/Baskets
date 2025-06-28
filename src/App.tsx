import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="container mx-auto py-8">
      {/* <nav className="mb-6 flex gap-4 justify-center">
        <Link to="/" className="text-blue-600 hover:underline">
          Home
        </Link>
        <Link to="/login" className="text-blue-600 hover:underline">
          Login
        </Link>
        <Link to="/dashboard" className="text-blue-600 hover:underline">
          Dashboard
        </Link>
        <Link
          to="/createBasket/search"
          className="text-blue-600 hover:underline"
        >
          Search Basket
        </Link>
        <Link
          to="/createBasket/invest"
          className="text-blue-600 hover:underline"
        >
          Invest Basket
        </Link>
      </nav> */}
      <Outlet />
    </div>
  );
}
