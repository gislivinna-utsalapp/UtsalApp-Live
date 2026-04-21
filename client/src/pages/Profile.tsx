// client/src/pages/Profile.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTimeRemaining } from "@/lib/utils";
import { MapPin, Phone, Globe } from "lucide-react";

/* ===================== TYPES ===================== */

type StoreInfo = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  plan?: string;
  planType?: string;
  trialEndsAt?: string | null;
  billingStatus?: string;
  billingActive?: boolean;
  createdAt?: string | null;
};

type BillingInfo = {
  plan: string | null;
  trialEndsAt: string | null;
  billingStatus: string;
  trialExpired: boolean;
  daysLeft: number | null;
  createdAt?: string | null;
};

type StorePost = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priceOriginal?: number;
  priceSale?: number;
  buyUrl?: string | null;
  images?: { url: string; alt?: string }[];
  viewCount?: number;
  endsAt?: string | null;
};

type PlanId = "basic" | "pro" | "premium";
type ProfileTab = "overview" | "appearance" | "offers" | "security" | "subscription";

/* ===================== CONSTS ===================== */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  description: string;
}[] = [
  {
    id: "basic",
    name: "Basic",
    price: "10.900 kr/viku",
    description: "Fyrir minni verslanir sem vilja byrja að prófa ÚtsalApp.",
  },
  {
    id: "pro",
    name: "Pro",
    price: "10.900 kr/viku",
    description: "Fyrir verslanir með reglulegar útsölur og meiri sýnileika.",
  },
  {
    id: "premium",
    name: "Premium",
    price: "20.900 kr/viku",
    description:
      "Fyrir stærri verslanir og keðjur sem vilja hámarksáhrif í ÚtsalApp.",
  },
];

/* ===================== HELPERS ===================== */

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("is-IS");
}

function getPostTimeRemainingLabel(endsAt?: string | null): string | null {
  if (!endsAt) return null;
  const remaining = getTimeRemaining(endsAt);
  if (typeof remaining === "string") return remaining;
  if (remaining && typeof remaining === "object" && "totalMs" in remaining) {
    const { days, hours, minutes, totalMs } = remaining as any;
    if (totalMs <= 0) return "Útsölunni er lokið";
    if (days > 1) return `${days} dagar eftir af tilboðinu`;
    if (days === 1) return "1 dagur eftir af tilboðinu";
    if (hours > 0) return "Endar innan 24 klst";
    if (minutes > 0) return "Endar fljótlega";
    return "Endar fljótlega";
  }
  return null;
}

