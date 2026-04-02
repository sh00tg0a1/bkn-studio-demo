import type { Metadata } from "next";
import { Fira_Code, Fira_Sans, Noto_Sans_SC } from "next/font/google";
import Script from "next/script";
import { SkipLink } from "@/components/skip-link";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  display: "swap",
});

const themeInitScript = `
(function(){
  try {
    var d = document.documentElement;
    var t = localStorage.getItem('bkn-studio-theme');
    if (t === 'dark') d.classList.add('dark');
    else if (t === 'light') d.classList.remove('dark');
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) d.classList.add('dark');
    else d.classList.remove('dark');
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  title: "BKN Studio",
  description: "基于 KWeaver BKN 的智能工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${firaSans.variable} ${notoSansSC.variable} ${firaCode.variable} relative min-h-dvh font-sans`}
      >
        <Script id="bkn-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <SkipLink />
        <div
          className="fixed z-[100]"
          style={{
            top: "max(0.75rem, env(safe-area-inset-top, 0px))",
            right: "max(0.75rem, env(safe-area-inset-right, 0px))",
          }}
        >
          <ThemeToggle />
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-dvh outline-none focus:outline-none"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
