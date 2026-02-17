import { useI18n } from '@/lib/i18nContext';
import type { Lang } from '@/lib/i18n';

const LANG_ORDER: Lang[] = ['uz', 'en', 'ru'];

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const cycleLang = () => {
    const idx = LANG_ORDER.indexOf(lang);
    setLang(LANG_ORDER[(idx + 1) % LANG_ORDER.length]);
  };
  return (
    <button
      onClick={cycleLang}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium border border-border hover:bg-muted transition-colors"
    >
      <span className={lang === 'uz' ? 'opacity-100 font-semibold' : 'opacity-50'}>UZ</span>
      <span className="text-muted-foreground">/</span>
      <span className={lang === 'en' ? 'opacity-100 font-semibold' : 'opacity-50'}>EN</span>
      <span className="text-muted-foreground">/</span>
      <span className={lang === 'ru' ? 'opacity-100 font-semibold' : 'opacity-50'}>RUS</span>
    </button>
  );
}
