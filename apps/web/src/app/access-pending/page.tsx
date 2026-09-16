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
    <main className="mx-auto max-w-lg space-y-5 p-10">
      <h1 className="text-2xl">Toegang aangevraagd</h1>
      <p>
        Uw account is geregistreerd. Een beheerder moet u toegang als medewerker
        geven voordat u dossiers kunt bekijken.
      </p>
      <form action={signOut}>
        <button className="underline">Afmelden</button>
      </form>
      <Link href="/">Toegang opnieuw controleren</Link>
    </main>
  );
}
