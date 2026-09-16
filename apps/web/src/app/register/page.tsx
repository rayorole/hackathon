"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export default function Register() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const { data, error } = await createClient().auth.signUp({
        email: String(f.get("email")),
        password: String(f.get("password")),
        options: { emailRedirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) {
        setMessage("Registratie mislukt: " + error.message);
        return;
      }
      if (data.session) router.push("/access-pending");
      else
        setMessage(
          "Controleer uw e-mail om uw account te bevestigen. Daarna kan een beheerder uw medewerkerstoegang activeren.",
        );
    } catch {
      setMessage("Registratie niet beschikbaar. Probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="m-auto w-full max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle>Account aanvragen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm">
              Alleen geautoriseerde medewerkers krijgen toegang tot de dossiers.
            </p>
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <Label htmlFor="password">
              Nieuw wachtwoord (minimaal 12 tekens)
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
            <Button disabled={busy} type="submit">
              {busy ? "Even geduld…" : "Registreren"}
            </Button>
            <p role="status" className="text-sm">
              {message}
            </p>
          </form>
          <a href="/login" className="mt-4 block text-sm underline">
            Naar aanmelden
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
