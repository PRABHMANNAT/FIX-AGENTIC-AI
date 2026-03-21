"use client";

import { usePathname } from "next/navigation";

export function AppAtmosphere() {
  const pathname = usePathname();

  if (pathname.startsWith("/onboard")) {
    return null;
  }

  return (
    <>
      <div className="orb orb-green" />
      <div className="orb orb-blue" />
      <div className="orb orb-pink" />
      <div className="scanline-overlay" />
      <div className="grain-overlay" />
    </>
  );
}

export default AppAtmosphere;
