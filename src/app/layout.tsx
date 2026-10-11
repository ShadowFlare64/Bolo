import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Bolo — A little Gujarati. A closer connection.", description: "Start speaking Gujarati with small, thoughtful lessons for beginners and heritage learners." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
