"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackgroundAnimation from "@/components/BackgroundAnimation";
import ScrollToTop from "@/components/ScrollToTop";
import { PageTransition } from "@/components/motion";

interface LayoutShellProps {
  children: React.ReactNode;
}

export default function LayoutShell({ children }: LayoutShellProps) {
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
        <div className="pt-14 md:pt-16" />
        <PageTransition>
          {children}
        </PageTransition>
      </div>
    </>
  );
}
