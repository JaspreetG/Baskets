# **Baskiit – Smarter Investing, Effortless Portfolios**

---

**Live demo →** [https://baskiit.vercel.app](https://baskiit.vercel.app/)

---

### **Overview**

**Baskiit** is a modern, production-ready web application for building and managing stock baskets with live price updates, portfolio analytics, and a polished user interface.

It’s designed to help users simplify their investment journey — whether you’re experimenting with themes or managing long-term strategies — with a focus on usability, responsiveness, and real-time performance.

---

### **✨ What You Can Do**

- **Create stock baskets**: Add multiple stocks under a single theme or idea.
- **Track performance**: See how your baskets are doing in real time — including total value, returns, and XIRR.
- **Live pricing**: Real-time LTP pulled via Groww APIs using Supabase Edge Functions.
- **Exit anytime**: Close out a basket with a single tap, and the sell price/date is auto-tracked.
- **Login with Google**: Secure Google OAuth 2.0 integration via Supabase.
- **Install as PWA**: Baskiit is installable, offline-capable, and mobile-first.
- **Smooth UX**: Modern transitions, empty states, loading screens, and clear value visibility.

---

### **Tech Stack**

**Frontend:** React 19, Vite, Zustand for state, React Router for routing

**UI/UX:** Tailwind CSS, shadcn/ui components, Framer Motion (animations), Sonner (toasts)

**Backend & Data:** Supabase – Auth (OAuth), Postgres DB, RPC functions, Edge Functions for 3rd-party API handling

**Extras:** Full PWA support (installable, offline-ready), SEO-ready HTML

---

### **Local Development**

1. **Clone the project**

```
git clone https://github.com/JaspreetG/Baskets.git
cd baskiit
```

1. **Install dependencies**

```
npm install
```

1. **Create .env file**

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

1. **Run locally**

```
npm run dev
```

App will be available at http://localhost:5173

---

### **Authentication**

Baskiit uses Supabase Auth with Google OAuth.

After login, the session is persisted securely using Supabase cookies.

Login works across environments using dynamic redirect URLs.

---

### **Folder Structure**

```
src/
├─ components/   → Reusable UI elements
├─ pages/        → App pages like Auth, Dashboard, Invest
├─ lib/          → Supabase client setup, helpers
├─ store/        → Global state (Zustand)
├─ assets/       → Manifest, icons, logos
```

---

### **Live Deployment**

No server setup required — all Supabase backend + Edge Functions are already deployed.

**Visit:** [https://baskiit.vercel.app](https://baskiit.vercel.app/)

---
