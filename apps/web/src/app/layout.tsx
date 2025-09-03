import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from '../../contexts/AuthContext';
import { CartProvider } from '../../contexts/CartContext';
import { MealCartProvider } from '../../contexts/MealCartContext';
import MobileBottomNav from '../../components/MobileBottomNav';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap'
});

export const metadata: Metadata = {
  title: "ChefsCart - AI-Powered Meal Planning & Grocery Shopping",
  description: "Create personalized meal plans and shop for ingredients with one click. Get custom recipes based on your dietary preferences and cooking skills.",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <CartProvider>
            <MealCartProvider>
              {children}
              <MobileBottomNav />
            </MealCartProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
