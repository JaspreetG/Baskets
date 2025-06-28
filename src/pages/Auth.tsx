import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Auth() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full">
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center text-indigo-900 tracking-tight">
              Welcome to Baskets
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Sign in to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-lg border-gray-300 hover:bg-gray-100"
                type="button"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      d="M21.805 10.023h-9.765v3.954h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.125s2.75-6.125 6.125-6.125c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.711-1.57-3.922-2.539-6.656-2.539-5.523 0-10 4.477-10 10s4.477 10 10 10c5.75 0 9.547-4.039 9.547-9.75 0-.656-.07-1.156-.156-1.602z"
                      fill="#4285F4"
                    ></path>
                    <path
                      d="M3.545 7.441l3.25 2.383c.883-1.07 2.086-1.883 3.705-1.883 1.133 0 2.211.469 3.023 1.242l2.719-2.648c-1.484-1.383-3.398-2.235-5.742-2.235-2.883 0-5.336 1.57-6.617 3.883z"
                      fill="#34A853"
                    ></path>
                    <path
                      d="M12 22c2.672 0 4.922-.883 6.563-2.406l-3.047-2.484c-.828.57-1.891.914-3.516.914-2.82 0-5.211-1.883-6.07-4.406l-3.242 2.5c1.523 3.008 4.734 5.882 9.312 5.882z"
                      fill="#FBBC05"
                    ></path>
                    <path
                      d="M21.805 10.023h-9.765v3.954h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.125s2.75-6.125 6.125-6.125c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.711-1.57-3.922-2.539-6.656-2.539-5.523 0-10 4.477-10 10s4.477 10 10 10c5.75 0 9.547-4.039 9.547-9.75 0-.656-.07-1.156-.156-1.602z"
                      fill="none"
                    ></path>
                  </g>
                </svg>
                Login with Google
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-lg border-gray-300 hover:bg-gray-100"
                type="button"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      d="M16.365 1.43c0 .788-.64 1.428-1.428 1.428-.788 0-1.428-.64-1.428-1.428C13.509.64 14.149 0 14.937 0c.788 0 1.428.64 1.428 1.43zm6.222 7.62c-.07-1.47-.41-2.77-1.13-3.89-.66-1.06-1.6-1.99-2.8-2.8-1.13-.72-2.42-1.06-3.89-1.13-1.54-.07-6.16-.07-7.7 0-1.47.07-2.77.41-3.89 1.13-1.06.66-1.99 1.6-2.8 2.8-.72 1.13-1.06 2.42-1.13 3.89-.07 1.54-.07 6.16 0 7.7.07 1.47.41 2.77 1.13 3.89.66 1.06 1.6 1.99 2.8 2.8 1.13.72 2.42 1.06 3.89 1.13 1.54.07 6.16.07 7.7 0 1.47-.07 2.77-.41 3.89-1.13 1.06-.66 1.99-1.6 2.8-2.8.72-1.13 1.06-2.42 1.13-3.89.07-1.54.07-6.16 0-7.7zm-2.23 10.14c-.35.88-1.03 1.56-1.91 1.91-.66.27-2.23.21-7.35.21s-6.69.06-7.35-.21c-.88-.35-1.56-1.03-1.91-1.91-.27-.66-.21-2.23-.21-7.35s-.06-6.69.21-7.35c.35-.88 1.03-1.56 1.91-1.91.66-.27 2.23-.21 7.35-.21s6.69-.06 7.35.21c.88.35 1.56 1.03 1.91 1.91.27.66.21 2.23.21 7.35s.06 6.69-.21 7.35zm-7.357-10.14c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8.18c-1.76 0-3.18-1.42-3.18-3.18s1.42-3.18 3.18-3.18 3.18 1.42 3.18 3.18-1.42 3.18-3.18 3.18z"
                      fill="#000"
                    />
                  </g>
                </svg>
                Login with Apple
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
