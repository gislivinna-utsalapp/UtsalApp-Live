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
import StoreProfilePage from "./pages/StoreProfilePage"; // NÝTT: verslunarprófíll fyrir notendur

function BottomNav() {
  const location = useLocation();
  const tab = location.pathname;

  const { isAdmin } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#fc7102] text-white z-20 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3 text-sm font-bold uppercase">
        <Link
          to="/"
          className={`flex-1 text-center ${
            tab === "/" ? "opacity-100" : "opacity-80"
          }`}
        >
          HEIM
        </Link>

        <Link
          to="/search"
          className={`flex-1 text-center ${
            tab === "/search" ? "opacity-100" : "opacity-80"
          }`}
        >
          LEIT
        </Link>

        <Link
          to="/categories"
          className={`flex-1 text-center ${
            tab === "/categories" ? "opacity-100" : "opacity-80"
          }`}
        >
          FLOKKAR
        </Link>

        <Link
          to="/profile"
          className={`flex-1 text-center ${
            tab === "/profile" ? "opacity-100" : "opacity-80"
          }`}
        >
          PRÓFÍLL
        </Link>

        {isAdmin && (
          <Link
            to="/admin/all-posts"
            className={`flex-1 text-center ${
              tab === "/admin/all-posts" ? "opacity-100" : "opacity-80"
            }`}
          >
            ADMIN
          </Link>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="min-h-screen pb-24 bg-background">
      <Routes>
        {/* Opin svæði */}
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/about" element={<About />} />

        {/* PUBLIC store profile fyrir notendur */}
        <Route path="/store/:storeId" element={<StoreProfilePage />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register-store" element={<RegisterStore />} />

        {/* Prófíll & tilboð */}
        <Route path="/create" element={<CreatePost />} />
        <Route path="/edit/:id" element={<EditPost />} />

        <Route path="/create-post" element={<CreatePost />} />
        <Route path="/edit-post/:id" element={<EditPost />} />

        <Route path="/profile" element={<Profile />} />

        {/* Admin */}
        <Route path="/admin/all-posts" element={<AdminAllPost />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
