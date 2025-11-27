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

import PrivateRoute from "./lib/PrivateRoute";

function BottomNav() {
  const location = useLocation();
  const tab = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#FF7300] text-white z-20 shadow-lg">
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
    <div className="min-h-screen pb-12 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Routes>
          {/* Opnar síður */}
          <Route path="/" element={<Home />} />
          <Route path="/leit" element={<SearchPage />} />
          <Route path="/flokkar" element={<CategoriesPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/post/:id" element={<PostDetail />} />

          {/* Auth síður – EKKI verndaðar */}
          <Route path="/login" element={<Login />} />
          <Route path="/register-store" element={<RegisterStore />} />

          {/* Verndaðar verslunarsíður */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-post"
            element={
              <PrivateRoute>
                <CreatePost />
              </PrivateRoute>
            }
          />
          <Route
            path="/edit-post/:id"
            element={
              <PrivateRoute>
                <EditPost />
              </PrivateRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <BottomNav />
    </div>
  );
}
