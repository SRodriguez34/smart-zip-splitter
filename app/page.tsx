'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/file-uploader';
import { ProgressBar } from '@/components/progress-bar';
import { 
  Upload, 
  Zap, 
  Shield, 
  ArrowRight, 
  HardDrive,
  Settings,
  Download,
  CheckCircle,
  Star
} from 'lucide-react';
import type { FileInfo, UploadError, ProgressInfo } from '@/types/ui';

export default function HomePage() {
  const [, setSelectedFile] = useState<FileInfo | null>(null);
  const [progress, setProgress] = useState<ProgressInfo>({
    state: 'idle',
    percentage: 0,
    message: '',
  });

  const handleFileSelect = (fileInfo: FileInfo) => {
    setSelectedFile(fileInfo);
    // Simulate progress for demo
    setProgress({
      state: 'analyzing',
      percentage: 25,
      message: 'Analyzing your ZIP file...',
      estimatedTime: 30,
      strategy: fileInfo.strategy,
    });
  };

  const handleError = (error: UploadError) => {
    // eslint-disable-next-line no-console
    console.error('Upload error:', error);
    setProgress({ state: 'idle', percentage: 0, message: '' });
  };

  const scrollToUploader = () => {
    const uploaderElement = document.getElementById('file-uploader');
    uploaderElement?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/50 to-slate-100/50 dark:from-slate-900 dark:via-slate-900/50 dark:to-slate-800/50">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-accent/5" />
        
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="mx-auto max-w-4xl text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8 inline-flex items-center space-x-2 rounded-full bg-brand-primary-light px-4 py-2 text-sm font-medium text-brand-primary"
            >
              <Star className="h-4 w-4" />
              <span>100% Client-Side Processing</span>
            </motion.div>

            {/* Main Heading */}
            <h1 className="mb-8 text-5xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl">
              Split Large{' '}
              <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
                ZIP Files
              </span>{' '}
              Instantly
            </h1>

            {/* Description */}
            <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-300">
              Lightning fast, zero upload required, with smart Google Drive integration.
              Your files never leave your device unless you choose to share them.
            </p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col items-center space-y-4 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0"
            >
              <Button
                onClick={scrollToUploader}
                size="lg"
                className="group bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xl hover:shadow-2xl transition-all duration-200 text-lg px-8 py-6 h-auto"
              >
                Start Splitting Files
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-200 text-lg px-8 py-6 h-auto"
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl mb-4">
              Why Choose Smart ZIP Splitter?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Built for developers, by developers. Fast, secure, and intelligent.
            </p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-4">
                    <Zap className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Lightning Fast</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Process files instantly with client-side algorithms. No waiting for uploads or server processing. 
                    Split files in seconds, not minutes.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white mb-4">
                    <Shield className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Zero Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Your files never leave your device for small archives. Complete privacy and security 
                    with client-side processing. No servers, no data collection.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white mb-4">
                    <HardDrive className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Smart Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Seamless Google Drive integration for large files. Automatic cloud storage with 
                    shareable links. Best of both worlds: local processing and cloud sharing.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-slate-50/50 dark:bg-slate-900/50 py-20 sm:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Three simple steps to split your ZIP files efficiently
            </p>
          </motion.div>

          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 lg:grid-cols-3">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-center"
              >
                <div className="relative mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-blue-600 text-white shadow-lg mx-auto">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent text-white text-sm font-bold">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Drop your ZIP file
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Simply drag and drop your ZIP file or click to browse. 
                  Supports files up to 10GB with instant validation.
                </p>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-center"
              >
                <div className="relative mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg mx-auto">
                    <Settings className="h-8 w-8" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent text-white text-sm font-bold">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Choose fragment size
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Smart recommendations based on your file size. 
                  Customize split sizes or use our intelligent defaults.
                </p>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-center"
              >
                <div className="relative mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg mx-auto">
                    <Download className="h-8 w-8" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent text-white text-sm font-bold">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Download or share instantly
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Download split files directly or get shareable Google Drive links. 
                  Everything ready in seconds.
                </p>
              </motion.div>
            </div>

            {/* Process Flow Arrows */}
            <div className="hidden lg:block relative mt-12">
              <div className="absolute top-1/2 left-1/4 w-1/4 h-px bg-gradient-to-r from-brand-primary to-transparent" />
              <div className="absolute top-1/2 right-1/4 w-1/4 h-px bg-gradient-to-l from-brand-primary to-transparent" />
              <CheckCircle className="absolute top-1/2 left-1/3 transform -translate-y-1/2 -translate-x-1/2 h-4 w-4 text-brand-primary" />
              <CheckCircle className="absolute top-1/2 right-1/3 transform -translate-y-1/2 translate-x-1/2 h-4 w-4 text-brand-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* File Uploader Section */}
      <section id="file-uploader" className="py-20 sm:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-2xl text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl mb-4">
              Ready to Split Your Files?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Upload your ZIP file and experience the fastest splitting tool available
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto max-w-4xl space-y-8"
          >
            <FileUploader
              onFileSelect={handleFileSelect}
              onError={handleError}
              className="w-full"
            />
            
            <ProgressBar
              progress={progress}
              className="w-full"
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