function buildImageUrl(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  const u = rawUrl.trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;
  if (!API_BASE_URL) return u;
  const base = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${base}${path}`;
}

/* ===================== HELPERS ===================== */

function getTrialLabel(trialEndsAt?: string | null) {
  if (!trialEndsAt) return null;

  const now = new Date();
  const end = new Date(trialEndsAt);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Frí prufuvika er runnin út";

  if (diffDays === 1) {
    return `Frí prufuvika: 1 dagur eftir (til ${end.toLocaleDateString(
      "is-IS",
    )})`;
  }

  return `Frí prufuvika: ${diffDays} dagar eftir (til ${end.toLocaleDateString(
    "is-IS",
  )})`;
}

/* ===================== COMPONENT ===================== */

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { authUser, isStore, isAdmin, loading, logout } = useAuth();
  const store = authUser?.store;

  const [tab, setTab] = useState<ProfileTab>("overview");

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [planSuccessMsg, setPlanSuccessMsg] = useState<string | null>(null);
  const [planErrorMsg, setPlanErrorMsg] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<PlanId | null>(null);

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [extendingTrial, setExtendingTrial] = useState(false);
  const [extendSuccessMsg, setExtendSuccessMsg] = useState<string | null>(null);
  const [extendErrorMsg, setExtendErrorMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverPositionY, setCoverPositionY] = useState(50);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [posSaving, setPosSaving] = useState(false);
  const repoRef = useRef<{ startY: number; startPos: number } | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [appearanceLoaded, setAppearanceLoaded] = useState(false);

  const {
    data: storePosts = [],
    isLoading: loadingPosts,
    error: postsError,
  } = useQuery<StorePost[]>({
    queryKey: ["store-posts", store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      if (!store?.id) return [];
      return apiFetch<StorePost[]>(`/api/v1/stores/${store.id}/posts`);
    },
  });

  const safeStorePosts: StorePost[] = Array.isArray(storePosts)
    ? storePosts
    : [];

  /* ===== 🔧 FIX: KPI useMemo BEFORE EARLY RETURNS ===== */

  const kpi = useMemo(() => {
    const now = Date.now();

    const activeCount = safeStorePosts.filter((p) => {
      if (!p.endsAt) return true;
      const end = new Date(p.endsAt).getTime();
      return Number.isFinite(end) ? end > now : true;
    }).length;

    const views = safeStorePosts.reduce(
      (sum, p) => sum + (typeof p.viewCount === "number" ? p.viewCount : 0),
      0,
    );

    return {
      activeOffersCount: activeCount,
      totalViews: views,
    };
  }, [safeStorePosts]);

  const { activeOffersCount, totalViews } = kpi;

  /* ===================== BILLING EFFECT ===================== */

  useEffect(() => {
    if (!store?.id) return;
    let cancelled = false;

    async function loadBilling() {
      setBillingLoading(true);
      setBillingError(null);
      try {
        const data = await apiFetch<BillingInfo>("/api/v1/stores/me/billing");
        if (!cancelled) {
          setBilling(data);
          const backendPlan = (data.plan || "").toLowerCase();
          if (["basic", "pro", "premium"].includes(backendPlan)) {
            setSelectedPlan(backendPlan as PlanId);
          }
        }
      } catch {
        if (!cancelled) {
          setBillingError(
            "Tókst ekki að sækja stöðu áskriftar. Reyndu aftur síðar.",
          );
        }
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    }

    loadBilling();
    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  /* ===================== HERO LOAD (logo + cover on mount) ===================== */

  useEffect(() => {
    if (!store?.id) return;
    apiFetch<any>(`/api/v1/stores/${store.id}`)
      .then((data) => {
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.coverUrl) setCoverUrl(data.coverUrl);
        if (typeof data.coverPositionY === "number") setCoverPositionY(data.coverPositionY);
      })
      .catch(() => {});
  }, [store?.id]);

  /* ===================== APPEARANCE LOAD ===================== */

  useEffect(() => {
    if (tab !== "appearance" || appearanceLoaded || !store?.id) return;

    async function loadStoreDetail() {
      try {
        const data = await apiFetch<any>(`/api/v1/stores/${store!.id}`);
        setEditName(data.name || store!.name || "");
        setEditAddress(data.address || "");
        setEditPhone(data.phone || "");
        setEditWebsite(data.website || "");
        setLogoUrl(data.logoUrl || "");
        setCoverUrl(data.coverUrl || "");
        setAppearanceLoaded(true);
      } catch {
        setEditName(store!.name || "");
        setEditAddress((store as any)?.address || "");
        setEditPhone((store as any)?.phone || "");
        setEditWebsite((store as any)?.website || "");
        setAppearanceLoaded(true);
      }
    }
    loadStoreDetail();
  }, [tab, appearanceLoaded, store]);

  /* ===================== AUTH GATES ===================== */

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        <Card className="p-4">
          <p className="text-sm">Hleð innskráningarstöðu…</p>
        </Card>
      </div>
    );
  }

  if (!authUser || !isStore || !store) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        <Card className="p-4 space-y-3">
          <p className="text-sm">
            Þú þarft að vera innskráður sem verslun til að sjá prófíl.
          </p>
          <Button onClick={() => navigate("/login")}>Skrá inn</Button>
        </Card>
      </div>
    );
  }

  /* ===================== REST (UI) ===================== */
  /* ⬇️ HÉR FYLGIR ÓBREYTT UI KÓÐI ⬇️ */

  const trialActive =
    billing !== null && !billing.trialExpired && !!billing.trialEndsAt;

  const trialLabel =
    billing && billing.trialExpired
      ? "Frí prufuvika er runnin út"
      : billing && billing.trialEndsAt && !billing.trialExpired
        ? getTrialLabel(billing.trialEndsAt)
        : null;

  const activePlan: PlanId | null =
    billing &&
    typeof billing.plan === "string" &&
    ["basic", "pro", "premium"].includes(billing.plan.toLowerCase())
      ? (billing.plan.toLowerCase() as PlanId)
      : null;

  const displayPlan: PlanId | null = activePlan ?? selectedPlan ?? null;

  const billingLabel =
    billing?.billingStatus ||
    store?.billingStatus ||
    (store?.billingActive ? "active" : "trial");

  const mainButtonDisabled =
    !selectedPlan || billingLoading || !!activatingPlanId;

  const mainButtonLabel = !selectedPlan
    ? "Veldu áskriftarleið til að byrja fríviku"
    : trialActive
      ? "Uppfæra í þennan pakka"
      : "Virkja fríviku á þessum pakka";

  const canCreateOffers = billing
    ? !billing.trialExpired && !!billing.trialEndsAt
    : false;

  const createdAtLabel = formatDate(
    store?.createdAt ?? billing?.createdAt ?? null,
  );

  // --- ACTIVATE PLAN HANDLER (VERÐUR AÐ VERA HEILT FALL) ---
  const handleActivatePlan = async (overridePlan?: PlanId) => {
    if (!store?.id) return;
    const planToActivate = overridePlan ?? selectedPlan;
    if (!planToActivate) return;

    setPlanErrorMsg(null);
    setPlanSuccessMsg(null);
    setActivatingPlanId(planToActivate);

    try {
      await apiFetch<StoreInfo>("/api/v1/stores/activate-plan", {
        method: "POST",
        body: JSON.stringify({ plan: planToActivate }),
      });

      const updatedBilling = await apiFetch<BillingInfo>(
        "/api/v1/stores/me/billing",
      );
      setBilling(updatedBilling);

      const planName =
        PLANS.find((p) => p.id === selectedPlan)?.name || "pakkann";

      if (trialActive) {
        setPlanSuccessMsg(`Pakkinn þinn hefur verið uppfærður í ${planName}.`);
      } else {
        setPlanSuccessMsg(
          `Frívika þín hefur verið virkjuð í ${planName} pakka.`,
        );
      }
    } catch (err) {
      console.error("activate-plan error:", err);

      let msg =
        err instanceof Error
          ? err.message
          : "Tókst ekki að virkja eða uppfæra pakka. Reyndu aftur síðar.";

      const match = msg.match(/\{.*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.message) msg = parsed.message;
        } catch {
          // no-op
        }
      }

      setPlanErrorMsg(msg);
    } finally {
      setActivatingPlanId(null);
    }
  };

  // --- DELETE POST HANDLER (ÓBREYTT) ---
  async function handleDeletePost(post: StorePost) {
    if (!post.id) return;

    setDeleteError(null);

    const title = post.title || "tilboði";
    const confirmed = window.confirm(
      `Ertu viss um að þú viljir eyða tilboðinu „${title}“?`,
    );
    if (!confirmed) return;

    try {
      setDeletingPostId(post.id);
      await apiFetch<{ success: boolean }>(`/api/v1/posts/${post.id}`, {
        method: "DELETE",
      });

      await queryClient.invalidateQueries({
        queryKey: ["store-posts", store?.id],
      });
    } catch (err) {
      console.error("delete post error:", err);
      setDeleteError(
        "Tókst ekki að eyða tilboðinu. Reyndu aftur eða hafðu samband ef vandinn heldur áfram.",
      );
    } finally {
      setDeletingPostId(null);
    }
  }

  async function handleExtendTrial() {
    setExtendingTrial(true);
    setExtendSuccessMsg(null);
    setExtendErrorMsg(null);

    try {
      const data = await apiFetch<BillingInfo>("/api/v1/stores/me/extend-trial", {
        method: "POST",
      });
      setBilling(data);
      const days = data.daysLeft ?? 7;
      setExtendSuccessMsg(`Aðgangur framlengdur um 7 daga. ${days} dagar eftir.`);
    } catch (err) {
      console.error("extend-trial error:", err);
      let msg =
        err instanceof Error
          ? err.message
          : "Tókst ekki að framlengja aðgang. Reyndu aftur síðar.";
      const match = msg.match(/\{.*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.message) msg = parsed.message;
        } catch {
          // no-op
        }
      }
      setExtendErrorMsg(msg);
    } finally {
      setExtendingTrial(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword.trim()) {
      setPwError("Vantar núverandi lykilorð.");
      return;
    }
    if (newPassword.trim().length < 8) {
      setPwError("Nýtt lykilorð þarf að vera að minnsta kosti 8 stafir.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError("Staðfesting á nýju lykilorði passar ekki.");
      return;
    }
    if (currentPassword === newPassword) {
      setPwError("Nýtt lykilorð má ekki vera það sama og núverandi.");
      return;
    }

    setPwLoading(true);
    try {
      // ATH: Þessi route þarf að vera til í backend (ég get lagað hana þegar þú vilt)
      await apiFetch<{ success: boolean; message?: string }>(
        "/api/v1/stores/change-password",
        {
          method: "POST",
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );

      setPwSuccess("Lykilorð uppfært.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("change-password error:", err);
      let msg =
        err instanceof Error
          ? err.message
          : "Tókst ekki að breyta lykilorði. Reyndu aftur síðar.";

      const match = msg.match(/\{.*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.message) msg = parsed.message;
        } catch {
          // no-op
        }
      }

      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setInfoError(null);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const token =
        localStorage.getItem("utsalapp_token") ||
        localStorage.getItem("token") ||
        "";

      const res = await fetch(
        `${API_BASE_URL || ""}/api/v1/stores/me/logo`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Myndaupphleðsla mistókst");
      }

      const data = await res.json();
      setLogoUrl(data.logoUrl || "");
      setInfoMsg("Merki uppfært!");
    } catch (err) {
      console.error("logo upload error:", err);
      setInfoError(
        err instanceof Error ? err.message : "Myndaupphleðsla mistókst",
      );
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploading(true);

    try {
      const formData = new FormData();
      formData.append("cover", file);

      const token =
        localStorage.getItem("utsalapp_token") ||
        localStorage.getItem("token") ||
        "";

      const res = await fetch(
        `${API_BASE_URL || ""}/api/v1/stores/me/cover`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Myndaupphleðsla mistókst");
      }

      const data = await res.json();
      setCoverUrl(data.coverUrl || "");
      setIsRepositioning(true);
    } catch (err) {
      console.error("cover upload error:", err);
    } finally {
      setCoverUploading(false);
    }
  }

  function handleRepoPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isRepositioning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    repoRef.current = { startY: e.clientY, startPos: coverPositionY };
  }

  function handleRepoPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!repoRef.current) return;
    const deltaY = e.clientY - repoRef.current.startY;
    const newPos = Math.min(100, Math.max(0, repoRef.current.startPos - deltaY * 0.5));
    setCoverPositionY(newPos);
  }

  function handleRepoPointerUp() {
    repoRef.current = null;
  }

  async function handleSaveCoverPosition() {
    setPosSaving(true);
    try {
      const token = localStorage.getItem("utsalapp_token") || localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE_URL || ""}/api/v1/stores/me/cover-position`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ positionY: Math.round(coverPositionY) }),
      });
      if (res.ok) setIsRepositioning(false);
    } catch (err) {
      console.error("save cover position error:", err);
    } finally {
      setPosSaving(false);
    }
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoMsg(null);
    setInfoError(null);
    setInfoSaving(true);

    try {
      const data = await apiFetch<any>("/api/v1/stores/me/update-info", {
        method: "POST",
        body: JSON.stringify({
          name: editName,
          address: editAddress,
          phone: editPhone,
          website: editWebsite,
        }),
      });

      setEditName(data.name || editName);
      setEditAddress(data.address || "");
      setEditPhone(data.phone || "");
      setEditWebsite(data.website || "");
      setLogoUrl(data.logoUrl || logoUrl);
      setInfoMsg("Upplýsingar vistaðar!");
    } catch (err) {
      console.error("save info error:", err);
      let msg =
        err instanceof Error
          ? err.message
          : "Villa kom upp við vistun.";
      const match = msg.match(/\{.*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.message) msg = parsed.message;
        } catch {}
      }
      setInfoError(msg);
    } finally {
      setInfoSaving(false);
    }
  }

  function handleLogout() {
    logout();
    window.location.hash = "#/login";
  }

  const tabButtonClass = (isActive: boolean) =>
    `text-xs px-3 py-2 rounded-md border transition-colors ${
      isActive
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background hover:bg-muted border-border"
    }`;

  return (
    <div className="bg-white min-h-screen pb-24">

      {/* ── Hero (cover image) ────────────────────────────────── */}
      <div
        className={`relative h-36 overflow-hidden ${isRepositioning ? "cursor-grab active:cursor-grabbing select-none" : ""}`}
        style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1f1209 100%)" }}
        onPointerDown={handleRepoPointerDown}
        onPointerMove={handleRepoPointerMove}
        onPointerUp={handleRepoPointerUp}
        onPointerCancel={handleRepoPointerUp}
        data-testid="div-hero-cover"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt="Forsíðumynd"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `50% ${coverPositionY}%` }}
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(255,77,0,0.18) 0%, transparent 65%)" }} />
        )}
        {/* Dark wash */}
        <div className="absolute inset-0 bg-black/20" />

        {isRepositioning ? (
          /* ── Reposition mode UI ── */
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs bg-black/50 px-3 py-1.5 rounded-md flex items-center gap-1.5 pointer-events-none">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
                Dragðu mynd upp/niður
              </span>
            </div>
            <div className="absolute bottom-2 right-3 flex gap-2">
              <button
                onClick={() => setIsRepositioning(false)}
                className="text-[11px] bg-white/20 text-white px-2.5 py-1.5 rounded-md"
              >
                Hætta við
              </button>
              <button
                onClick={handleSaveCoverPosition}
                disabled={posSaving}
                className="text-[11px] bg-[#ff4d00] text-white px-2.5 py-1.5 rounded-md font-medium disabled:opacity-60"
              >
                {posSaving ? "Vista..." : "Vista stöðu"}
              </button>
            </div>
          </>
        ) : (
          /* ── Normal mode: upload button ── */
          <>
            <label className="absolute bottom-2 left-3 cursor-pointer" data-testid="label-upload-cover">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
                disabled={coverUploading}
                data-testid="input-upload-cover"
              />
              {coverUploading ? (
                <span className="text-white text-[11px] font-medium bg-black/60 px-2.5 py-1 rounded-md">Hleð upp...</span>
              ) : (
                <span className="text-white text-[11px] font-medium bg-black/60 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Breyta forsíðumynd
                </span>
              )}
            </label>
            {coverUrl && (
              <button
                onClick={() => setIsRepositioning(true)}
                className="absolute bottom-2 right-3 text-[11px] bg-black/60 text-white px-2.5 py-1 rounded-md flex items-center gap-1"
                data-testid="button-reposition-cover"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
                Stilla staðsetningu
              </button>
            )}
            {/* Top-right buttons */}
            <div className="absolute top-3 right-3 flex gap-2">
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="text-[11px] bg-white/20 text-white px-2.5 py-1 rounded-sm"
                >
                  Admin
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-[11px] bg-white/20 text-white px-2.5 py-1 rounded-sm"
              >
                Útskrá
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Logo + name ───────────────────────────────────────── */}
      <div className="px-4 -mt-10 mb-4">
        <label className="block cursor-pointer group w-20" data-testid="label-upload-logo-hero">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
            disabled={logoUploading}
            data-testid="input-upload-logo-hero"
          />
          <div className="w-20 h-20 rounded-full border-4 border-white bg-neutral-100 overflow-hidden shadow-sm relative">
            {logoUrl ? (
              <img src={logoUrl} alt="Merki" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                <span className="text-white text-xl font-bold">
                  {(editName || store.name || "?").split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            {/* Upload overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {logoUploading
                ? <span className="text-white text-[9px] font-medium">Hleð...</span>
                : <span className="text-white text-[9px] font-medium text-center leading-tight px-1">Breyta<br/>mynd</span>
              }
            </div>
          </div>
        </label>
        <div className="mt-2">
          <h1 className="text-base font-bold text-neutral-900">{editName || store.name}</h1>
          <p className="text-xs text-neutral-400">{authUser.user.email}</p>
        </div>
      </div>

      <div className="px-4 space-y-4">

      {/* Tabs */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tabButtonClass(tab === "overview")}
            onClick={() => setTab("overview")}
          >
            Yfirlit
          </button>
          <button
            type="button"
            className={tabButtonClass(tab === "appearance")}
            onClick={() => setTab("appearance")}
            data-testid="tab-appearance"
          >
            Útlit
          </button>
          <button
            type="button"
            className={tabButtonClass(tab === "offers")}
            onClick={() => setTab("offers")}
          >
            Mín tilboð
          </button>
          <button
            type="button"
            className={tabButtonClass(tab === "security")}
            onClick={() => setTab("security")}
          >
            Öryggi
          </button>
          <button
            type="button"
            className={tabButtonClass(tab === "subscription")}
            onClick={() => setTab("subscription")}
          >
            Áskrift
          </button>
        </div>
      </Card>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <>
          <Card className="p-4 space-y-2">
            <h2 className="text-sm font-semibold mb-1">Verslun</h2>
            <p className="text-sm">
              <span className="font-medium">Nafn:</span> {store.name}
            </p>

            {store.address && (
              <p className="text-sm">
                <span className="font-medium">Heimilisfang:</span>{" "}
                {store.address}
              </p>
            )}

            {store.phone && (
              <p className="text-sm">
                <span className="font-medium">Sími:</span> {store.phone}
              </p>
            )}

            {store.website && (
              <p className="text-sm">
                <span className="font-medium">Vefsíða:</span>{" "}
                <a
                  href={store.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  {store.website}
                </a>
              </p>
            )}

            {createdAtLabel && (
              <p className="text-sm">
                <span className="font-medium">Stofnað í ÚtsalApp:</span>{" "}
                {createdAtLabel}
              </p>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Yfirlit</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">Virk tilboð</p>
                <p className="text-lg font-semibold">{activeOffersCount}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">
                  Heildarskoðanir
                </p>
                <p className="text-lg font-semibold">{totalViews}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">
                  Valinn pakki
                </p>
                <p className="text-lg font-semibold">
                  {displayPlan === "unlimited"
                    ? "Ótakmarkaðar auglýsingar"
                    : displayPlan === "basic"
                      ? "Basic"
                      : displayPlan === "pro"
                        ? "Pro"
                        : displayPlan === "premium"
                          ? "Premium"
                          : "Enginn"}
                </p>
              </div>
            </div>

            <div className="pt-1 space-y-1 text-sm">
              {trialLabel ? (
                <p>
                  <span className="font-medium">Prufutímabil:</span>{" "}
                  {trialLabel}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Engin frívika virk. Veldu áskriftarleið í “Áskrift” tab til að
                  byrja.
                </p>
              )}

              <p>
                <span className="font-medium">Greiðslustaða:</span>{" "}
                {billingLabel}
              </p>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Helstu aðgerðir</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="secondary"
                className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => navigate("/create-post")}
                disabled={!canCreateOffers}
              >
                Búa til nýtt tilboð
              </Button>

              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setTab("offers")}
              >
                Skoða mín tilboð
              </Button>

              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setTab("security")}
              >
                Breyta lykilorði
              </Button>

              {!canCreateOffers && (
                <p className="text-[11px] text-muted-foreground">
                  Virkjaðu fríviku til að byrja að setja inn tilboð.
                </p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* APPEARANCE */}
      {tab === "appearance" && (
        <>
          <Card className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Merki verslunar</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Mynd sem birtist á opinberu verslunar­síðunni þinni.
              </p>
            </div>

            {/* Logo upload — centered clickable avatar */}
            <label className="flex flex-col items-center gap-3 cursor-pointer group" data-testid="label-upload-logo">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={logoUploading}
                data-testid="input-upload-logo"
              />
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-neutral-100 overflow-hidden relative border-2 border-neutral-200 group-hover:border-neutral-400 transition-colors">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Merki"
                    className="w-full h-full object-cover"
                    data-testid="img-store-logo"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                    <span className="text-white text-2xl font-bold">
                      {(editName || store.name || "?")
                        .split(" ")
                        .filter(Boolean)
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <span className="text-white text-[10px] font-medium">
                    {logoUploading ? "Hleð..." : "Breyta"}
                  </span>
                </div>
              </div>
              {/* Upload button */}
              <span className="text-xs px-4 py-2 rounded-sm bg-neutral-900 text-white font-medium">
                {logoUploading ? "Hleð upp..." : "Hlaða upp mynd"}
              </span>
              <p className="text-[10px] text-neutral-400">
                JPG, PNG eða WebP · Mælt með 200×200px eða stærra
              </p>
            </label>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="text-sm font-semibold">Upplýsingar verslunar</h2>
            <p className="text-xs text-muted-foreground">
              Þetta eru upplýsingarnar sem notendur sjá þegar þeir skoða verslunina þína.
            </p>

            <form onSubmit={handleSaveInfo} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Nafn verslunar</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  data-testid="input-store-name"
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Heimilisfang</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="t.d. Laugavegur 22, 101 Reykjavík"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  data-testid="input-store-address"
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Sími</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="t.d. 555-1234"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  data-testid="input-store-phone"
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Vefsíða</label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="t.d. https://minverslun.is"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  data-testid="input-store-website"
                />
              </div>

              {infoMsg && <p className="text-xs text-green-600">{infoMsg}</p>}
              {infoError && <p className="text-xs text-red-600">{infoError}</p>}

              <Button
                type="submit"
                variant="default"
                size="sm"
                className="w-full text-xs"
                disabled={infoSaving}
                data-testid="button-save-info"
              >
                {infoSaving ? "Vista..." : "Vista breytingar"}
              </Button>
            </form>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="text-sm font-semibold">Forskoðun — svona lítur síðan þín út</h2>
            <p className="text-xs text-muted-foreground">
              Þetta er það sem notendur sjá þegar þeir smella á nafn verslunarinnar.
            </p>

            <div className="border border-border rounded-lg overflow-hidden bg-background">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={editName || store.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary text-base font-bold">
                        {(editName || store.name || "?")
                          .split(" ")
                          .filter(Boolean)
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold leading-tight truncate">
                      {editName || store.name || "Nafn verslunar"}
                    </h3>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
                  {editAddress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                      <span>{editAddress}</span>
                    </div>
                  )}
                  {editPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                      <span>{editPhone}</span>
                    </div>
                  )}
                  {editWebsite && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                      <span className="truncate">{editWebsite.replace(/^https?:\/\//, "")}</span>
                    </div>
                  )}
                  {!editAddress && !editPhone && !editWebsite && (
                    <p className="text-xs text-muted-foreground italic">
                      Fylltu út upplýsingarnar hér að ofan til að sjá forskoðun.
                    </p>
                  )}
                </div>
              </div>

              {safeStorePosts.length > 0 ? (
                <div className="border-t border-border p-3">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">
                    Útsölur og tilboð ({safeStorePosts.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {safeStorePosts.slice(0, 3).map((p) => {
                      const img = Array.isArray(p.images) && p.images[0];
                      const url = img
                        ? buildImageUrl(typeof img === "string" ? img : img.url)
                        : "";
                      return (
                        <div
                          key={p.id}
                          className="aspect-square rounded-md bg-muted overflow-hidden"
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={p.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                              {p.title}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="border-t border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Engin virk tilboð enn
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* OFFERS */}
      {tab === "offers" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tilboð verslunar</h2>
            <p className="text-[11px] text-muted-foreground">
              {safeStorePosts.length} tilboð
            </p>
          </div>

          {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}

          {loadingPosts && (
            <p className="text-xs text-muted-foreground">
              Sæki tilboð verslunar…
            </p>
          )}

          {postsError && !loadingPosts && (
            <p className="text-xs text-red-600">
              Tókst ekki að sækja tilboð verslunar.
            </p>
          )}

          {!loadingPosts && !postsError && safeStorePosts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Þú ert ekki enn búinn að skrá nein tilboð. Þegar frívikan er virk,
              getur þú smellt á „Búa til nýtt tilboð“ til að byrja.
            </p>
          )}

          {!loadingPosts && !postsError && safeStorePosts.length > 0 && (
            <div className="space-y-3">
              {safeStorePosts.map((post) => {
                const firstImageUrl = buildImageUrl(
                  post.images?.[0]?.url ?? "",
                );
                const isDeleting = deletingPostId === post.id;
                const timeRemainingLabel = getPostTimeRemainingLabel(
                  post.endsAt,
                );

                return (
                  <div
                    key={post.id}
                    className="border border-gray-200 rounded-md p-3 text-sm flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    {firstImageUrl && (
                      <div className="relative w-20 aspect-square overflow-hidden rounded-md flex-shrink-0 bg-muted">
                        <img
                          src={firstImageUrl}
                          alt={post.images?.[0]?.alt || post.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{post.title}</p>
                          {post.category && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              Flokkur: {post.category}
                            </p>
                          )}
                          {post.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {post.description}
                            </p>
                          )}
                        </div>

                        {typeof post.viewCount === "number" && (
                          <p className="text-[11px] text-muted-foreground whitespace-nowrap text-right">
                            {post.viewCount} skoðanir
                            {timeRemainingLabel && (
                              <>
                                <br />
                                <span className="text-[10px] text-neutral-500">
                                  {timeRemainingLabel}
                                </span>
                              </>
                            )}
                          </p>
                        )}
                      </div>

                      {typeof post.viewCount !== "number" &&
                        timeRemainingLabel && (
                          <p className="text-[11px] text-neutral-500">
                            {timeRemainingLabel}
                          </p>
                        )}

                      <div className="flex items-center gap-2 text-[11px] pt-1">
                        {typeof post.priceOriginal === "number" && (
                          <span className="line-through text-muted-foreground">
                            {post.priceOriginal.toLocaleString("is-IS")} kr.
                          </span>
                        )}
                        {typeof post.priceSale === "number" && (
                          <span className="font-semibold">
                            {post.priceSale.toLocaleString("is-IS")} kr.
                          </span>
                        )}
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs w-full sm:w-auto"
                          disabled={isDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit-post/${post.id}`);
                          }}
                        >
                          Breyta tilboði
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-red-500 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                          disabled={isDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post);
                          }}
                        >
                          {isDeleting ? "Eyði…" : "Eyða tilboði"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* SECURITY */}
      {tab === "security" && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Öryggi</h2>
          <p className="text-xs text-muted-foreground">
            Hér getur þú breytt lykilorði. Við mælum með að nota sterkt lykilorð
            (a.m.k. 8 stafi).
          </p>

          {pwError && <p className="text-xs text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-xs text-green-600">{pwSuccess}</p>}

          <form className="space-y-2" onSubmit={handleChangePassword}>
            <div className="space-y-1">
              <label className="text-xs font-medium">Núverandi lykilorð</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Nýtt lykilorð</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">
                Staðfesta nýtt lykilorð
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
                autoComplete="new-password"
              />
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="default"
                className="w-full text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={pwLoading}
              >
                {pwLoading ? "Uppfæri…" : "Breyta lykilorði"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* SUBSCRIPTION */}
      {tab === "subscription" && (
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold">Áskrift</h2>

          {billingLoading && (
            <p className="text-xs text-muted-foreground">Sæki stöðu áskriftar…</p>
          )}
          {billingError && (
            <p className="text-xs text-red-600">{billingError}</p>
          )}

          {!billingLoading && !billingError && (
            <>
              {trialActive && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-xs text-green-700 font-medium">
                    Frí prufuvika er virk
                  </p>
                  {trialLabel && (
                    <p className="text-xs text-green-600 mt-0.5">{trialLabel}</p>
                  )}
                </div>
              )}

              <div className="border-2 border-primary rounded-lg p-4 space-y-3">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-semibold">Ótakmarkaðar auglýsingar</h3>
                  <div className="text-right">
                    <span className="text-base font-bold">59.900 kr</span>
                    <span className="text-xs text-muted-foreground ml-1">+ VSK / mán</span>
                  </div>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>· Ótakmarkaður fjöldi auglýsinga</li>
                  <li>· Fullt aðgengi að öllum eiginleikum</li>
                  <li>· Hægt að hætta hvenær sem er</li>
                </ul>
                {(activePlan === "unlimited" || trialActive) && (
                  <p className="text-xs text-primary font-medium">
                    {trialActive ? "Frívika virk á þessum pakka" : "Virk áskrift"}
                  </p>
                )}
              </div>

              {planErrorMsg && (
                <p className="text-xs text-red-600">{planErrorMsg}</p>
              )}
              {planSuccessMsg && (
                <p className="text-xs text-green-600">{planSuccessMsg}</p>
              )}

              {!trialActive && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full text-xs"
                  disabled={billingLoading || !!activatingPlanId}
                  onClick={() => handleActivatePlan("unlimited" as PlanId)}
                >
                  {activatingPlanId ? "Virkja…" : "Virkja 7 daga fríviku"}
                </Button>
              )}

              <div className="border-t border-border pt-3 space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Framlengja aðgang
                </h3>
                <p className="text-xs text-muted-foreground">
                  Framlengja aðgang um 7 daga til viðbótar við núverandi lok prufutímabils.
                </p>
                {extendSuccessMsg && (
                  <p className="text-xs text-green-600">{extendSuccessMsg}</p>
                )}
                {extendErrorMsg && (
                  <p className="text-xs text-red-600">{extendErrorMsg}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={extendingTrial}
                  onClick={handleExtendTrial}
                  data-testid="button-extend-trial"
                >
                  {extendingTrial ? "Framlengi aðgang…" : "Framlengja um 7 daga"}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
      </div>{/* /px-4 space-y-4 */}
    </div>
  );
}
