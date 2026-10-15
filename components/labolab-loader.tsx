'use client';

import React from 'react';
import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LaboLabLoaderProps {
  message?: string;
  submessage?: string;
  fullscreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LaboLabLoader({
  message = 'Sincronizando estación de trabajo...',
  submessage = 'LaboLab LIMS · Sistema de Gestión de Laboratorio',
  fullscreen = false,
  size = 'md',
  className,
}: LaboLabLoaderProps) {
  const sizeMap = {
    sm: {
      badge: 'w-14 h-14 rounded-2xl',
      icon: 'w-7 h-7',
      title: 'text-lg tracking-wider',
      ripple: 'w-16 h-16 rounded-2xl',
      bar: 'w-28',
    },
    md: {
      badge: 'w-20 h-20 md:w-22 md:h-22 rounded-3xl',
      icon: 'w-10 h-10 md:w-11 md:h-11',
      title: 'text-2xl md:text-3xl tracking-[0.2em]',
      ripple: 'w-24 h-24 md:w-26 md:h-26 rounded-3xl',
      bar: 'w-44',
    },
    lg: {
      badge: 'w-24 h-24 md:w-28 md:h-28 rounded-3xl',
      icon: 'w-12 h-12 md:w-14 md:h-14',
      title: 'text-3xl md:text-4xl tracking-[0.25em]',
      ripple: 'w-32 h-32 md:w-36 md:h-36 rounded-3xl',
      bar: 'w-56',
    },
  }[size];

  const content = (
    <div className={cn('flex flex-col items-center justify-center select-none', className)}>
      {/* Palpitador Central Badge with Ripple Waves */}
      <div className="relative flex items-center justify-center my-2">
        {/* Radar / Heartbeat outer ripple waves */}
        <div
          className={cn(
            'absolute bg-[#00AEEF]/25 animate-labo-ripple pointer-events-none',
            sizeMap.ripple
          )}
        />
        <div
          className={cn(
            'absolute bg-[#005F9E]/20 animate-labo-ripple [animation-delay:450ms] pointer-events-none',
            sizeMap.ripple
          )}
        />

        {/* Central Pulsating Emblem */}
        <div
          className={cn(
            'relative bg-gradient-to-br from-[#00AEEF] via-[#008ac9] to-[#005F9E] flex items-center justify-center shadow-xl shadow-[#00AEEF]/30 animate-labo-heartbeat border-2 border-white/50 dark:border-cyan-400/30',
            sizeMap.badge
          )}
        >
          {/* Decorative Lab Micro-bubbles */}
          <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-white/70 animate-ping [animation-duration:2.8s]" />
          <span className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />

          {/* Core Lab Flask Icon */}
          <FlaskConical className={cn('text-white drop-shadow-md', sizeMap.icon)} />
        </div>
      </div>

      {/* Brand Name */}
      <div className="mt-5 text-center">
        <h2
          className={cn(
            'font-display font-black text-[#005F9E] dark:text-[#00AEEF] transition-colors',
            sizeMap.title
          )}
        >
          LABOLAB
        </h2>

        {/* Dynamic glowing heartbeat bar */}
        <div
          className={cn(
            'h-1 rounded-full animate-labo-shimmer mx-auto my-3 bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-inner',
            sizeMap.bar
          )}
        />

        {/* Status Message */}
        {message && (
          <p className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 tracking-wide animate-pulse">
            {message}
          </p>
        )}

        {/* Submessage */}
        {submessage && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {submessage}
          </p>
        )}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-[#0c141d]/95 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}
