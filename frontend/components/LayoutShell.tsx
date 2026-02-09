"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackgroundAnimation from "@/components/BackgroundAnimation";
import ScrollToTop from "@/components/ScrollToTop";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <BackgroundAnimation />
      <div className="relative z-10">
        <ScrollToTop />
        <Navbar />
        {children}
      </div>
    </>
  );
}
