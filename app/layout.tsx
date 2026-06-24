import "./globals.css";

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
