"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@workspace/ui/components/button";
import { Calendar, Moon, Sun, Ticket } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar({ onOpenCreate }: { onOpenCreate?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Ticket className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            MadEvents
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span>Все события</span>
            </Button>
          </Link>

          {onOpenCreate && (
            <Button onClick={onOpenCreate} size="sm" className="font-medium shadow-sm">
              + Создать событие
            </Button>
          )}

          {mounted && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
