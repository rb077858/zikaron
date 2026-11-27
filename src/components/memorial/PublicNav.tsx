"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type NavItem = { id: string; icon: string; label: string };

// Order mirrors the section order on the page. Sharing a memory is a
// closing, participatory action rather than the entry point, so it sits
// last — not first, where a first-time visitor would otherwise be asked to
// act before they've even seen who the page is for.
const BASE_ITEMS: NavItem[] = [
  { id: "top", icon: "⌂", label: "ראשי" },
  { id: "whoami", icon: "🪪", label: "מי אני?" },
  { id: "story", icon: "📜", label: "סיפור חיים" },
  { id: "tehilim", icon: "📖", label: "תהילים" },
  { id: "media", icon: "🖼️", label: "מדיה" },
  { id: "memories", icon: "💭", label: "שיתוף זיכרון" },
];

/** Distance from the top of the document, ignoring CSS transforms (the fade-in shifts sections). */
function documentTop(el: HTMLElement): number {
  let top = 0;
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop;
  }
  return top;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function PublicNav({
  hasStory,
  hasTehilim,
  hasMedia,
  hasMemoryWall,
}: {
  hasStory: boolean;
  hasTehilim: boolean;
  hasMedia: boolean;
  hasMemoryWall: boolean;
}) {
  const items = BASE_ITEMS.filter((item) => {
    if (item.id === "story") return hasStory;
    if (item.id === "tehilim") return hasTehilim;
    if (item.id === "media") return hasMedia;
    if (item.id === "memories") return hasMemoryWall;
    return true;
  });
  const key = items.map((i) => i.id).join(",");

  const navRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(items[0]?.id ?? "top");
  // While a click-triggered smooth scroll runs, the scroll spy would flick
  // through every section in between; hold the clicked one instead.
  const lockUntil = useRef(0);

  // Scroll spy: the active section is the last one whose top has passed
  // just below the sticky nav. Works for short sections too, and at the
  // very bottom of the page the last section wins.
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      if (Date.now() < lockUntil.current) return;
      const offset = (navRef.current?.offsetHeight ?? 64) + 24;
      let current = items[0]?.id ?? "top";
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && documentTop(el) - window.scrollY - offset <= 0) current = item.id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && items.length) {
        const last = items[items.length - 1];
        if (document.getElementById(last.id)) current = last.id;
      }
      setActive(current);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Keep the active tab visible when the bar scrolls sideways on a phone.
  useEffect(() => {
    const tab = navRef.current?.querySelector<HTMLElement>(`[data-nav="${active}"]`);
    tab?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [active]);

  const goTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navHeight = navRef.current?.offsetHeight ?? 64;
    const top = id === "top" ? 0 : documentTop(el) - navHeight - 12;
    setActive(id);
    lockUntil.current = Date.now() + 900;
    window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    // Keep the address shareable without letting the browser jump.
    history.replaceState(null, "", `${location.pathname}${location.search}#${id}`);
  }, []);

  // Arriving with a #hash (e.g. a shared link to the memory wall): the
  // sections load after the page, so scroll once they exist.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && items.some((i) => i.id === id)) {
      const t = setTimeout(() => goTo(id), 150);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <nav
      ref={navRef}
      aria-label="ניווט בדף"
      className="sticky top-0 z-40 border-b border-border/80 bg-background/90 shadow-[0_1px_0_rgba(212,175,106,0.08)] backdrop-blur-md"
    >
      <div className="no-scrollbar mx-auto flex max-w-4xl items-stretch justify-between overflow-x-auto px-1">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <a
              key={item.id}
              data-nav={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                goTo(item.id);
              }}
              aria-current={isActive ? "location" : undefined}
              className={`group relative flex min-w-[3.6rem] flex-1 shrink-0 flex-col items-center gap-1 px-1 py-3 text-center transition-colors duration-300 ${
                isActive ? "text-gold-soft" : "text-foreground/75 hover:text-gold-soft"
              }`}
            >
              <span
                className={`text-xl leading-none transition-transform duration-300 ${
                  isActive ? "scale-110" : "group-hover:scale-105"
                }`}
              >
                {item.icon}
              </span>
              <span className="whitespace-nowrap text-[10.5px] font-medium min-[400px]:text-[11px] sm:text-xs">{item.label}</span>
              <span
                className={`absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-gold transition-all duration-300 ${
                  isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
                }`}
              />
            </a>
          );
        })}
      </div>
    </nav>
  );
}
