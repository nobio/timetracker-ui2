"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { KeyRound, RefreshCw } from "lucide-react";
import { getAccessToken, getRefreshToken, getTokenExpiry } from "@/lib/auth/session";

type TokenKind = "access" | "refresh";

function formatHoursUntil(expiry: number, now: number): string {
  const hours = (expiry - now) / 3_600_000;
  if (hours <= 0) return "expired";
  if (hours < 1) return `in ${Math.round(hours * 60)} min`;
  return `in ${hours.toFixed(1)} h`;
}

function TokenExpiryBadge({
  label,
  icon: Icon,
  expiry,
  now,
  showRelative,
  onToggle,
}: {
  label: string;
  icon: typeof KeyRound;
  expiry: number | null;
  now: number;
  showRelative: boolean;
  onToggle: () => void;
}) {
  const expired = expiry !== null && expiry <= now;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={showRelative ? "Show expiry date" : "Show time remaining"}
      className="flex flex-1 min-w-0 items-center gap-1.5 sm:gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 sm:px-3 py-2 text-left transition-colors hover:bg-slate-200/70 dark:hover:bg-slate-700/70 cursor-pointer"
    >
      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${expired ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <span
          className={`whitespace-nowrap text-[11px] sm:text-xs font-semibold tabular-nums ${expired ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"}`}
        >
          {expiry === null
            ? "unknown"
            : showRelative
              ? formatHoursUntil(expiry, now)
              : format(expiry, "dd.MM.yy HH:mm")}
        </span>
      </span>
    </button>
  );
}

export function TokenExpiry() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [expiries, setExpiries] = useState<Record<TokenKind, number | null>>({
    access: null,
    refresh: null,
  });
  const [relative, setRelative] = useState<Record<TokenKind, boolean>>({
    access: false,
    refresh: false,
  });

  useEffect(() => {
    setMounted(true);

    const readTokens = () => {
      setExpiries({
        access: getTokenExpiry(getAccessToken()),
        refresh: getTokenExpiry(getRefreshToken()),
      });
    };

    readTokens();
    const interval = setInterval(() => {
      setNow(Date.now());
      readTokens();
    }, 1000);

    window.addEventListener("storage", readTokens);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", readTokens);
    };
  }, []);

  if (!mounted) return null;

  const toggle = (kind: TokenKind) =>
    setRelative((prev) => ({ ...prev, [kind]: !prev[kind] }));

  return (
    <div className="flex flex-row md:flex-col gap-2">
      <TokenExpiryBadge
        label="Access token"
        icon={KeyRound}
        expiry={expiries.access}
        now={now}
        showRelative={relative.access}
        onToggle={() => toggle("access")}
      />
      <TokenExpiryBadge
        label="Refresh token"
        icon={RefreshCw}
        expiry={expiries.refresh}
        now={now}
        showRelative={relative.refresh}
        onToggle={() => toggle("refresh")}
      />
    </div>
  );
}
