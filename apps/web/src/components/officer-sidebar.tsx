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
  MapPin,
} from "lucide-react";
import { deskRoutes, type DeskScreen } from "@/lib/desk-routes";
import { deskNl as t, sidebarNl as s, nl } from "@/lib/nl";
import { signOut } from "@/app/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="gap-4 p-3 group-data-[collapsible=icon]:px-2">
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
              className="gap-3 rounded-xl hover:bg-sidebar-accent"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-heading text-sm font-semibold">
                  {t.brand}
                </span>
                <span className="mt-1 text-xs font-normal text-muted-foreground">
                  {t.subtitle}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2 group-data-[collapsible=icon]:hidden">
          <MapPin className="size-3.5 text-primary" />
          <span className="flex-1 text-xs font-medium">{s.municipality}</span>
          <Badge
            variant="outline"
            className="rounded text-[10px] text-muted-foreground"
          >
            {t.demo}
          </Badge>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="gap-1">
        {groups.map((group) => (
          <SidebarGroup
            key={group.label}
            className="px-3 group-data-[collapsible=icon]:px-2"
          >
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
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
                      className="h-9 gap-3 rounded-md px-3 pr-11 text-[13px] text-muted-foreground transition-colors hover:text-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-foreground"
                    >
                      <Icon className="size-4" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {t.nav[key]}
                      </span>
                    </SidebarMenuButton>
                    {count !== null && (
                      <SidebarMenuBadge className="bg-transparent text-muted-foreground">
                        {count}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-3 p-3 group-data-[collapsible=icon]:p-2">
        <Button
          variant="ghost"
          className="justify-start text-sm"
          onClick={() => onNavigate("sources")}
        >
          Over deze gegevens
        </Button>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={s.account}
                render={<SidebarMenuButton size="lg" tooltip={s.account} />}
                className="gap-3 rounded-xl border bg-background/70"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {officer.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-xs font-medium">
                    {officer}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
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
