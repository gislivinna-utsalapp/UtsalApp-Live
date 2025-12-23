// client/src/App.tsx
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

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
import AdminAllPost from "./pages/AdminAllPost";
import StoreProfilePage from "./pages/StoreProfilePage";

function BottomNav() {
  const location = useLocation();
  const tab = location.pathname;
  const { isAdmin } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-primary text-primary-foreground border-t border-border">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase">
        {[
          { to: "/", label: "Heim" },
          { to: "/search", label: "Leit" },
          { to: "/categories", label: "Flokkar" },
          { to: "/profile", label: "Prófíll" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex-1 text-center transition-opacity ${
              tab === item.to ? "opacity-100" : "opacity-70"
            }`}
          >
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <Link
            to="/admin/all-posts"
            className={`flex-1 text-center ${
              tab === "/admin/all-posts" ? "opacity-100" : "opacity-70"
            }`}
          >
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/store/:storeId" element={<StoreProfilePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register-store" element={<RegisterStore />} />
        <Route path="/create-post" element={<CreatePost />} />
        <Route path="/edit-post/:id" element={<EditPost />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/all-posts" element={<AdminAllPost />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
