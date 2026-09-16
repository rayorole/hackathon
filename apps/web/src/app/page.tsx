import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { nl } from "@/lib/nl";
export default async function Home() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  return <main className="m-auto max-w-3xl p-8">
    <h1 className="text-3xl font-semibold">{nl.title}</h1>
    <p className="my-4">{user.app_metadata.role === "officer" ? nl.welcome : nl.noAccess}</p>
    <form action={signOut}><button className="rounded border px-4 py-2">{nl.logout}</button></form>
    <footer className="mt-12 text-sm">{nl.attribution}</footer>
  </main>;
}
