import type { Metadata } from "next";
import "./globals.css";
import CommandPalette from "@/components/CommandPalette";
import AuthGuard from "@/components/AuthGuard";
import Toaster from "@/components/Toaster";

export const metadata: Metadata = {
  title: "NoteVault",
  description: "Collaborative Workspace Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
         <AuthGuard>
           {children}
           <CommandPalette />
         </AuthGuard>
         <Toaster />
      </body>
    </html>
  );
}
