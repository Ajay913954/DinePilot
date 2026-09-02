import React from 'react';
import { Utensils } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <Utensils className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">DinePilot</span>
          </div>

          <p className="text-slate-500 text-xs sm:text-sm text-center md:text-left">
            © {new Date().getFullYear()} DinePilot Inc. Your Restaurant's AI Business Partner. All rights reserved.
          </p>

          <div className="flex items-center gap-6 text-slate-400 text-xs sm:text-sm">
            <a href="#" className="hover:text-amber-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Contact Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
