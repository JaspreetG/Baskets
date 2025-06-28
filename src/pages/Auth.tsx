import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

export default function Auth() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl px-8 py-10 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-semibold text-white">
            Login to your account
          </h2>
          <p className="text-sm text-gray-400">
            Access your baskets and manage investments
          </p>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full bg-white text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
            variant="outline"
          >
            <FcGoogle className="w-5 h-5" />
            Login with Google
          </Button>

          <Button
            className="w-full bg-white text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
            variant="outline"
          >
            <FaApple className="w-5 h-5" />
            Login with Apple
          </Button>
        </div>
      </div>
    </div>
  );
}
