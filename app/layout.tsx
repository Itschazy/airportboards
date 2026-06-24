import type { Metadata } from "next";
import "./globals.css";

// metadataBase at the true root so the root-level opengraph-image resolves to an
// absolute https URL (the [locale] layout also sets it, but the app-root OG image
// route resolves against root metadata).
export const metadata: Metadata = {
  metadataBase: new URL("https://airportsboard.live"),
};

// Root layout is a pass-through: the single <html>/<body> with the correct
// lang/dir is owned by app/[locale]/layout.tsx. Rendering html/body here too
// would nest them (invalid DOM) and force lang="en" on every localized page.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
