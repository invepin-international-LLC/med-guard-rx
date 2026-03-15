import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('es') ? 'es' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="flex items-center gap-3">
      <Globe className="w-5 h-5 text-muted-foreground" />
      <div className="flex gap-2">
        <button
          onClick={() => i18n.changeLanguage('en')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2',
            currentLang === 'en'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          English
        </button>
        <button
          onClick={() => i18n.changeLanguage('es')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2',
            currentLang === 'es'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          Español
        </button>
      </div>
    </div>
  );
}
