"use client";
import { useMemo } from "react";
import Image from "next/image";
import { Style, Avatar } from "@dicebear/core";
import definition from "@dicebear/styles/squircles.json" with { type: "json" };
const avatarStyle = new Style(definition);
import type { ReactNode } from "react";
import {
  Clock3,
  Phone,
  Mail,
  Globe2,
  MapPin,
  Building2,
  Check,
  Minus,
  CircleHelp,
} from "lucide-react";
import { phoneNumbers, phonePresentation } from "@/lib/phone-numbers";
import { normalizedField } from "@/lib/review-presentation";
import { openingHours } from "@/lib/opening-hours";
import { presentationNl as t } from "@/lib/nl";
export function FieldIcon({
  field,
  className = "size-4",
}: {
  field: string;
  className?: string;
}) {
  const Icon =
    (
      {
        openinghours: Clock3,
        telephone: Phone,
        email: Mail,
        website: Globe2,
        address: MapPin,
      } as Record<string, typeof Clock3>
    )[normalizedField(field)] ?? Building2;
  return <Icon className={className} aria-hidden />;
}
export function StatusPill({
  state,
  children,
}: {
  state: "pending" | "approved" | "rejected" | "neutral";
  children: ReactNode;
}) {
  const Icon =
    state === "approved"
      ? Check
      : state === "rejected"
        ? Minus
        : state === "pending"
          ? Clock3
          : CircleHelp;
  return (
    <span className={`status-pill status-${state}`}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}
export function FieldValue({
  field,
  value,
}: {
  field: string;
  value: string | null | undefined;
}) {
  const schedule =
    normalizedField(field) === "openinghours" ? openingHours(value) : null;
  if (!value)
    return (
      <div className="unknown-value">
        <CircleHelp className="size-5" aria-hidden />
        <span>{t.notKnown}</span>
      </div>
    );
  if (normalizedField(field) === "telephone")
    return (
      <ul className="contact-values" aria-label={t.phone}>
        {phoneNumbers(value).map((number) => {
          const contact = phonePresentation(number);
          return (
            <li className="contact-value" key={number}>
              <FieldIcon field={field} className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <span className="contact-value-label">{t[contact.label]}</span>
                <span className="contact-value-number">{contact.value}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  if (schedule && !schedule.rows.some((row) => row.periods.includes("Zie brontekst")))
    return (
      <div className="hours-display">
        <table className="hours-table">
          <caption className="sr-only">{t.hours}</caption>
          <thead>
            <tr>
              <th scope="col">{t.day}</th>
              <th scope="col">{t.hours}</th>
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((row) => (
              <tr key={`${row.day}-${row.date ?? "weekly"}`}>
                <th scope="row">{row.day}{row.date && <span className="hours-date">{row.date}</span>}</th>
                <td>
                  {row.closed ? (
                    <span className="text-muted-foreground">{t.closed}</span>
                  ) : row.periods.length ? (
                    <>
                      <div className="hours-periods">
                        {row.periods.map((period, i) => (
                          <span key={i}>{period}</span>
                        ))}
                      </div>
                      {row.appointment && (
                        <span className="hours-note">{t.appointment}</span>
                      )}
                    </>
                  ) : row.appointment ? (
                    t.appointment
                  ) : (
                    <span className="text-muted-foreground">{t.notStated}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {schedule.notes.map((note, i) => (
          <p key={i} className="schedule-annotation">
            {note}
          </p>
        ))}

      </div>
    );
  return (
    <div className="field-value">
      <FieldIcon
        field={field}
        className="size-5 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 whitespace-pre-wrap break-words">{value}</span>
    </div>
  );
}
export function BusinessAvatar({ name, seed }: { name: string; seed?: string }) {
  const src = useMemo(() => new Avatar(avatarStyle, { seed: seed ?? name, tags: ["animation"], animationVariant: "slowest" }).toDataUri(), [name, seed]);
  return (
    <span className="business-avatar" aria-hidden>
      <Image src={src} alt="" width={60} height={60} unoptimized />
    </span>
  );
}
export function PanelTitle({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="panel-title">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
