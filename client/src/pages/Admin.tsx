import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.isAdmin !== true)) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div>Hleð...</div>;
  }

  if (!user || user.isAdmin !== true) {
    return null;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin svæði</h1>
      <p>Þú ert admin.</p>
    </div>
  );
}
