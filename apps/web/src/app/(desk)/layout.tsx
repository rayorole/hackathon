import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OfficerDesk } from "@/components/officer-desk";

export default async function DeskLayout({
  children,
}: {
  children: ReactNode;
}) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <OfficerDesk officer={user.email ?? user.id} defaultOpen={defaultOpen}>
      {children}
    </OfficerDesk>
  );
}
