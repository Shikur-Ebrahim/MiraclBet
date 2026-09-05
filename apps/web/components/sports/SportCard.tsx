import React from 'react';
import Link from 'next/link';
import { Card } from '../ui/Card';
import { ChevronRight } from 'lucide-react';

interface SportCardProps {
  name: string;
  icon: React.ReactNode;
  eventCount: number;
  href: string;
}

export function SportCard({ name, icon, eventCount, href }: SportCardProps) {
  return (
    <Link href={href} className="block group">
      <Card variant="hover" className="border border-brand p-4 flex items-center justify-between group-hover:border-gold/50">
        <div className="flex items-center gap-4">
          <div className="text-gold group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">{name}</h3>
            <p className="text-xs text-muted">{eventCount} Live Events</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted group-hover:text-gold transition-colors" />
      </Card>
    </Link>
  );
}
