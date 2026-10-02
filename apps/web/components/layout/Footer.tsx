import React from 'react';
import { Container } from '../ui/Container';
import { Facebook, Twitter, Instagram, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#0A0E1A] border-t border-[#1E293B] pt-8 pb-6 mt-8">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 mb-8">
          
          {/* Brand & Social - full width on mobile */}
          <div className="col-span-2 md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-black tracking-tight leading-none">
                <span style={{ color: '#F5F7F6' }}>Miracl</span><span style={{ color: '#19E66B' }}>Bet</span>
              </span>
            </div>
            <p className="text-[13px] text-gray-400 mb-3 max-w-sm">
              The premium sports betting experience. Live odds, fast payouts, and trusted by thousands.
            </p>
            <div className="flex items-center gap-2 text-[13px] text-[#19E66B] mb-5 font-semibold">
              <Phone className="w-4 h-4" />
              <span>+1 (438) 905-1590</span>
            </div>
            <div className="flex gap-4 justify-center md:justify-start">
              <span className="text-gray-400 hover:text-white p-2 bg-[#1A2235] rounded-full cursor-pointer"><Twitter className="w-4 h-4" /></span>
              <span className="text-gray-400 hover:text-white p-2 bg-[#1A2235] rounded-full cursor-pointer"><Facebook className="w-4 h-4" /></span>
              <span className="text-gray-400 hover:text-white p-2 bg-[#1A2235] rounded-full cursor-pointer"><Instagram className="w-4 h-4" /></span>
            </div>
          </div>
          
          {/* Sports */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Sports</h4>
            <ul className="space-y-2 text-[13px] text-gray-400">
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Football</span></li>
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Basketball</span></li>
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Tennis</span></li>
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Cricket</span></li>
            </ul>
          </div>
          
          {/* Help */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Help</h4>
            <ul className="space-y-2 text-[13px] text-gray-400">
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">FAQ</span></li>
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Support Center</span></li>
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Betting Rules</span></li>
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Responsible Gaming</span></li>
            </ul>
          </div>
          
          {/* Legal */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-semibold text-white mb-3 text-sm">Legal</h4>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-gray-400 md:block md:space-y-2">
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-[#19E66B] transition-colors cursor-pointer">Cookie Policy</span></li>
            </ul>
          </div>

        </div>
        
        <div className="border-t border-[#1E293B] pt-6 flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#1A2235] px-2 py-1 rounded text-[11px] font-bold text-gray-400 border border-[#1E293B]">18+</div>
            <span className="text-[12px] text-gray-400">Please gamble responsibly.</span>
          </div>
          <p className="text-[12px] text-gray-500">
            &copy; {new Date().getFullYear()} MiraclBet. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
