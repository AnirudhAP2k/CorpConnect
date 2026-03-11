import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "@/app/globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: "CorpConnect",
  description: "A B2B Networking Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={poppins.variable}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" expand={true} richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
