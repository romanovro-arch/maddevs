import { Geist, Geist_Mono } from "next/font/google";
import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/Navbar";
import { DevMailboxDrawer } from "@/components/DevMailboxDrawer";
import { cn } from "@workspace/ui/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "MadEvents - Сервис регистрации на мероприятия",
  description: "Система регистрации с контролем мест, листом ожидания и live-чекином",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-screen bg-background font-sans text-foreground flex flex-col">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <DevMailboxDrawer />
          <footer className="border-t py-6 text-center text-xs text-muted-foreground">
            MadEvents &copy; 2026. Сервис бронирования билетов с гарантией от race condition и live-чекином.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
