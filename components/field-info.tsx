'use client';

import { HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface FieldInfoProps {
  label: string;
  info: string;
  required?: boolean;
}

/**
 * Etiqueta de campo con un icono de ayuda que muestra una explicación
 * al pasar el cursor o tocar. Sirve para guiar a cualquier usuario dentro
 * del proceso, con texto contextual según lo que se está registrando.
 */
export function FieldInfo({ label, info, required }: FieldInfoProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm">
        {label}{required && <span className="text-red-500"> *</span>}
      </Label>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Ayuda sobre ${label}`}
              className="text-gray-400 hover:text-[#00AEEF] transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-relaxed" side="top">
            {info}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
