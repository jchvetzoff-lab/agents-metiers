"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

// Pages publiques (consultation) - pas besoin d'auth
const PUBLIC_PATHS = ["/", "/login", "/fiches", "/dashboard", "/guide"];

function isPublicPath(pathname: string): boolean {
  // Exact match or starts with /fiches/ (fiche detail pages)
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/fiches/");
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isPublicPath(pathname)) {
      setChecked(true);
      return;
    }

    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-6 h-6 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
