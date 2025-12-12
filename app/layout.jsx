import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Cheapshop",
  description: "Cheapshop",
  applicationName: "Cheapshop",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo3.png", type: "image/png" }
    ],
    apple: [{ url: "/logo3.png", type: "image/png" }]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
