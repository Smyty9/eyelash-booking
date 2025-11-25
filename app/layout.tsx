import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Система записи на наращивание ресниц",
  description: "Онлайн запись к мастеру по наращиванию ресниц",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

