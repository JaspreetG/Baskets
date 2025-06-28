import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  return (
    <div className="max-w-sm mx-auto p-6 bg-white rounded shadow space-y-6">
      <h2 className="text-xl font-bold text-center mb-4">
        {isLogin ? "Login" : "Register"}
      </h2>
      <form className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          type="email"
          placeholder="Email"
          required
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="Password"
          required
        />
        {!isLogin && (
          <input
            className="w-full border rounded px-3 py-2"
            type="text"
            placeholder="Name"
            required
          />
        )}
        <Button className="w-full" type="submit">
          {isLogin ? "Login" : "Register"}
        </Button>
      </form>
      <button
        className="text-blue-600 hover:underline w-full"
        onClick={() => setIsLogin((v) => !v)}
      >
        {isLogin
          ? "Don't have an account? Register"
          : "Already have an account? Login"}
      </button>
    </div>
  );
}
