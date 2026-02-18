import { useI18n } from '@/lib/i18nContext';
import type { Lang } from '@/lib/i18n';

const LANGS: Lang[] = ['uz', 'en', 'ru'];
const LABELS: Record<Lang, string> = { uz: 'UZ', en: 'EN', ru: 'RU' };

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-secondary border border-border">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
            lang === l
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
