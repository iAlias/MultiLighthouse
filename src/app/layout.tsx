import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi Lighthouse Analyzer",
  description: "Analyze multiple websites simultaneously with Google Lighthouse. Track performance, accessibility, best practices, and SEO scores with monitoring and historical trends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
