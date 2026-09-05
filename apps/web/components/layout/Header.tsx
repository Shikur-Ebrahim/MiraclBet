'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { Menu, X } from 'lucide-react';
import { clsx } from 'clsx';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/sports', label: 'Sports' },
    { href: '/bets', label: 'My Bets' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-dark/95 backdrop-blur border-b border-brand">
      <Container>
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center">
                <Image 
                  src="/logo.png" 
                  alt="MiraclBet Logo" 
                  width={140} 
                  height={40} 
                  className="object-contain max-h-10" 
                  priority 
                />
              </div>
            </Link>
            <nav className="hidden md:flex gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'text-sm font-medium transition-colors hover:text-white',
                    pathname === link.href ? 'text-primary' : 'text-muted'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary">Join Now</Button>
            </Link>
          </div>

          <div className="md:hidden">
            <button className="text-white p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-brand">
          <div className="px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium text-white p-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-brand my-2" />
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="secondary" className="w-full">Log In</Button>
            </Link>
            <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full bg-primary text-dark border-none">Join Now</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
