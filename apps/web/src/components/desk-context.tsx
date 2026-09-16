"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { candidateSchema } from "@straatbeeld/contracts/candidates";
import { controlPriority } from "@/lib/control-insights";
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
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const dirty = Object.keys(drafts).length > 0;
  const workspace = useQuery({
    queryKey: ["workspace", officerId],
    queryFn: ({ signal }) => loadWorkspace(signal),
    refetchInterval: dirty || busy || params.has("zaak") ? false : 15_000,
  });
  const candidateQuery = useQuery({
    queryKey: ["candidates", officerId],
    queryFn: async () => z.object({ items: z.array(candidateSchema) }).parse(await (await api("/api/candidates")).json()).items,
  });
  const candidates = candidateQuery.data ?? [];
  const dossiers: Detail[] = workspace.data ?? [];
  const loading = workspace.isPending;
  const [actionError, setError] = useState("");
  const error = actionError || workspace.error?.message || "";
  const refreshMutation = useMutation({
    mutationFn: async (id: string) =>
      (
        await api(`/api/establishments/${id}/refresh`, { method: "POST" })
      ).json(),
  });
  const [notice, setNotice] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
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
  const matchingCandidates = candidates.filter(c => c.status === "approved" && (!street || street === c.address.street) && `${c.name} ${c.address.street} ${c.address.houseNumber}`.toLocaleLowerCase("nl-BE").includes(query.toLocaleLowerCase("nl-BE")));
  const queue = dossiers.flatMap((d) =>
    d.establishment.proposals
      .filter((p) => p.reviewState === "pending" && !p.supersededBy)
      .map((p) => toRecord(d, p.id)),
  ).sort((a, b) => controlPriority(b.detail, b.proposal?.id, new Date().toISOString()).rank - controlPriority(a.detail, a.proposal?.id, new Date().toISOString()).rank);
  const streets = [...new Set([...records.map((r) => r.street), ...candidates.filter(c => c.status === "approved").map(c => c.address.street)])].sort((a, b) =>
    a.localeCompare(b, "nl"),
  );
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  async function reload() {
    const result = await workspace.refetch({ throwOnError: true });
    setError("");
    return result.data!;
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
      const result = await refreshMutation.mutateAsync(id);
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
    fetching: workspace.isFetching,
    error,
    notice,
    busy,
    drafts,
    setError,
    setNotice,
    setBusy,
    setDraft,
    candidates,
    matchingCandidates,
    candidatesLoading: candidateQuery.isPending,
    candidatesError: candidateQuery.error?.message ?? "",
    reloadCandidates: () => candidateQuery.refetch({ throwOnError: true }),
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
