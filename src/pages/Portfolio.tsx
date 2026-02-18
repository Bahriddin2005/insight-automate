import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Brain, DollarSign, Rocket, Briefcase, Github, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/authContext';
import { CATEGORIES, CASE_STUDIES, type CaseCategory } from '@/lib/caseStudies';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import LanguageToggle from '@/components/dashboard/LanguageToggle';
import { useI18n } from '@/lib/i18nContext';

const ICON_MAP: Record<string, React.ReactNode> = {
  BarChart3: <BarChart3 className="w-5 h-5" />,
  Brain: <Brain className="w-5 h-5" />,
  DollarSign: <DollarSign className="w-5 h-5" />,
  Rocket: <Rocket className="w-5 h-5" />,
};

export default function Portfolio() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<CaseCategory | 'all'>('all');

  const filtered = activeCategory === 'all'
    ? CASE_STUDIES
    : CASE_STUDIES.filter(c => c.category === activeCategory);

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{t('portfolio.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('portfolio.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-xs text-muted-foreground">
              <BarChart3 className="w-3 h-3 mr-1" /> {t('portfolio.backToStudio')}
            </Button>
            <ThemeToggle />
            <LanguageToggle />
            {user && (
              <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-muted-foreground">
                {t('portfolio.signOut')}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-gradient">{t('portfolio.heroTitle1')}</span>{' '}
            <span className="text-foreground">{t('portfolio.heroTitle2')}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('portfolio.heroDesc')}
          </p>
          <div className="flex items-center justify-center gap-4 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-primary" /> {t('portfolio.product')}</span>
            <span className="flex items-center gap-1.5"><Brain className="w-4 h-4" style={{ color: 'hsl(var(--chart-4))' }} /> AI/ML</span>
            <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" style={{ color: 'hsl(var(--chart-3))' }} /> Finance</span>
            <span className="flex items-center gap-1.5"><Rocket className="w-4 h-4 text-accent" /> Growth</span>
          </div>
        </motion.div>

        {/* Category Filter */}
        <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('all')}
            className="rounded-full"
          >
            {t('portfolio.allProjects')}
          </Button>
          {(Object.entries(CATEGORIES) as [CaseCategory, typeof CATEGORIES[CaseCategory]][]).map(([key, cat]) => (
            <Button
              key={key}
              variant={activeCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(key)}
              className="rounded-full"
            >
              {ICON_MAP[cat.icon]} <span className="ml-1.5">{cat.label}</span>
            </Button>
          ))}
        </div>

        {/* Project Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((study, i) => {
            const catInfo = CATEGORIES[study.category];
            return (
              <motion.div
                key={study.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 group cursor-pointer"
                onClick={() => navigate(`/portfolio/${study.id}`)}
              >
                <div className="p-6">
                  {/* Category badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                      {catInfo.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{study.duration}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{study.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{study.subtitle}</p>

                  {/* Company & Role */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {study.company}</span>
                    <span>{study.role}</span>
                  </div>

                  {/* KPI Preview */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {study.kpis.slice(0, 3).map(kpi => (
                      <div key={kpi.name} className="bg-muted/30 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground truncate">{kpi.name}</p>
                        <p className="text-sm font-bold text-foreground">{kpi.value}</p>
                        <p className={`text-[10px] font-medium ${kpi.trend === 'up' ? 'text-accent' : 'text-destructive'}`}>{kpi.change}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {study.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-medium">{tag}</span>
                    ))}
                  </div>

                  {/* Tools */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {study.tools.slice(0, 4).map(tool => (
                        <span key={tool} className="px-1.5 py-0.5 rounded bg-muted/50">{tool}</span>
                      ))}
                      {study.tools.length > 4 && <span>+{study.tools.length - 4}</span>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
