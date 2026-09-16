import { AuthShell } from "@/components/auth-shell";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
export default async function Pending() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role === "officer") redirect("/overzicht");
  return (
    <AuthShell>
      <div className="surface-panel space-y-5 p-8">
        <ShieldCheck className="size-8 text-primary" />
        <h1 className="text-2xl">Toegang aangevraagd</h1>
        <p>
          Uw account is geregistreerd. Een beheerder moet u toegang als
          medewerker geven voordat u dossiers kunt bekijken.
        </p>
        <form action={signOut}>
          <button className="underline">Afmelden</button>
        </form>
        <Link href="/">Toegang opnieuw controleren</Link>
      </div>
    </AuthShell>
  );
}
