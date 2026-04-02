"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "bkn-studio-theme";

function readDomDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(readDomDark());
  }, []);

  const toggle = useCallback(() => {
    const next = !readDomDark();
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    setDark(next);
  }, []);

  if (!mounted) {
    return (
      <div
        className="border-input bg-background size-11 shrink-0 rounded-md border sm:size-9"
        aria-hidden
      />
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-11 shrink-0 touch-manipulation sm:size-9"
      onClick={toggle}
      aria-label={dark ? "切换为浅色模式" : "切换为深色模式"}
    >
      {dark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </Button>
  );
}
