import type { Metadata } from "next";
import { AppProvider } from "@/components/app-context";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevFunds — Executive Suite",
  description: "Executive Financial, Operations, Attendance & Work Suite",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cinzel:wght@500;700&family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&family=Lora:wght@500;600;700&family=Merriweather:wght@400;700&family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <AppProvider>
          <Navbar />
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
