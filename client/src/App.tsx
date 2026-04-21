// client/src/App.tsx
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

import AdminPage from "@/pages/Admin";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";

import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import CategoriesPage from "./pages/CategoriesPage";
import Login from "./pages/Login";
import RegisterStore from "./pages/RegisterStore";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import PostDetail from "./pages/PostDetail";
import Profile from "./pages/Profile";
import About from "./pages/About";
import NotFound from "./pages/not-found";
import StorePage from "./pages/StorePage";
import StoresPage from "./pages/StoresPage";
import PricingPage from "./pages/PricingPage";
import CartPage from "./pages/CartPage";

/* 👉 NÝTT: Choose Plan */
import ChoosePlanPage from "./pages/ChoosePlanPage";

import BottomNav from "@/components/BottomNav";

/* ======================================================
   GA4 – SPA route tracking (production-grade)
====================================================== */
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "page_view", {
        page_path: location.pathname + location.search + location.hash,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [location]);

  return null;
}

export default function App() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="max-w-lg mx-auto">
        {/* GA4 SPA tracking */}
        <AnalyticsTracker />

        <Routes>
          {/* -------- PUBLIC -------- */}
          <Route path="/" element={<Home />} />
          <Route path="/leit" element={<SearchPage />} />
          <Route path="/flokkar" element={<CategoriesPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<PricingPage />} />

          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/store/:id" element={<StorePage />} />
          <Route path="/karfa" element={<CartPage />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register-store" element={<RegisterStore />} />

          {/* 👉 NÝTT SKREF Í ONBOARDING */}
          <Route path="/choose-plan" element={<ChoosePlanPage />} />

          {/* -------- AUTH / APP -------- */}
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/edit-post/:id" element={<EditPost />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <BottomNav />
    </div>
  );
}
