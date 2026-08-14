"use client";

const ITEMS = [
  { href: "#candle", icon: "🕯️", label: "הדלקת נר" },
  { href: "#tehilim", icon: "📖", label: "תהילים" },
  { href: "#media", icon: "🖼️", label: "מדיה" },
  { href: "#whoami", icon: "🪪", label: "מי אני?" },
  { href: "#top", icon: "⌂", label: "ראשי" },
];

export function PublicNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-stretch justify-between px-2">
        {ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 px-2 py-3 text-center text-foreground/90 hover:text-gold-soft transition-colors"
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[11px] font-medium sm:text-xs">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
