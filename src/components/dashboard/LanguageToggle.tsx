import { useI18n } from '@/lib/i18nContext';

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === 'uz' ? 'en' : 'uz')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium border border-border hover:bg-muted transition-colors"
    >
      <span className={lang === 'uz' ? 'opacity-100' : 'opacity-50'}>UZ</span>
      <span className="text-muted-foreground">/</span>
      <span className={lang === 'en' ? 'opacity-100' : 'opacity-50'}>EN</span>
    </button>
  );
}
