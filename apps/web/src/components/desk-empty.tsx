import type { ReactNode } from "react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "./ui/empty";

export function DeskEmpty({ icon, title, description, children, className }: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={className} role="status">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
