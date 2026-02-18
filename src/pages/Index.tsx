import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18nContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Sparkles, ShieldCheck, Brain, Zap, ArrowRight, Upload,
  TrendingUp, Target, Layers3, ChevronRight, Star, Database, Eye, Quote,
  Check, ChevronLeft, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/authContext';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import LanguageToggle from '@/components/dashboard/LanguageToggle';
import { Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import demoDashboard from '@/assets/demo-dashboard.jpg';
import demoCleaning from '@/assets/demo-cleaning.jpg';
import demoAiAnalysis from '@/assets/demo-ai-analysis.jpg';

const featureIcons = [Database, BarChart3, Brain, Layers3];
const featureColors = [
  { color: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
  { color: 'from-accent/20 to-accent/5', iconColor: 'text-accent' },
  { color: 'from-chart-3/20 to-chart-3/5', iconColor: 'text-chart-3' },
  { color: 'from-chart-4/20 to-chart-4/5', iconColor: 'text-chart-4' },
];

const stepIcons = [Upload, Sparkles, TrendingUp, Target];

const demoSlides = [
  { img: demoDashboard, label: 'Dashboard Studio', desc: 'KPI, grafik va jadvallar bilan professional dashboard' },
  { img: demoCleaning, label: 'Data Cleaning', desc: "Ma'lumotlarni tozalash va sifat baholash" },
  { img: demoAiAnalysis, label: 'AI Analysis', desc: 'Sun\'iy intellekt tahlili va bashorat' },
];

const testimonials = [
  { name: 'Aziza Karimova', role: 'Data Analyst, FinTech Solutions', text: "Intelligence Studio bizning ish jarayonimizni tubdan o'zgartirdi. Ma'lumotlarni tozalash va tahlil qilish endi bir necha daqiqada amalga oshadi.", avatar: 'AK', rating: 5 },
  { name: 'Jasur Toshmatov', role: 'CEO, DataDrive.uz', text: "AI tahlil va 3D vizualizatsiya imkoniyatlari juda kuchli. Mijozlarimizga professional hisobotlar taqdim etish osonlashdi.", avatar: 'JT', rating: 5 },
  { name: 'Nilufar Abdullayeva', role: 'Marketing Director, E-Commerce Hub', text: "CSV fayllarni yuklash va avtomatik dashboard yaratish — bu haqiqatan ham sehrli. Vaqtni 10 barobar tejaydi.", avatar: 'NA', rating: 5 },
];

// --- Components ---
const DemoCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(p => (p + 1) % demoSlides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-8 sm:py-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-primary/10"
        >
          <div className="absolute top-0 left-0 right-0 h-10 bg-background/80 backdrop-blur-sm flex items-center gap-2 px-4 z-20">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
            <span className="text-[10px] text-muted-foreground ml-2 font-mono">{demoSlides[current].label}</span>
          </div>
          <div className="relative aspect-video pt-10 bg-background/50">
            <AnimatePresence mode="wait">
              <motion.img key={current} src={demoSlides[current].img} alt={demoSlides[current].label}
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }} className="w-full h-full object-cover absolute inset-0 pt-10" loading="lazy" />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-10 pointer-events-none" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-6 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{demoSlides[current].label}</p>
              <p className="text-xs text-muted-foreground">{demoSlides[current].desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrent(p => (p - 1 + demoSlides.length) % demoSlides.length)} className="w-8 h-8 rounded-full glass-card flex items-center justify-center hover:border-primary/40 transition-colors">
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <div className="flex gap-1.5">
                {demoSlides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-primary w-5' : 'bg-muted-foreground/30'}`} />
                ))}
              </div>
              <button onClick={() => setCurrent(p => (p + 1) % demoSlides.length)} className="w-8 h-8 rounded-full glass-card flex items-center justify-center hover:border-primary/40 transition-colors">
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && user) {
      navigate('/cleaning', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  const featureKeys = [
    { titleKey: 'features.dataCleaningCenter', descKey: 'features.dataCleaningDesc' },
    { titleKey: 'features.dashboardStudio', descKey: 'features.dashboardStudioDesc' },
    { titleKey: 'features.aiAnalysis', descKey: 'features.aiAnalysisDesc' },
    { titleKey: 'features.visualization', descKey: 'features.visualizationDesc' },
  ];

  const statsData = [
    { value: '100K+', labelKey: 'stats.rowsSupported' },
    { value: '5+', labelKey: 'stats.exportFormats' },
    { value: 'AI', labelKey: 'stats.poweredInsights' },
    { value: '3D', labelKey: 'stats.visualizations' },
  ];

  const stepsData = [
    { num: '01', titleKey: 'howItWorks.upload', descKey: 'howItWorks.uploadDesc' },
    { num: '02', titleKey: 'howItWorks.clean', descKey: 'howItWorks.cleanDesc' },
    { num: '03', titleKey: 'howItWorks.analyze', descKey: 'howItWorks.analyzeDesc' },
    { num: '04', titleKey: 'howItWorks.export', descKey: 'howItWorks.exportDesc' },
  ];

  const pricingPlans = [
    {
      nameKey: 'pricing.free', priceVal: '0', periodKey: 'pricing.freePeriod', descKey: 'pricing.freeDesc',
      featureKeys: ['pricing.freeFeature1', 'pricing.freeFeature2', 'pricing.freeFeature3', 'pricing.freeFeature4', 'pricing.freeFeature5'],
      ctaKey: 'pricing.freeCta', popular: false,
    },
    {
      nameKey: 'pricing.pro', priceVal: '29', periodKey: 'pricing.proPeriod', descKey: 'pricing.proDesc',
      featureKeys: ['pricing.proFeature1', 'pricing.proFeature2', 'pricing.proFeature3', 'pricing.proFeature4', 'pricing.proFeature5', 'pricing.proFeature6'],
      ctaKey: 'pricing.proCta', popular: true,
    },
    {
      nameKey: 'pricing.enterprise', priceVal: t('pricing.enterprisePrice'), periodKey: '', descKey: 'pricing.enterpriseDesc',
      featureKeys: ['pricing.enterpriseFeature1', 'pricing.enterpriseFeature2', 'pricing.enterpriseFeature3', 'pricing.enterpriseFeature4', 'pricing.enterpriseFeature5', 'pricing.enterpriseFeature6'],
      ctaKey: 'pricing.enterpriseCta', popular: false,
    },
  ];

  const faqItems = [
    { qKey: 'faq.q1', aKey: 'faq.a1' },
    { qKey: 'faq.q2', aKey: 'faq.a2' },
    { qKey: 'faq.q3', aKey: 'faq.a3' },
    { qKey: 'faq.q4', aKey: 'faq.a4' },
    { qKey: 'faq.q5', aKey: 'faq.a5' },
    { qKey: 'faq.q6', aKey: 'faq.a6' },
  ];

  return (
    <div className="min-h-screen bg-mesh overflow-x-hidden">
      {/* Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-border/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">
              <span className="text-gradient">Intelligence</span> Studio
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-sm text-muted-foreground hidden sm:inline-flex">
              {t('landing.signin')}
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground text-sm font-semibold px-5 glow-primary">
              {t('landing.cta.start')} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative pt-16 sm:pt-24 pb-20 sm:pb-32 px-4 sm:px-6">
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-accent/8 blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8">
              <Zap className="w-3.5 h-3.5" /> {t('landing.badge')} <Star className="w-3 h-3" />
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              {t('landing.hero.title1')}{' '}<span className="text-gradient">{t('landing.hero.title2')}</span>{' '}{t('landing.hero.title3')}
            </h1>
            <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button size="lg" onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground font-semibold h-13 px-8 text-base glow-primary hover:opacity-90 transition-all">
                <Sparkles className="w-5 h-5 mr-2" /> {t('landing.cta.start')}
              </Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="h-13 px-8 text-base border-border/50">
                <Eye className="w-5 h-5 mr-2" /> {t('landing.cta.details')}
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            {statsData.map((s, i) => (
              <motion.div key={s.labelKey} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }} className="glass-card p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-gradient data-font">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{t(s.labelKey)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Demo Carousel */}
      <DemoCarousel />

      {/* How it works */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t('howItWorks.title1')} <span className="text-gradient">{t('howItWorks.title2')}</span></h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{t('howItWorks.subtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stepsData.map((step, i) => {
              const StepIcon = stepIcons[i];
              return (
                <motion.div key={step.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-card p-6 relative group hover:border-primary/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-bold text-primary/20 data-font">{step.num}</span>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><StepIcon className="w-5 h-5 text-primary" /></div>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{t(step.titleKey)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
                  {i < 3 && <ChevronRight className="w-5 h-5 text-border absolute -right-3 top-1/2 -translate-y-1/2 hidden lg:block" />}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
              <ShieldCheck className="w-3 h-3" /> {t('features.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t('features.title1')} <span className="text-gradient">{t('features.title2')}</span> {t('features.title3')}</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{t('features.subtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {featureKeys.map((f, i) => {
              const Icon = featureIcons[i];
              const colors = featureColors[i];
              return (
                <motion.div key={f.titleKey} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-card p-6 sm:p-8 group hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${colors.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4"><Icon className={`w-6 h-6 ${colors.iconColor}`} /></div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{t(f.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
              <Zap className="w-3 h-3" /> {t('pricing.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t('pricing.title1')} <span className="text-gradient">{t('pricing.title2')}</span> {t('pricing.title3')}</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{t('pricing.subtitle')}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.nameKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className={`glass-card p-6 sm:p-8 relative transition-all duration-300 ${plan.popular ? 'border-primary/50 scale-[1.02] shadow-lg shadow-primary/10' : 'hover:border-primary/20'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                    {t('pricing.popular')}
                  </div>
                )}
                <h3 className="text-lg font-bold text-foreground mb-1">{t(plan.nameKey)}</h3>
                <p className="text-xs text-muted-foreground mb-4">{t(plan.descKey)}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  {plan.priceVal !== t('pricing.enterprisePrice') && <span className="text-xs text-muted-foreground">$</span>}
                  <span className="text-4xl font-bold text-foreground data-font">{plan.priceVal}</span>
                  {plan.periodKey && <span className="text-sm text-muted-foreground">{t(plan.periodKey)}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.featureKeys.map(fk => (
                    <li key={fk} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {t(fk)}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate('/auth')}
                  className={`w-full ${plan.popular ? 'gradient-primary text-primary-foreground glow-primary' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {t(plan.ctaKey)}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-chart-3/10 border border-chart-3/20 text-chart-3 text-xs font-medium mb-4">
              <Quote className="w-3 h-3" /> {t('testimonials.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t('testimonials.title1')} <span className="text-gradient">{t('testimonials.title2')}</span></h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{t('testimonials.subtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map((tm, i) => (
              <motion.div key={tm.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="glass-card p-6 relative group hover:border-primary/20 transition-all duration-300">
                <Quote className="w-8 h-8 text-primary/10 absolute top-4 right-4" />
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: tm.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">"{tm.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{tm.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tm.name}</p>
                    <p className="text-xs text-muted-foreground">{tm.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/3 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
              <HelpCircle className="w-3 h-3" /> {t('faq.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t('faq.title1')} <span className="text-gradient">{t('faq.title2')}</span> {t('faq.title3')}</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{t('faq.subtitle')}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="glass-card border border-border/30 rounded-xl px-6 overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-primary transition-colors py-5 hover:no-underline">
                    {t(item.qKey)}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                    {t(item.aKey)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center glass-card p-10 sm:p-14 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">{t('cta.title1')} <span className="text-gradient">{t('cta.title2')}</span></h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t('cta.subtitle')}</p>
            <Button size="lg" onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground font-semibold h-13 px-10 text-base glow-primary hover:opacity-90 transition-all">
              {t('cta.button')} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center"><BarChart3 className="w-3.5 h-3.5 text-primary-foreground" /></div>
            <span className="text-sm font-bold text-foreground"><span className="text-gradient">Intelligence</span> Studio</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Intelligence Studio. {t('footer.copyright')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
