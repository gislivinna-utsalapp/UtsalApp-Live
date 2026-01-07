// client/src/App.tsx
import AdminPage from "@/pages/Admin";
import { Routes, Route, Link, useLocation } from "react-router-dom";

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

// ❌ Enginn HashRouter hér
// ❌ Enginn PrivateRoute í debug-mode

function BottomNav() {
  const location = useLocation();
  const tab = location.pathname;

  return (
    <nav className="fixed inset-x-0 bottom-0 bg-primary text-primary-foreground z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-2 text-xs font-medium">
        <Link
          to="/"
          className={`flex-1 text-center ${
            tab === "/" ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Forsíða
        </Link>
        <Link
          to="/leit"
          className={`flex-1 text-center ${
            tab.startsWith("/leit") ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Leit
        </Link>
        <Link
          to="/flokkar"
          className={`flex-1 text-center ${
            tab.startsWith("/flokkar")
              ? "opacity-100 font-semibold"
              : "opacity-80"
          }`}
        >
          Flokkar
        </Link>
        <Link
          to="/profile"
          className={`flex-1 text-center ${
            tab.startsWith("/profile")
              ? "opacity-100 font-semibold"
              : "opacity-80"
          }`}
        >
          Verslun
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-24 text-foreground [&_*]:text-foreground">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leit" element={<SearchPage />} />
          <Route path="/flokkar" element={<CategoriesPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/post/:id" element={<PostDetail />} />

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
