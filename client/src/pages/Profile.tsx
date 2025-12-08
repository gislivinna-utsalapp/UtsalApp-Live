import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTimeRemaining } from "@/lib/utils";

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
  createdAt?: string | null; // BÆTT VIÐ
  categories?: string[]; // flokkar verslunar
  subcategories?: string[]; // BÆTT VIÐ – undirflokkar verslunar
};

type BillingInfo = {
  plan: string | null;
  trialEndsAt: string | null;
  billingStatus: string;
  trialExpired: boolean;
  daysLeft: number | null;
  createdAt?: string | null; // BÆTT VIÐ – kemur frá /stores/me/billing
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
  endsAt?: string | null; // BÆTT VIÐ – lokadagsetning tilboðs
};

// --- NÝTT: skilgreinum mega-flokka og undirflokka fyrir snyrtilegt "Flokkur" label ---

type Subcategory = {
  value: string;
  label: string;
};

type MegaCategory = {
  id: string;
  name: string;
  description?: string;
  subcategories: Subcategory[];
};

const MEGA_CATEGORIES: MegaCategory[] = [
  {
    id: "food",
    name: "Veitingar & Matur",
    description: "Tilboð á mat, drykkjum og happy hour.",
    subcategories: [
      { value: "Matur & veitingar", label: "Matur & veitingar" },
      { value: "Happy Hour", label: "Happy Hour" },
    ],
  },
  {
    id: "fashion",
    name: "Fatnaður & Lífstíll",
    description: "Fatnaður, skór og íþróttatíska.",
    subcategories: [
      { value: "Fatnaður - Konur", label: "Fatnaður - Konur" },
      { value: "Fatnaður - Karlar", label: "Fatnaður - Karlar" },
      { value: "Fatnaður - Börn", label: "Fatnaður - Börn" },
      { value: "Skór", label: "Skór" },
      { value: "Íþróttavörur", label: "Íþróttavörur" },
      { value: "Leikföng & börn", label: "Leikföng & börn" },
    ],
  },
  {
    id: "home",
    name: "Heimili & Húsgögn",
    description: "Húsgögn, innréttingar og heimilislíf.",
    subcategories: [{ value: "Heimili & húsgögn", label: "Heimili & húsgögn" }],
  },
  {
    id: "tech",
    name: "Tækni & Rafmagn",
    description: "Raftæki, græjur og snjallheimili.",
    subcategories: [{ value: "Raftæki", label: "Raftæki" }],
  },
  {
    id: "beauty-other",
    name: "Beauty, Heilsu & Annað",
    description: "Snyrting, heilsuvörur og annað.",
    subcategories: [
      { value: "Snyrtivörur", label: "Snyrtivörur" },
      { value: "Annað", label: "Annað" },
    ],
  },
];

function normalizeCategory(value?: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase();
}

function getCategoryDisplayLabel(category?: string | null): string {
  if (!category) return "Óflokkað";
  const normalized = normalizeCategory(category);

  for (const mega of MEGA_CATEGORIES) {
    for (const sub of mega.subcategories) {
      const subNorm = normalizeCategory(sub.value);
      if (subNorm && subNorm === normalized) {
        // Dæmi: "Veitingar & Matur · Happy Hour"
        return `${mega.name} · ${sub.label}`;
      }
    }
  }

  // Ef við finnum hann ekki í skilgreiningunum, sýnum bara upprunalegt gildi
  return category;
}

// --- END NÝTT ---

// NÝTT: valkostir fyrir flokka verslunar (top-level) – allt að 3 má haka við
const STORE_CATEGORY_OPTIONS: string[] = [
  "Viðburðir (t.d. Happy Hour)", // NÝR MEGA-FLOKKUR
  "Veitingar & Matur",
  "Fatnaður & Lífstíll",
  "Heimili & Húsgögn",
  "Tækni & Rafmagn",
  "Beauty, Heilsu & Þjónusta",
];

