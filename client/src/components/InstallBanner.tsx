import { useState, useEffect } from "react";
import { X, Share2, Globe, Menu } from "lucide-react";
import { SiApple, SiAndroid } from "react-icons/si";

const STORAGE_KEY = "utsalapp_install_banner_dismissed";

export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<"ios" | "android">("ios");

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);

    if (!dismissed && !isStandalone) {
      setVisible(true);
    }

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android")) setTab("android");
    else setTab("ios");

  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-white border-b border-neutral-100" data-testid="install-banner">
      <div
        className="h-0.5 w-full"
        style={{ background: "linear-gradient(90deg, #ff4d00 0%, #ff7a40 100%)" }}
      />

      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("ios")}
              data-testid="button-install-tab-ios"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                tab === "ios"
                  ? "text-white"
                  : "bg-neutral-100 text-neutral-500"
              }`}
              style={tab === "ios" ? { background: "#ff4d00" } : {}}
            >
              <SiApple className="w-3 h-3" />
              iPhone
            </button>
            <button
              onClick={() => setTab("android")}
              data-testid="button-install-tab-android"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                tab === "android"
                  ? "text-white"
                  : "bg-neutral-100 text-neutral-500"
              }`}
              style={tab === "android" ? { background: "#ff4d00" } : {}}
            >
              <SiAndroid className="w-3 h-3" />
              Android
            </button>
          </div>

          <button
            onClick={dismiss}
            data-testid="button-install-banner-dismiss"
            className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Loka"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 mb-2.5 font-medium uppercase tracking-wide">
          Settu app á heimaskjáinn
        </p>

        {tab === "ios" ? (
          <div className="flex items-start gap-4">
            <Step n={1}>
              Opnaðu í <span className="font-semibold text-neutral-700">Safari</span>
            </Step>
            <Step n={2}>
              Pikkaðu á{" "}
              <Share2
                className="inline w-3.5 h-3.5 mb-0.5"
                style={{ color: "#007aff" }}
              />{" "}
              tákn
            </Step>
            <Step n={3}>
              Veldu{" "}
              <span className="font-semibold text-neutral-700">
                „Bæta við heimaskjá"
              </span>
            </Step>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <Step n={1}>
              Smelltu á{" "}
              <Globe className="inline w-3.5 h-3.5 mb-0.5 text-neutral-600" />{" "}
              <span className="font-semibold text-neutral-700">„Opna í internetforriti"</span>
            </Step>
            <Step n={2}>
              Smelltu á{" "}
              <Menu className="inline w-3.5 h-3.5 mb-0.5 text-neutral-600" />{" "}
              <span className="font-semibold text-neutral-700">3 línur</span>{" "}
              neðst til hægri
            </Step>
            <Step n={3}>
              Veldu{" "}
              <span className="font-semibold text-neutral-700">
                „Bæta við heimaskjá"
              </span>
            </Step>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 text-center">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
        style={{ background: "#ff4d00" }}
      >
        {n}
      </span>
      <span className="text-[11px] text-neutral-500 leading-tight">{children}</span>
      {n < 3 && (
        <span className="sr-only">→</span>
      )}
    </div>
  );
}
