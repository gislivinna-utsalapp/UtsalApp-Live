// client/src/App.tsx
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

import AdminPage from "@/pages/Admin";

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
import BottomNav from "@/components/BottomNav";

/* ======================================================
   GA4 – SPA route tracking (production-grade)
   Skráir page_view við hverja route breytingu
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-24 text-foreground [&_*]:text-foreground">
        {/* GA4 SPA tracking */}
        <AnalyticsTracker />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leit" element={<SearchPage />} />
          <Route path="/flokkar" element={<CategoriesPage />} />
          <Route path="/about" element={<About />} />

          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/store/:id" element={<StorePage />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register-store" element={<RegisterStore />} />

          <Route path="/admin" element={<AdminPage />} />
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