// NÝTT: undirflokkar fyrir hvern megaflokk verslunar
const STORE_SUBCATEGORY_OPTIONS: Record<string, Subcategory[]> = {
  "Viðburðir (t.d. Happy Hour)": [
    { value: "Happy Hour", label: "Happy Hour" },
    { value: "Viðburðir", label: "Viðburðir" },
  ],
  "Veitingar & Matur": [
    { value: "Matur & veitingar", label: "Matur & veitingar" },
    { value: "Happy Hour", label: "Happy Hour" },
  ],
  "Fatnaður & Lífstíll": [
    { value: "Fatnaður - Konur", label: "Fatnaður - Konur" },
    { value: "Fatnaður - Karlar", label: "Fatnaður - Karlar" },
    { value: "Fatnaður - Börn", label: "Fatnaður - Börn" },
    { value: "Skór", label: "Skór" },
    { value: "Íþróttavörur", label: "Íþróttavörur" },
    { value: "Leikföng & börn", label: "Leikföng & börn" },
  ],
  "Heimili & Húsgögn": [
    { value: "Heimili & húsgögn", label: "Heimili & húsgögn" },
  ],
  "Tækni & Rafmagn": [{ value: "Raftæki", label: "Raftæki" }],
  "Beauty, Heilsu & Þjónusta": [
    { value: "Snyrtivörur", label: "Snyrtivörur" },
    { value: "Heilsuþjónusta", label: "Heilsuþjónusta" },
    { value: "Annað", label: "Annað" },
  ],
};

type PlanId = "basic" | "pro" | "premium";

// Notum sama base URL og annars staðar í appinu
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Reiknum texta fyrir prufuviku út frá trialEndsAt
function getTrialLabel(trialEndsAt?: string | null) {
  if (!trialEndsAt) return null;

  const now = new Date();
  const end = new Date(trialEndsAt);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Frí prufuvika er runnin út";
  }

  if (diffDays === 1) {
    return `Frí prufuvika: 1 dagur eftir (til ${end.toLocaleDateString(
      "is-IS",
    )})`;
  }

  return `Frí prufuvika: ${diffDays} dagar eftir (til ${end.toLocaleDateString(
    "is-IS",
  )})`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("is-IS");
}

// Nýr helper fyrir "X dagar eftir af tilboðinu"
function getPostTimeRemainingLabel(endsAt?: string | null): string | null {
  if (!endsAt) return null;

  const remaining = getTimeRemaining(endsAt);

  if (typeof remaining === "string") {
    // ef util skilar streng, notum hann beint (t.d. "Útsölunni er lokið")
    return remaining;
  }

  if (remaining && typeof remaining === "object" && "totalMs" in remaining) {
    const { days, hours, minutes, totalMs } = remaining as {
      days: number;
      hours: number;
      minutes: number;
      totalMs: number;
    };

    if (totalMs <= 0) {
      return "Útsölunni er lokið";
    }

    if (days > 1) {
      return `${days} dagar eftir af tilboðinu`;
    }

    if (days === 1) {
      return "1 dagur eftir af tilboðinu";
    }

    // Engir heilir dagar eftir en samt í gangi
    if (hours > 0) {
      return "Endar innan 24 klst";
    }

    if (minutes > 0) {
      return "Endar fljótlega";
    }

    return "Endar fljótlega";
  }

  return null;
}

