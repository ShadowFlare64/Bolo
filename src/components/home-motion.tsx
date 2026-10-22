"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Progressive enhancement: server-rendered content stays visible without JS.
export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!container || preference.matches || !window.IntersectionObserver || !Element.prototype.animate) return;

    const elements = Array.from(container.querySelectorAll<HTMLElement>("[data-reveal]"));
    const animations = new Set<Animation>();
    function reveal(element: HTMLElement) {
      if (!element.classList.contains("reveal-pending")) return;
      element.classList.remove("reveal-pending");
      const animation = element.animate([
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 520, delay: Number(element.dataset.reveal || 0), easing: "cubic-bezier(.22, 1, .36, 1)", fill: "backwards" });
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });

    for (const element of elements) {
      // Don't hide anything already visible, including on restored scroll positions.
      if (element.getBoundingClientRect().top >= window.innerHeight) element.classList.add("reveal-pending");
      observer.observe(element);
    }
    function showAll() {
      observer.disconnect();
      elements.forEach(element => element.classList.remove("reveal-pending"));
      animations.forEach(animation => animation.cancel());
    }
    function onPreferenceChange() { if (preference.matches) showAll(); }
    function onFocus(event: FocusEvent) {
      // Keyboard navigation must never land on an invisible link or control.
      if (!(event.target instanceof HTMLElement)) return;
      elements.filter(element => element.contains(event.target as Node)).forEach(element => {
        element.classList.remove("reveal-pending");
        observer.unobserve(element);
        element.getAnimations().forEach(animation => animation.cancel());
      });
    }
    preference.addEventListener("change", onPreferenceChange);
    container.addEventListener("focusin", onFocus);
    return () => {
      showAll();
      preference.removeEventListener("change", onPreferenceChange);
      container.removeEventListener("focusin", onFocus);
    };
  }, []);

  return <div className="homepage" ref={root}>{children}</div>;
}
