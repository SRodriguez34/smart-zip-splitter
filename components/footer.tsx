/**
 * Footer Component
 * Minimalist footer with useful links and information
 */
'use client';

import React from 'react';
import { Zap, Heart, Shield, Github, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200/50 bg-slate-50/50 dark:border-slate-800/50 dark:bg-slate-950/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">
                Smart ZIP Splitter
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Split large ZIP files instantly with client-side processing. 
              Your files never leave your device.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Features
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Lightning Fast Processing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Zero Upload Required
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Smart Google Drive Integration
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Client-Side Processing
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Support
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  API Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Status Page
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-primary transition-colors">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 flex flex-col items-center justify-between space-y-4 border-t border-slate-200/50 pt-8 dark:border-slate-800/50 md:flex-row md:space-y-0">
          {/* Copyright */}
          <div className="flex items-center space-x-1 text-sm text-slate-600 dark:text-slate-400">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-red-500" />
            <span>for developers.</span>
            <span className="ml-4">© 2024 Smart ZIP Splitter.</span>
          </div>

          {/* Social & Security */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-sm text-slate-600 dark:text-slate-400">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Client-side secure</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <a
                href="#"
                className="text-slate-600 hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-primary transition-colors"
                aria-label="Visit GitHub repository"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="text-slate-600 hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-primary transition-colors"
                aria-label="Follow on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}