const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  description: string;
}[] = [
  {
    id: "basic",
    name: "Basic",
    price: "12.000 kr/mán",
    description: "Fyrir minni verslanir sem vilja byrja að prófa ÚtsalApp.",
  },
  {
    id: "pro",
    name: "Pro",
    price: "22.000 kr/mán",
    description: "Fyrir verslanir með reglulegar útsölur og meiri sýnileika.",
  },
  {
    id: "premium",
    name: "Premium",
    price: "32.000 kr/mán",
    description:
      "Fyrir stærri verslanir og keðjur sem vilja hámarksáhrif í ÚtsalApp.",
  },
];

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser, isStore, logout } = useAuth();

  const store: StoreInfo | null = authUser?.store ?? null;

  // NÝTT: er notandinn admin út frá role?
  const isAdmin = authUser?.user?.role === "admin";

  // Billing + pakki koma frá backend í stað localStorage
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Valinn pakki í UI (það sem user smellir á)
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  // Staðbundin skilaboð fyrir notanda
  const [planSuccessMsg, setPlanSuccessMsg] = useState<string | null>(null);
  const [planErrorMsg, setPlanErrorMsg] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<PlanId | null>(null);

  // Eyðing tilboða
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // NÝTT: valdir flokkar verslunar (allt að 3)
  const [selectedStoreCategories, setSelectedStoreCategories] = useState<
    string[]
  >(store?.categories ?? []);

  // NÝTT: valdir undirflokkar verslunar
  const [selectedStoreSubcategories, setSelectedStoreSubcategories] = useState<
    string[]
  >(store?.subcategories ?? []);

  const [savingCategories, setSavingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesSuccess, setCategoriesSuccess] = useState<string | null>(
    null,
  );

  // NÝTT: editable verslunarupplýsingar (form)
  const [editName, setEditName] = useState<string>(store?.name ?? "");
  const [editAddress, setEditAddress] = useState<string>(store?.address ?? "");
  const [editPhone, setEditPhone] = useState<string>(store?.phone ?? "");
  const [editWebsite, setEditWebsite] = useState<string>(store?.website ?? "");
  const [storeSaveLoading, setStoreSaveLoading] = useState(false);
  const [storeSaveError, setStoreSaveError] = useState<string | null>(null);
  const [storeSaveSuccess, setStoreSaveSuccess] = useState<string | null>(null);

  // NÝTT: lykilorð
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Synca local state þegar store.categories / subcategories uppfærast frá backend
  useEffect(() => {
    setSelectedStoreCategories(store?.categories ?? []);
    setSelectedStoreSubcategories(store?.subcategories ?? []);
  }, [store?.categories, store?.subcategories]);

  // Synca editable verslunarupplýsingar þegar store uppfærist úr auth
  useEffect(() => {
    setEditName(store?.name ?? "");
    setEditAddress(store?.address ?? "");
    setEditPhone(store?.phone ?? "");
    setEditWebsite(store?.website ?? "");
  }, [store?.id, store?.name, store?.address, store?.phone, store?.website]);

  // Tilboð verslunar
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

  // Sækjum billing info úr backend þegar verslun er til
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

          // Stillum valinn pakka út frá backend plan
          const backendPlan = (data.plan || "").toLowerCase();
          if (
            backendPlan === "basic" ||
            backendPlan === "pro" ||
            backendPlan === "premium"
          ) {
            setSelectedPlan(backendPlan as PlanId);
          } else {
            setSelectedPlan(null);
          }
        }
      } catch (err) {
        console.error("stores/me/billing error:", err);
        if (!cancelled) {
          setBillingError(
            "Tókst ekki að sækja stöðu áskriftar. Reyndu aftur síðar.",
          );
        }
      } finally {
        if (!cancelled) {
          setBillingLoading(false);
        }
      }
    }

    loadBilling();
    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  // NÝTT: skýrt aðgreint trial vs virk áskrift
  const isBillingActive = billing?.billingStatus === "active";

  const trialActive =
    billing !== null &&
    billing.billingStatus === "trial" &&
    !billing.trialExpired &&
    !!billing.trialEndsAt;

  const trialLabel =
    billing && billing.billingStatus === "trial"
      ? billing.trialExpired
        ? "Frí prufuvika er runnin út"
        : billing.trialEndsAt
          ? getTrialLabel(billing.trialEndsAt)
          : null
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

  const hasUsedTrial =
    !!billing?.trialEndsAt && billing.billingStatus !== "trial";

  let mainButtonLabel: string;
  if (!selectedPlan) {
    mainButtonLabel = "Veldu áskriftarleið";
  } else if (isBillingActive) {
    mainButtonLabel = "Uppfæra í þennan pakka";
  } else if (trialActive) {
    mainButtonLabel = "Uppfæra í þennan pakka";
  } else if (billing?.trialEndsAt && billing.trialExpired) {
    mainButtonLabel = "Virkja áskrift á þessum pakka";
  } else {
    mainButtonLabel = "Virkja fríviku á þessum pakka";
  }

  function toggleStoreCategory(cat: string) {
    if (selectedStoreCategories.includes(cat)) {
      // taka út megaflokk og alla undirflokka hans
      setSelectedStoreCategories(
        selectedStoreCategories.filter((c) => c !== cat),
      );
      const subs = STORE_SUBCATEGORY_OPTIONS[cat] ?? [];
      if (subs.length) {
        const subValues = subs.map((s) => s.value);
        setSelectedStoreSubcategories((prev) =>
          prev.filter((v) => !subValues.includes(v)),
        );
      }
    } else {
      if (selectedStoreCategories.length >= 3) return;
      setSelectedStoreCategories([...selectedStoreCategories, cat]);
    }
  }

  function toggleStoreSubcategory(parentCategory: string, subValue: string) {
    // tryggjum að parent sé valinn (ef pláss)
    if (!selectedStoreCategories.includes(parentCategory)) {
      if (selectedStoreCategories.length >= 3) {
        return;
      }
      setSelectedStoreCategories([...selectedStoreCategories, parentCategory]);
    }

    setSelectedStoreSubcategories((prev) =>
      prev.includes(subValue)
        ? prev.filter((v) => v !== subValue)
        : [...prev, subValue],
    );
  }

  async function handleSaveCategories() {
    if (!store?.id) return;

    setSavingCategories(true);
    setCategoriesError(null);
    setCategoriesSuccess(null);

    try {
      const body = {
        categories: selectedStoreCategories,
        subcategories: selectedStoreSubcategories,
      };

      const updated = await apiFetch<StoreInfo>("/api/v1/stores/me", {
        method: "PUT",
        body: JSON.stringify(body),
      });

      setSelectedStoreCategories(updated.categories ?? []);
      setSelectedStoreSubcategories(updated.subcategories ?? []);
      setCategoriesSuccess("Flokkar verslunar hafa verið vistaðir.");
    } catch (err) {
      console.error("save categories error:", err);
      setCategoriesError(
        "Tókst ekki að vista flokka. Reyndu aftur eða hafðu samband ef vandinn heldur áfram.",
      );
    } finally {
      setSavingCategories(false);
    }
  }

  // NÝTT: vista grunnupplýsingar verslunar
  async function handleSaveStoreInfo() {
    if (!store?.id) return;

    setStoreSaveLoading(true);
    setStoreSaveError(null);
    setStoreSaveSuccess(null);

    try {
      const body = {
        name: editName,
        address: editAddress,
        phone: editPhone,
        website: editWebsite,
      };

      const updated = await apiFetch<StoreInfo>("/api/v1/stores/me", {
        method: "PUT",
        body: JSON.stringify(body),
      });

      // Uppfæra local form með því sem server skilar (just in case)
      setEditName(updated.name ?? "");
      setEditAddress(updated.address ?? "");
      setEditPhone(updated.phone ?? "");
      setEditWebsite(updated.website ?? "");

      setStoreSaveSuccess("Upplýsingar verslunar hafa verið uppfærðar.");
    } catch (err) {
      console.error("save store info error:", err);
      setStoreSaveError(
        "Tókst ekki að uppfæra upplýsingar verslunar. Reyndu aftur eða hafðu samband ef vandinn heldur áfram.",
      );
    } finally {
      setStoreSaveLoading(false);
    }
  }

  async function handleActivatePlan() {
    if (!store?.id) return;
    if (!selectedPlan) return;

    // geymum fyrri stöðu til að velja rétt skilaboð
    const wasBillingActive = billing?.billingStatus === "active";
    const wasTrialActive =
      billing !== null &&
      billing.billingStatus === "trial" &&
      !billing.trialExpired &&
      !!billing.trialEndsAt;
    const wasTrialExpired =
      !!billing?.trialEndsAt && billing.trialExpired === true;

    setPlanErrorMsg(null);
    setPlanSuccessMsg(null);
    setActivatingPlanId(selectedPlan);

    try {
      // Virkjum / uppfærum pakka í backend
      await apiFetch<StoreInfo>("/api/v1/stores/activate-plan", {
        method: "POST",
        body: JSON.stringify({ plan: selectedPlan }),
      });

      // Sækjum nýjustu billing stöðu eftir breytingu
      const updatedBilling = await apiFetch<BillingInfo>(
        "/api/v1/stores/me/billing",
      );
      setBilling(updatedBilling);

      const planName =
        PLANS.find((p) => p.id === selectedPlan)?.name || "pakkann";

      if (wasBillingActive || wasTrialActive) {
        setPlanSuccessMsg(`Pakkinn þinn hefur verið uppfærður í ${planName}.`);
      } else if (wasTrialExpired) {
        setPlanSuccessMsg(
          `Áskrift þín hefur verið virkjuð í ${planName} pakka.`,
        );
      } else {
        setPlanSuccessMsg(
          `Frívika þín hefur verið virkjuð í ${planName} pakka.`,
        );
      }

      // Enginn redirect – notandi er áfram á prófílnum
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
          if (parsed.message) {
            msg = parsed.message;
          }
        } catch {
          // höldum msg óbreyttri ef parse klikkar
        }
      }

      setPlanErrorMsg(msg);
    } finally {
      setActivatingPlanId(null);
    }
  }

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

      // Uppfærum listann – einfaldast að láta react-query refetcha
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

  // NÝTT: breyta lykilorði
  async function handleChangePassword() {
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      if (!currentPassword || !newPassword) {
        setPasswordError("Vinsamlegast sláðu inn núverandi og nýtt lykilorð.");
        setPasswordSaving(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError("Nýju lykilorðin passa ekki saman.");
        setPasswordSaving(false);
        return;
      }

      await apiFetch("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setPasswordSuccess("Lykilorð hefur verið uppfært.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("change password error", err);
      setPasswordError(
        "Tókst ekki að uppfæra lykilorð. Gakktu úr skugga um að núverandi lykilorð sé rétt og reyndu aftur.",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  if (!authUser || !isStore || !store) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        <Card className="p-4 space-y-3">
          <p className="text-sm">
            Þú þarft að vera innskráður sem verslun til að sjá prófíl.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="bg-[#FF7300] hover:bg-[#e56600] text-white text-sm"
          >
            Skrá inn
          </Button>
        </Card>
      </div>
    );
  }

  const canCreateOffers = !!billing && (isBillingActive || trialActive);

  const createdAtLabel = formatDate(
    store.createdAt ?? billing?.createdAt ?? null,
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 pt-4 space-y-4">
      {/* Haus: hver er innskráður */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Prófíll verslunar</h1>
          <p className="text-xs text-muted-foreground">
            Innskráður sem {authUser.user.email} (verslun
            {isAdmin ? " – ADMIN" : ""})
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={handleLogout}
        >
          Útskrá
        </Button>
      </header>

      {/* Upplýsingar um verslun + editable form */}
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Verslun</h2>
        <p className="text-xs text-muted-foreground">
          Hér getur þú uppfært helstu upplýsingar verslunar eins og þær birtast
          í ÚtsalApp.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Nafn verslunar</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Heimilisfang</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Sími</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Vefsíða</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
            />
          </div>
        </div>

        {createdAtLabel && (
          <p className="text-xs">
            <span className="font-medium">Stofnað í ÚtsalApp:</span>{" "}
            {createdAtLabel}
          </p>
        )}

        {storeSaveError && (
          <p className="text-xs text-red-600">{storeSaveError}</p>
        )}
        {storeSaveSuccess && (
          <p className="text-xs text-green-600">{storeSaveSuccess}</p>
        )}

        <Button
          size="sm"
          className="mt-1 text-xs bg-[#FF7300] hover:bg-[#e56600] text-white disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleSaveStoreInfo}
          disabled={storeSaveLoading}
        >
          {storeSaveLoading ? "Vista breytingar…" : "Vista breytingar"}
        </Button>

        {/* Áskriftarupplýsingar í sama korti */}
        <div className="pt-3 border-t mt-3 space-y-1 text-sm">
          <p>
            <span className="font-medium">Valinn pakki:</span>{" "}
            {displayPlan === "basic"
              ? "Basic"
              : displayPlan === "pro"
                ? "Pro"
                : displayPlan === "premium"
                  ? "Premium"
                  : "Engin áskrift valin"}
          </p>
          {trialLabel && (
            <p className="text-sm">
              <span className="font-medium">Prufutímabil:</span> {trialLabel}
            </p>
          )}
          {!trialLabel && !isBillingActive && (
            <p className="text-sm text-muted-foreground">
              Engin frívika virk. Veldu áskriftarleið og smelltu á hnappinn hér
              fyrir neðan til að byrja.
            </p>
          )}
          {isBillingActive && (
            <p className="text-sm text-[#059669]">
              Áskrift er virk. Þú getur haldið áfram að setja inn tilboð á meðan
              áskriftin er í gildi.
            </p>
          )}
          <p className="text-sm">
            <span className="font-medium">Greiðslustaða:</span> {billingLabel}
          </p>
        </div>

        {/* Flokkar verslunar – allt að 3 valdir + undirflokkar */}
        <div className="mt-4 border-t pt-3 space-y-2">
          <h3 className="text-sm font-semibold">Flokkar verslunar</h3>
          <p className="text-xs text-muted-foreground">
            Merktu við allt að 3 megaflokka sem lýsa best versluninni þinni og
            veldu síðan viðeigandi undirflokka (t.d. „Happy Hour“).
          </p>

          <div className="flex flex-col gap-1">
            {STORE_CATEGORY_OPTIONS.map((cat) => {
              const checked = selectedStoreCategories.includes(cat);
              const disableCheckbox =
                !checked && selectedStoreCategories.length >= 3;

              return (
                <label
                  key={cat}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={checked}
                    disabled={disableCheckbox}
                    onChange={() => toggleStoreCategory(cat)}
                  />
                  <span>{cat}</span>
                </label>
              );
            })}
          </div>

          {/* Undirflokkar fyrir völdu megaflokkana */}
          {selectedStoreCategories.length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Veldu undirflokka undir völdum megaflokkum. Þetta birtist hjá
                prófíl verslunar (t.d. „Viðburðir · Happy Hour“).
              </p>
              <div className="space-y-2">
                {selectedStoreCategories.map((parent) => {
                  const subs = STORE_SUBCATEGORY_OPTIONS[parent] ?? [];
                  if (!subs.length) return null;

                  return (
                    <div key={parent} className="space-y-1">
                      <p className="text-xs font-semibold">{parent}</p>
                      <div className="flex flex-wrap gap-2">
                        {subs.map((sub) => {
                          const checked = selectedStoreSubcategories.includes(
                            sub.value,
                          );
                          return (
                            <button
                              key={sub.value}
                              type="button"
                              onClick={() =>
                                toggleStoreSubcategory(parent, sub.value)
                              }
                              className={`px-3 py-1 rounded-full border text-xs ${
                                checked
                                  ? "bg-[#FF7300] text-white border-[#FF7300]"
                                  : "bg-white text-gray-800 border-gray-300"
                              }`}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {categoriesError && (
            <p className="text-xs text-red-600">{categoriesError}</p>
          )}
          {categoriesSuccess && (
            <p className="text-xs text-green-600">{categoriesSuccess}</p>
          )}

          <div className="pt-1">
            <Button
              size="sm"
              className="text-xs bg-[#FF7300] hover:bg-[#e56600] text-white disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleSaveCategories}
              disabled={savingCategories}
            >
              {savingCategories ? "Vista flokka…" : "Vista flokka"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Pakkar + frívika / áskrift */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Pakkar og frívika / áskrift</h2>
        </div>

        {billingLoading && (
          <p className="text-xs text-muted-foreground">Sæki stöðu áskriftar…</p>
        )}

        {billingError && <p className="text-xs text-red-600">{billingError}</p>}

        {!billingLoading && !billingError && (
          <>
            {isBillingActive && activePlan && (
              <p className="text-xs text-[#059669]">
                Áskrift er virk á pakkann{" "}
                <span className="font-medium">
                  {activePlan === "basic"
                    ? "Basic"
                    : activePlan === "pro"
                      ? "Pro"
                      : "Premium"}
                </span>
                .
              </p>
            )}

            {!isBillingActive && trialActive && activePlan && (
              <p className="text-xs text-[#059669]">
                Frí prufuvika er virk á pakkann{" "}
                <span className="font-medium">
                  {activePlan === "basic"
                    ? "Basic"
                    : activePlan === "pro"
                      ? "Pro"
                      : "Premium"}
                </span>
                .
              </p>
            )}

            {!isBillingActive && !trialActive && (
              <p className="text-xs text-muted-foreground">
                Veldu pakka sem hentar versluninni þinni. Smelltu svo á hnappinn
                hér fyrir neðan til að{" "}
                {billing?.trialEndsAt && billing.trialExpired
                  ? "virkja áskrift á valda pakka."
                  : "virkja 7 daga fríviku á valda áskrift."}
              </p>
            )}
          </>
        )}

        {planErrorMsg && <p className="text-xs text-red-600">{planErrorMsg}</p>}

        {planSuccessMsg && (
          <p className="text-xs text-green-600">{planSuccessMsg}</p>
        )}

        {/* Pakkarnir sjálfir */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isActive = activePlan === plan.id;
            const isActivating = activatingPlanId === plan.id;

            return (
              <div
                key={plan.id}
                className={`border rounded-lg p-3 text-xs flex flex-col gap-2 cursor-pointer ${
                  isSelected
                    ? "border-[#FF7300] bg-orange-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">{plan.name}</h3>
                  <span className="font-bold">{plan.price}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {plan.description}
                </p>
                {isSelected && (
                  <p className="text-[11px] text-[#FF7300] font-medium">
                    Valin áskriftarleið
                  </p>
                )}
                {isActive && trialActive && (
                  <p className="text-[11px] text-[#059669] font-medium">
                    Frívika virk á þessum pakka
                  </p>
                )}
                {isActive && isBillingActive && (
                  <p className="text-[11px] text-[#059669] font-medium">
                    Áskrift virk á þessum pakka
                  </p>
                )}
                {isActivating && (
                  <p className="text-[11px] text-muted-foreground">
                    Uppfæri pakka…
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* EINN hnappur fyrir neðan pakkana */}
        <div className="pt-2">
          <Button
            className="w-full bg-[#FF7300] hover:bg-[#e56600] text-white text-xs disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={mainButtonDisabled}
            onClick={handleActivatePlan}
          >
            {mainButtonLabel}
          </Button>
        </div>
      </Card>

      {/* Aðgerðir fyrir verslun */}
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Aðgerðir</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            className="bg-[#FF7300] hover:bg-[#e56600] text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => navigate("/create-post")}
            disabled={!canCreateOffers}
          >
            Búa til nýtt tilboð
          </Button>
          {!canCreateOffers && (
            <p className="text-[11px] text-muted-foreground">
              Virkjaðu fríviku eða áskrift til að byrja að setja inn tilboð.
            </p>
          )}
        </div>
      </Card>

      {/* NÝTT: Breyta lykilorði */}
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Breyta lykilorði</h2>
        <p className="text-xs text-muted-foreground">
          Hér getur þú uppfært innskráningarlykilorðið fyrir þína verslun.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium">Núverandi lykilorð</label>
            <input
              type="password"
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Nýtt lykilorð</label>
            <input
              type="password"
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">
              Staðfesting á nýju lykilorði
            </label>
            <input
              type="password"
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        {passwordError && (
          <p className="text-xs text-red-600">{passwordError}</p>
        )}
        {passwordSuccess && (
          <p className="text-xs text-green-600">{passwordSuccess}</p>
        )}

        <Button
          size="sm"
          className="text-xs bg-[#FF7300] hover:bg-[#e56600] text-white disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleChangePassword}
          disabled={passwordSaving}
        >
          {passwordSaving ? "Uppfæri lykilorð…" : "Uppfæra lykilorð"}
        </Button>
      </Card>

      {/* Tilboð verslunar */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tilboð verslunar</h2>
          <p className="text-[11px] text-muted-foreground">
            {storePosts.length} tilboð
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

        {!loadingPosts && !postsError && storePosts.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Þú ert ekki enn búinn að skrá nein tilboð. Þegar frívikan eða
            áskrift er virk, getur þú smellt á „Búa til nýtt tilboð“ til að
            byrja.
          </p>
        )}

        {!loadingPosts && !postsError && storePosts.length > 0 && (
          <div className="space-y-3">
            {storePosts.map((post) => {
              // --- MYNDABREYTING: byggjum rétta slóð ---
              const rawImageUrl = post.images?.[0]?.url ?? "";
              let firstImageUrl = "";

              if (rawImageUrl) {
                if (
                  rawImageUrl.startsWith("http://") ||
                  rawImageUrl.startsWith("https://") ||
                  rawImageUrl.startsWith("data:")
                ) {
                  // Full slóð eða data-URL
                  firstImageUrl = rawImageUrl;
                } else if (API_BASE_URL) {
                  // Relative slóð (t.d. /uploads/xxx) → hengjum API_BASE_URL fyrir framan
                  firstImageUrl = `${API_BASE_URL}${rawImageUrl}`;
                } else {
                  // Dev-tilvik þar sem API_BASE_URL er tómt – höldum gamla hegðun
                  firstImageUrl = rawImageUrl;
                }
              }
              // --- MYNDABREYTING ENDAR HÉR ---

              const isDeleting = deletingPostId === post.id;
              const timeRemainingLabel = getPostTimeRemainingLabel(post.endsAt);

              return (
                <div
                  key={post.id}
                  className="border border-gray-200 rounded-md p-3 text-sm flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  {firstImageUrl && (
                    <img
                      src={firstImageUrl}
                      alt={post.images?.[0]?.alt || post.title}
                      className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{post.title}</p>
                        {post.category && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            Flokkur: {getCategoryDisplayLabel(post.category)}
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

                    {/* Ef engar skoðanir en viljum samt sýna dagafjölda */}
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
    </div>
  );
}
