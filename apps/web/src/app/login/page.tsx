"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { nl } from "@/lib/nl";
export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(form.get("email")), password: String(form.get("password")),
      });
      if (error) { setError(nl.failed); return; }
      router.replace("/"); router.refresh();
    } catch { setError(nl.failed); }
    finally { setBusy(false); }
  }
  return <main className="m-auto w-full max-w-sm p-6">
    <h1 className="text-2xl font-semibold">{nl.title}</h1>
    <p className="my-4">{nl.intro}</p>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label>{nl.email}<input className="mt-1 w-full rounded border p-2" name="email" type="email" autoComplete="email" required /></label>
      <label>{nl.password}<input className="mt-1 w-full rounded border p-2" name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p role="alert">{error}</p>}
      <button className="rounded bg-black p-3 text-white" disabled={busy}>{busy ? nl.pending : nl.login}</button>
    </form>
  </main>;
}
