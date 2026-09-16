"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Detail } from "@straatbeeld/contracts";
import {
  api,
  loadWorkspace,
  toRecord,
  type RecordView,
} from "@/lib/officer-data";
import { matchesBusiness } from "@/lib/review-presentation";
import { deskRoutes, type DeskScreen } from "@/lib/desk-routes";
import { uxNl as u } from "@/lib/nl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
export type ReviewDraft = {
  mode: "edit" | "reject";
  value: string;
  note: string;
  revision: number;
  stale?: boolean;
};
function useStateForDesk(officer: string, officerId: string) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const [dossiers, setDossiers] = useState<Detail[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const dirty = Object.keys(drafts).length > 0;
  const screen =
    (Object.keys(deskRoutes) as DeskScreen[]).find(
      (key) => deskRoutes[key] === pathname,
    ) ?? "overview";
  const query = params.get("q") ?? "",
    street = params.get("street") ?? "";
  const selected = dossiers.find(
    (d) => d.establishment.id === params.get("zaak"),
  );
  const records = dossiers.map((d) => toRecord(d));
  const rows = records.filter(
    (r) => matchesBusiness(r.detail, query) && (!street || r.street === street),
  );
  const queue = dossiers.flatMap((d) =>
    d.establishment.proposals
      .filter((p) => p.reviewState === "pending")
      .map((p) => toRecord(d, p.id)),
  );
  const streets = [...new Set(records.map((r) => r.street))].sort((a, b) =>
    a.localeCompare(b, "nl"),
  );
  useEffect(() => {
    let active = true;
    loadWorkspace()
      .then((data) => {
        if (active) setDossiers(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  async function reload() {
    const data = await loadWorkspace();
    setDossiers(data);
    setError("");
    return data;
  }
  function guard(action: () => void) {
    if (busy) return;
    if (dirty) setPendingNavigation(() => action);
    else action();
  }
  function updateParams(
    updates: Record<string, string | null>,
    nextScreen?: DeskScreen,
    replace = false,
  ) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    const path = nextScreen ? deskRoutes[nextScreen] : pathname;
    const url = path + (next.size ? "?" + next.toString() : "");
    if (replace && path === pathname)
      window.history.replaceState(null, "", url);
    else router.push(url, { scroll: false });
  }
  function navigate(next: DeskScreen) {
    guard(() => {
      setNotice("");
      updateParams({ zaak: null, voorstel: null }, next);
    });
  }
  function openRecord(record: RecordView, from?: DeskScreen) {
    guard(() => {
      setNotice("");
      updateParams(
        { zaak: record.id, voorstel: record.proposal?.id ?? null },
        from ??
          (screen === "map"
            ? "map"
            : screen === "review"
              ? "review"
              : "street"),
      );
    });
  }
  function back() {
    guard(() => updateParams({ zaak: null, voorstel: null }));
  }
  function setQuery(value: string) {
    updateParams({ q: value, page: null }, undefined, true);
  }
  function setStreet(value: string) {
    updateParams({ street: value, page: null }, undefined, true);
  }
  function setDraft(id: string, draft: ReviewDraft | null) {
    setDrafts((old) => {
      const next = { ...old };
      if (draft) next[id] = draft;
      else delete next[id];
      return next;
    });
  }
  async function refresh(id: string) {
    setBusy(true);
    setError("");
    try {
      const result = await (
        await api(`/api/establishments/${id}/refresh`, { method: "POST" })
      ).json();
      await reload();
      setNotice(result.messageNl);
    } catch (e) {
      setError(e instanceof Error ? e.message : u.retry);
    } finally {
      setBusy(false);
    }
  }
  return {
    officer,
    officerId,
    screen,
    params,
    dossiers,
    records,
    rows,
    queue,
    streets,
    query,
    street,
    selected,
    loading,
    error,
    notice,
    busy,
    drafts,
    setError,
    setNotice,
    setBusy,
    setDraft,
    reload,
    navigate,
    openRecord,
    back,
    setQuery,
    setStreet,
    updateParams,
    guard,
    refresh,
    resumeDraft: () => {
      const id = Object.keys(drafts)[0];
      const detail = dossiers.find((d) =>
        d.establishment.proposals.some((p) => p.id === id),
      );
      if (detail)
        updateParams({ zaak: detail.establishment.id, voorstel: id }, "review");
    },
    pendingNavigation,
    cancelNavigation: () => setPendingNavigation(null),
    discardNavigation: () => {
      setDrafts({});
      setPendingNavigation(null);
      pendingNavigation?.();
    },
  };
}
const Context = createContext<ReturnType<typeof useStateForDesk> | null>(null);
export function useDesk() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing desk context");
  return context;
}
export function DeskProvider({
  officer,
  officerId,
  children,
}: {
  officer: string;
  officerId: string;
  children: ReactNode;
}) {
  const value = useStateForDesk(officer, officerId);
  return (
    <Context.Provider value={value}>
      {children}
      <Dialog
        open={!!value.pendingNavigation}
        onOpenChange={(open) => {
          if (!open) value.cancelNavigation();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{u.discardTitle}</DialogTitle>
            <DialogDescription>{u.discardNote}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={value.cancelNavigation}>
              {u.keep}
            </Button>
            <Button onClick={value.discardNavigation}>{u.discard}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Context.Provider>
  );
}
