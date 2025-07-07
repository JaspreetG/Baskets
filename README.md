# **Baskiit – Smarter Investing, Effortless Portfolios**

---

**🔗 Live Demo:** [https://baskiit.vercel.app](https://baskiit.vercel.app)

---

## 📌 Overview

**Baskiit** is a production-grade web application that allows users to create and manage thematic stock baskets with real-time pricing, portfolio analytics, and a clean, mobile-friendly interface.

It is designed to simplify investing for everyone — from casual explorers to long-term strategists — with a focus on responsiveness, performance, and modern UX.

---

## ✨ Features

- **Create stock baskets**: Group multiple stocks under a single investment idea.
- **Track performance**: View live return metrics, total value, and XIRR.
- **Real-time pricing**: Integrated securely via Supabase Edge Functions.
- **Exit anytime**: Auto-record sell price/date on exit.
- **Google Login**: Secure OAuth 2.0 login with persistent sessions.
- **PWA Support**: Fully installable, mobile-first app with offline access.
- **Modern UI**: Animations, toasts, transitions, empty states, and loaders.

---

## 🛠 Tech Stack

**Frontend**

- React 19, Vite, Zustand (global state), React Router

**UI/UX**

- Tailwind CSS, shadcn/ui, Framer Motion, Sonner

**Backend & Data**

- Supabase: Auth, Postgres, Edge Functions
- PostgreSQL RPC functions for nested JSON retrieval from 3+ relational tables
- Edge Functions for secure, performant third-party API access

**Extras**

- Full PWA support (installable/offline)
- SEO-friendly HTML

---

## 🧪 Local Development

```bash
# 1. Clone the repo
git clone https://github.com/JaspreetG/Baskets.git
cd baskiit

# 2. Install dependencies
npm install

# 3. Add your environment variables
echo "VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co" >> .env
echo "VITE_SUPABASE_ANON_KEY=<your-anon-key>" >> .env

# 4. Start dev server
npm run dev
```

App runs at: `http://localhost:5173`

---

## 🔐 Authentication

- Uses Supabase Auth with Google OAuth 2.0.
- Sessions persist securely via Supabase cookies.
- Supports dynamic redirect URLs for all environments.

---

## 📁 Folder Structure

```
src/
├─ components/   # Reusable UI elements
├─ pages/        # Main app pages (Dashboard, Invest, etc.)
├─ lib/          # Supabase client and utility helpers
├─ store/        # Zustand-based global state
├─ assets/       # PWA manifest, icons, etc.
```

---

## 🚀 Live Deployment

- No backend infra needed — Supabase handles all APIs and data.
- Edge Functions and PostgreSQL RPC are deployed serverlessly.

🔗 **Live App:** [https://baskiit.vercel.app](https://baskiit.vercel.app)  
💻 **GitHub:** [https://github.com/JaspreetG/Baskets](https://github.com/JaspreetG/Baskets)

---
