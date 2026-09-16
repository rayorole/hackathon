import Link from "next/link";
import type { ReactNode } from "react";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import { presentationNl as t } from "@/lib/nl";
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <aside className="auth-story">
        <Link href="/" className="auth-brand">
          <Building2 className="size-7" />
          Straatbeeld
        </Link>
        <div>
          <span className="auth-location">
            <MapPin className="size-4" />
            Schoten · Lokale economie
          </span>
          <h2>{t.authIntro}</h2>
          <p>{t.authDescription}</p>
        </div>
        <p className="auth-footnote">
          <ShieldCheck className="size-4" />
          {t.authFooter}
        </p>
      </aside>
      <section className="auth-form">{children}</section>
    </main>
  );
}
