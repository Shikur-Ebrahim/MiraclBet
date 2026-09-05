'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-8">
            {/* Logo — bold text like Melbet */}
            <Link href="/" className="flex items-center select-none">
              <span className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                <span style={{ color: '#F5F7F6' }}>Miracl</span><span style={{ color: '#19E66B' }}>Bet</span>
              </span>
            </Link>
            
            {/* Desktop Navigation */}
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
          
          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary">Join Now</Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button className="text-white p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-brand absolute w-full left-0 top-[100%] shadow-xl">
          <div className="px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-lg font-medium text-white p-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-brand my-2" />
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="secondary" className="w-full py-3 text-lg">Log In</Button>
            </Link>
            <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full py-3 text-lg bg-primary text-dark border-none">Join Now</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
