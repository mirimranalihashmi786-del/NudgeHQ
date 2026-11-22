import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/lib/auth';
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "App",
  description: "Generated preview",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-nexen-component="nx_app_layout" lang="en">
      <body className="font-sans"><AuthProvider><AppShell>{children}</AppShell></AuthProvider></body>
    </html>
  );
}
