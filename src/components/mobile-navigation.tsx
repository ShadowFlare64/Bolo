"use client";
import Link from "next/link";
import { useRef } from "react";

export function MobileNavigation() {
  const menu = useRef<HTMLDetailsElement>(null);
  function close() { if (menu.current) menu.current.open = false; }
  return <details className="mobile-nav" ref={menu} onKeyDown={event => {
    if (event.key === "Escape") {
      close();
      menu.current?.querySelector("summary")?.focus();
    }
  }}>
    <summary>Menu <span aria-hidden>☰</span></summary>
    <nav aria-label="Mobile navigation">
      <a href="#how-it-works" onClick={close}>About Bolo</a>
      <a href="#first-lesson" onClick={close}>Your first lesson</a>
      <Link href="/learn" onClick={close}>Start Learning →</Link>
    </nav>
  </details>;
}
