import { Outlet } from "react-router-dom";
import RequireAuth from "@/components/RequireAuth";

export default function App() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
