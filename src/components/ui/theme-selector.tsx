'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Palette, Check } from 'lucide-react';
import { useTheme, themes } from '@/components/providers/ThemeProvider';
import { useI18n } from '@/components/providers/I18nProvider';

export function ThemeSelector() {
  const { currentTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Palette className="h-5 w-5" />
          <span 
            className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: currentTheme.color }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">{t('theme.title')}</h4>
          <div className="grid grid-cols-4 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  setTheme(theme.id);
                  setOpen(false);
                }}
                className={`
                  relative w-12 h-12 rounded-lg border-2 transition-all
                  hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${currentTheme.id === theme.id ? 'border-gray-900 ring-2 ring-gray-300' : 'border-gray-200'}
                `}
                style={{ backgroundColor: theme.color }}
                title={theme.name}
              >
                {currentTheme.id === theme.id && (
                  <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
