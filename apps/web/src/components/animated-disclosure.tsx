"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";

/** Base UI owns keyboard/ARIA behavior; Motion keeps the closing panel mounted. */
export function AnimatedDisclosure({ label, children, className = "", compact = false }: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger render={<Button variant={compact ? "ghost" : "outline"} size="sm" />} className={compact ? "disclosure-button" : ""}>
        {label}
        <ChevronDown aria-hidden className={`size-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <AnimatePresence initial={false}>
        {open && (
          <CollapsibleContent keepMounted hidden={false} render={<motion.div
            initial={{ height: reduced ? "auto" : 0, opacity: reduced ? 1 : 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: reduced ? "auto" : 0, opacity: reduced ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
          />} className="overflow-hidden">
            <div className="disclosure-content">{children}</div>
          </CollapsibleContent>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}
