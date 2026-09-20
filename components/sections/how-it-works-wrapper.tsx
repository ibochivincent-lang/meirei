"use client";

import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";

/**
 * Wraps the "How it works" section group so its tint eases in as
 * the hero scrolls away. Dynamically adapts between light (#E6EEFF) and dark (#14141d)
 * background palettes to maintain dark mode consistency.
 */
export function HowItWorksWrapper({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  const bgLight = useTransform(
    scrollYProgress,
    [0, 1],
    ["#FAFAF8", "#E6EEFF"],
  );

  const bgDark = useTransform(
    scrollYProgress,
    [0, 1],
    ["#0a0a0c", "#14141d"],
  );

  const backgroundColor = isDark ? bgDark : bgLight;

  return (
    <motion.div ref={ref} style={{ backgroundColor }} className="relative md:min-h-screen">
      {children}
    </motion.div>
  );
}
