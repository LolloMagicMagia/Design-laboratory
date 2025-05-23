import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Chat App",
  description: "Applicazione di messaggistica con Spring Boot e Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={`${inter.className} min-h-screen bg-gray-100`}>
        {children}
      </body>
    </html>
  );
}