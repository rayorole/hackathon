import type { ReactNode } from "react";
import {
  Clock3,
  Phone,
  Mail,
  Globe2,
  MapPin,
  Building2,
  ChevronDown,
  Check,
  Minus,
  CircleHelp,
} from "lucide-react";
import { normalizedField } from "@/lib/review-presentation";
import { phoneNumbers } from "@/lib/phone-numbers";
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
  showOriginal = true,
}: {
  field: string;
  value: string | null | undefined;
  showOriginal?: boolean;
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
      <div className="flex flex-col gap-2">
        {phoneNumbers(value).map((number) => (
          <div className="field-value" key={number}>
            <FieldIcon field={field} className="size-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 whitespace-pre-wrap break-words">{number}</span>
          </div>
        ))}
      </div>
    );
  if (schedule)
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
              <tr key={row.day}>
                <th scope="row">{row.day}</th>
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
        {showOriginal && (
          <details className="original-value">
            <summary>
              {t.original}
              <ChevronDown className="size-3.5" />
            </summary>
            <p className="whitespace-pre-wrap break-words">{value}</p>
          </details>
        )}
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
export function BusinessAvatar({ name }: { name: string }) {
  return (
    <span className="business-avatar" aria-hidden>
      {name.trim().slice(0, 2).toLocaleUpperCase("nl-BE")}
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
