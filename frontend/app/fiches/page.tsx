"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FichesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/brouillons");
  }, [router]);
  return null;
}
