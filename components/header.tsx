/**
 * Header Component
 * Modern header with logo, navigation and theme toggle
 */
'use client';

import React from 'react';
import { Zap, Github, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:border-slate-800/50 dark:bg-slate-950/80 dark:supports-[backdrop-filter]:bg-slate-950/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Smart ZIP Splitter
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Split large ZIP files instantly
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a 
              href="#features" 
              className="text-sm font-medium text-slate-600 hover:text-brand-primary transition-colors dark:text-slate-300 dark:hover:text-brand-primary"
              aria-label="Navigate to features section"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              className="text-sm font-medium text-slate-600 hover:text-brand-primary transition-colors dark:text-slate-300 dark:hover:text-brand-primary"
              aria-label="Navigate to how it works section"
            >
              How it works
            </a>
            <a 
              href="#about" 
              className="text-sm font-medium text-slate-600 hover:text-brand-primary transition-colors dark:text-slate-300 dark:hover:text-brand-primary"
              aria-label="Navigate to about section"
            >
              About
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Social Links */}
            <div className="hidden sm:flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-slate-600 hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-primary"
                aria-label="Visit GitHub repository"
              >
                <Github className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-slate-600 hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-primary"
                aria-label="Follow on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </Button>
            </div>

            {/* CTA Button */}
            <Button 
              className="bg-brand-primary hover:bg-brand-primary-hover text-white shadow-lg hover:shadow-xl transition-all duration-200"
              aria-label="Start splitting files"
            >
              <span className="hidden sm:inline">Start Splitting</span>
              <span className="sm:hidden">Start</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}