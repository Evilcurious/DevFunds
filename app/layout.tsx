import type { Metadata } from "next";
import { AppProvider } from "@/components/app-context";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevFunds — Spending, Profit, Customers, Staff & Attendance ERP",
  description:
    "Unified ERP platform tracking department spending (BD & IT), net profit, successful customer deliveries, staff status, and daily attendance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('devfunds_theme');if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <AppProvider>
          <Navbar />
          <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0D162B]/70 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
            <div className="mx-auto max-w-7xl px-4 flex flex-wrap items-center justify-between gap-2">
              <span>
                DevFunds ERP · Real-time Spending, Profit, Customer & Attendance Ledger
              </span>
              <span>Blue & White Theme · Dark Mode Ready</span>
            </div>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
