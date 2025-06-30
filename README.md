Baskiit – Smarter Investing, Effortless Portfolios

Live Demo: https://baskiit.vercel.app

⸻

📌 Overview

Baskiit is a modern portfolio management app that lets users create, invest in, and track custom stock baskets — all in one beautiful, responsive dashboard.

Whether you’re a long-term investor or testing stock themes, Baskiit helps simplify your investment strategy with real-time data and intelligent insights.

⸻

✨ Features
• 🧺 Create Custom Baskets
Build thematic stock baskets and invest flexibly.
• 📈 Real-Time Stock Prices
Live price fetch via Groww APIs and Supabase edge functions.
• 📊 Performance Tracking
View current value, invested value, total return, and XIRR.
• 🚪 Effortless Exit
Exit entire baskets in one click, with real-time updates.
• 🔐 Secure Auth
Google OAuth 2.0 login via Supabase, with persistent sessions.
• 📱 Progressive Web App (PWA)
Installable, offline-capable, and mobile-optimized.
• 💎 Polished UX
Smooth animations, elegant UI, and clear messaging with empty & loading states.

⸻

🛠 Tech Stack

Layer Tools & Libraries
Frontend React 19, Vite, React Router, Zustand
UI/UX Tailwind CSS, shadcn/ui, Framer Motion, Sonner
Backend Supabase (PostgreSQL, Edge Functions, Auth)
Other PWA support (manifest, service worker, icons)

⸻

🚀 Getting Started

1. Clone the repository

git clone https://github.com/yourusername/baskiit.git
cd baskiit

2. Install dependencies

npm install

3. Add environment variables

Create a .env file at the root and add:

VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key

4. Run locally

npm run dev

Visit: http://localhost:5173

⸻

🔐 Authentication
• Powered by Supabase Auth with Google OAuth 2.0
• Auth state persisted using secure cookies
• Uses dynamic redirectTo to support localhost and production seamlessly

⸻

📦 Project Structure

src/
├── components/ # Reusable UI elements (cards, buttons, layout)
├── pages/ # Auth, Dashboard, Basket, Invest, Search
├── lib/ # Supabase config, helper utils
├── store/ # Zustand global state
├── assets/ # Icons, logos, manifest

⸻

🌐 Live Demo

Test out the full experience on https://baskiit.vercel.app

No backend setup required — it’s fully functional with Supabase and Edge Functions deployed.
