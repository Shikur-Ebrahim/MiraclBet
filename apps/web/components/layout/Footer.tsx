import React from 'react';
import Link from 'next/link';
import { Container } from '../ui/Container';
import { Facebook, Twitter, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-dark border-t border-brand pt-12 pb-8 mt-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gold rounded flex items-center justify-center text-dark font-black text-sm">M</div>
              <span className="font-bold text-lg tracking-tight text-white">MiraclBet</span>
            </div>
            <p className="text-sm text-muted mb-6">
              The premium sports betting experience. Live odds, fast payouts, and trusted by thousands.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted hover:text-white"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-muted hover:text-white"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="text-muted hover:text-white"><Instagram className="w-5 h-5" /></a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Sports</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/sports/football" className="hover:text-gold transition-colors">Football</Link></li>
              <li><Link href="/sports/basketball" className="hover:text-gold transition-colors">Basketball</Link></li>
              <li><Link href="/sports/tennis" className="hover:text-gold transition-colors">Tennis</Link></li>
              <li><Link href="/sports/cricket" className="hover:text-gold transition-colors">Cricket</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Help</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/faq" className="hover:text-gold transition-colors">FAQ</Link></li>
              <li><Link href="/support" className="hover:text-gold transition-colors">Support Center</Link></li>
              <li><Link href="/betting-rules" className="hover:text-gold transition-colors">Betting Rules</Link></li>
              <li><Link href="/responsible-gaming" className="hover:text-gold transition-colors">Responsible Gaming</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/terms" className="hover:text-gold transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="hover:text-gold transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-brand pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} MiraclBet. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="bg-surface px-3 py-1 rounded text-xs font-bold text-muted border border-brand">18+</div>
            <span className="text-xs text-muted">Please gamble responsibly.</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
