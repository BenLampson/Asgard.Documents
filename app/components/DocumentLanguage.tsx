"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function DocumentLanguage() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "zh-CN";
  }, [pathname]);

  return null;
}
