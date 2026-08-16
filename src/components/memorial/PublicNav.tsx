"use client";

import { useEffect, useState } from "react";

type NavItem = { href: string; icon: string; label: string };

// Order mirrors the section order on the page. Sharing a memory is a
// closing, participatory action rather than the entry point, so it sits
// last — not first, where a first-time visitor would otherwise be asked to
// act before they've even seen who the page is for.
const BASE_ITEMS: NavItem[] = [
  { href: "#top", icon: "⌂", label: "ראשי" },
  { href: "#whoami", icon: "🪪", label: "מי אני?" },
  { href: "#tehilim", icon: "📖", label: "תהילים" },
  { href: "#media", icon: "🖼️", label: "מדיה" },
  { href: "#memories", icon: "💭", label: "שיתוף זיכרון" },
];

export function PublicNav({
  hasTehilim,
  hasMedia,
  hasMemoryWall,
}: {
  hasTehilim: boolean;
  hasMedia: boolean;
  hasMemoryWall: boolean;
}) {
  const items = BASE_ITEMS.filter((item) => {
    if (item.href === "#tehilim") return hasTehilim;
    if (item.href === "#media") return hasMedia;
    if (item.href === "#memories") return hasMemoryWall;
    return true;
  });
  const key = items.map((i) => i.href).join(",");

  const [active, setActive] = useState(items[0]?.href ?? "#top");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(`#${visible[0].target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <nav className="sticky top-0 z-40 border-b border-border/80 bg-background/90 shadow-[0_1px_0_rgba(212,175,106,0.08)] backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-stretch justify-between px-2">
        {items.map((item) => {
          const isActive = active === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`group relative flex flex-1 flex-col items-center gap-1 px-2 py-3 text-center transition-colors ${
                isActive ? "text-gold-soft" : "text-foreground/75 hover:text-gold-soft"
              }`}
            >
              <span
                className={`text-xl leading-none transition-transform ${
                  isActive ? "scale-110" : "group-hover:scale-105"
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[11px] font-medium sm:text-xs">{item.label}</span>
              <span
                className={`absolute inset-x-4 -bottom-px h-[2px] rounded-full bg-gold transition-opacity ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />
            </a>
          );
        })}
      </div>
    </nav>
  );
}
