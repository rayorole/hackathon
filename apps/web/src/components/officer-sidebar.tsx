"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Database,
  LayoutDashboard,
  Rows3,
  ClipboardCheck,
  History,
  ChevronsUpDown,
  LogOut,
  MapPinned,
} from "lucide-react";
import { deskRoutes, type DeskScreen } from "@/lib/desk-routes";
import { deskNl as t, sidebarNl as s, uxNl as u, nl } from "@/lib/nl";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
const icons = {
  overview: LayoutDashboard,
  street: Rows3,
  map: Rows3,
  review: ClipboardCheck,
  history: History,
  sources: Building2,
  states: Building2,
};
const groups: { label: string; items: DeskScreen[] }[] = [
  {
    label: s.workspace,
    items: ["overview", "street", "review", "history"],
  },
];
export function OfficerSidebar({
  officer,
  queueCount,
  onNavigate,
  onBeforeLeave,
}: {
  officer: string;
  queueCount: number;
  recordCount: number;
  onNavigate: (screen: DeskScreen) => void;
  onBeforeLeave: (action: () => void) => void;
}) {
  const pathname = usePathname();
  const { setOpenMobile, state, isMobile } = useSidebar();
  const closeMobile = () => setOpenMobile(false);
  return (
    <Sidebar variant="inset" collapsible="icon" className="desk-sidebar">
      <SidebarHeader className="desk-sidebar-header p-2" title={s.illustration}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={t.brand}
              aria-label={t.brand}
              render={<Link href={deskRoutes.overview} />}
              onClick={(event) => {
                event.preventDefault();
                closeMobile();
                onNavigate("overview");
              }}
              className="desk-brand gap-3 rounded-xl"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <MapPinned className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-heading text-base font-semibold tracking-tight">
                  {t.brand}
                </span>
                <span className="desk-brand-subtitle mt-1 text-xs font-normal">
                  {s.municipality}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-1">
        {groups.map((group) => (
          <SidebarGroup
            key={group.label}
            className="px-2 py-3"
          >
            <SidebarGroupLabel className="mb-1 h-6 px-3 text-[11px] font-medium text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {group.items.map((key) => {
                const Icon = icons[key],
                  active =
                    pathname === deskRoutes[key] ||
                    (key === "street" && pathname === deskRoutes.map),
                  count = key === "review" ? queueCount : null;
                return (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={deskRoutes[key]}
                          aria-current={active ? "page" : undefined}
                        />
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        closeMobile();
                        onNavigate(key);
                      }}
                      tooltip={t.nav[key]}
                      aria-label={t.nav[key]}
                      isActive={active}
                      className="desk-nav-item h-8 gap-3 rounded-lg px-3 text-sm"
                    >
                      <Icon className="size-4" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {t.nav[key]}
                      </span>
                      {count !== null && count > 0 && (
                        <Badge variant="secondary" className="desk-nav-count group-data-[collapsible=icon]:hidden">
                          {count}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <SidebarSeparator />
        <SidebarGroup className="px-2 py-2">
        <SidebarMenu>
        <SidebarMenuItem>
        <SidebarMenuButton
          className="desk-nav-item h-8 rounded-lg px-3 text-sm"
          render={<Link href={deskRoutes.sources} aria-current={pathname === deskRoutes.sources ? "page" : undefined} />}
          isActive={pathname === deskRoutes.sources}
          tooltip={u.about}
          aria-label={u.about}
          onClick={(event) => { event.preventDefault(); closeMobile(); onNavigate("sources"); }}
        >
          <Database className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">{u.about}</span>
        </SidebarMenuButton>
        </SidebarMenuItem>
        </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="desk-sidebar-footer gap-0 border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={s.account}
                render={<SidebarMenuButton size="lg" tooltip={s.account} />}
                className="desk-account gap-3 rounded-lg"
              >
                <Avatar className="size-8 rounded-full">
                  <AvatarFallback className="rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {officer.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium">
                    {officer}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {s.officer}
                  </span>
                </span>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={
                  isMobile ? "top" : state === "collapsed" ? "right" : "top"
                }
                align="start"
                className="min-w-60"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{s.signedIn}</DropdownMenuLabel>
                  <DropdownMenuItem disabled className="text-xs">
                    {officer}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href={deskRoutes.sources} />}
                  onClick={(event) => {
                    event.preventDefault();
                    closeMobile();
                    onNavigate("sources");
                  }}
                >
                  <Database />
                  {t.nav.sources}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    onBeforeLeave(() => {
                      void signOut();
                    });
                  }}
                >
                  <LogOut />
                  {nl.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
