'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Languages, Check } from 'lucide-react';
import { useI18n, languages } from '@/components/providers/I18nProvider';

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Languages className="h-5 w-5" />
          <span className="absolute -bottom-0.5 -right-0.5 text-xs font-bold">
            {locale.split('-')[0].toUpperCase().substring(0, 2)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="end">
        <div className="space-y-1">
          <h4 className="font-medium text-sm mb-3">{t('language.title')}</h4>
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => {
                setLocale(lang.id);
                setOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm
                transition-colors hover:bg-gray-100
                ${locale === lang.id ? 'bg-gray-100' : ''}
              `}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.name}</span>
              {locale === lang.id && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
