// client/src/App.tsx

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

function BottomNav() {
  const location = useLocation();
  const tab = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#fc7102] text-white z-20 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-2 text-xs font-medium">
        <Link
          to="/"
          className={`flex-1 text-center ${
            tab === "/" ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Heim
        </Link>

        <Link
          to="/search"
          className={`flex-1 text-center ${
            tab === "/search" ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Leita
        </Link>

        <Link
          to="/categories"
          className={`flex-1 text-center ${
            tab === "/categories" ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Flokkar
        </Link>

        <Link
          to="/profile"
          className={`flex-1 text-center ${
            tab === "/profile" ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Prófíll
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="min-h-screen pb-20 bg-background">
      <Routes>
        {/* Opin svæði */}
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/about" element={<About />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register-store" element={<RegisterStore />} />

        {/* Prófíll & tilboð (auth check gerum við inni á síðum) */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/create" element={<CreatePost />} />
        <Route path="/edit/:id" element={<EditPost />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
