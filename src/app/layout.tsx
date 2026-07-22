import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClerkProvider } from "@clerk/nextjs";
import { hasClerk } from "@/lib/config/env";
import { getLanguage } from "@/lib/i18n";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "Analisa Kurikulum",
  description: "Portal UPSA, UASA dan analisis PBD sekolah.",
  applicationName: "Analisa Kurikulum",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Analisa",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1d3f9e" },
    { media: "(prefers-color-scheme: dark)", color: "#0c111d" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await getLanguage();
  const themeScript = `
    (() => {
      try {
        const savedTheme = localStorage.getItem("ssp-theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const theme = savedTheme === "dark" || savedTheme === "light"
          ? savedTheme
          : prefersDark
            ? "dark"
            : "light";
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.dataset.theme = theme;
      } catch {}
    })();
  `;

  return (
    <html
      lang={language}
      suppressHydrationWarning
      className={`h-full antialiased ${inter.variable} ${jakarta.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {hasClerk ? <ClerkProvider>{children}</ClerkProvider> : children}
        <ServiceWorkerRegistration />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
