import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, Sparkles, ShieldCheck, Brain, Zap, ArrowRight, Upload,
  TrendingUp, Target, Layers3, ChevronRight, Star, Database, Eye, Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/authContext';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import LanguageToggle from '@/components/dashboard/LanguageToggle';
import { Loader2 } from 'lucide-react';
import demoDashboard from '@/assets/demo-dashboard.jpg';

const features = [
  {
    icon: Database,
    title: 'Data Cleaning Center',
    desc: 'Automated profiling, outlier detection, smart imputation, and quality scoring for CSV, Excel & JSON files.',
    color: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Studio',
    desc: 'Auto-detect business context and generate professional dashboards with KPIs, charts & insights.',
    color: 'from-accent/20 to-accent/5',
    iconColor: 'text-accent',
  },
  {
    icon: Brain,
    title: 'AI Strategic Analysis',
    desc: 'AI-powered summaries, anomaly detection, predictive forecasting and natural language queries.',
    color: 'from-chart-3/20 to-chart-3/5',
    iconColor: 'text-chart-3',
  },
  {
    icon: Layers3,
    title: '2D / 3D / 4D Visualization',
    desc: 'Interactive multi-dimensional visualizations with rotatable 3D charts and animated timelines.',
    color: 'from-chart-4/20 to-chart-4/5',
    iconColor: 'text-chart-4',
  },
];

const stats = [
  { value: '100K+', label: 'Rows Supported' },
  { value: '5+', label: 'Export Formats' },
  { value: 'AI', label: 'Powered Insights' },
  { value: '3D', label: 'Visualizations' },
];

const steps = [
  { num: '01', title: 'Upload', desc: 'Drop your raw CSV, Excel or JSON file', icon: Upload },
  { num: '02', title: 'Clean', desc: 'Auto-profile, detect & fix data issues', icon: Sparkles },
  { num: '03', title: 'Analyze', desc: 'Generate dashboards with AI insights', icon: TrendingUp },
  { num: '04', title: 'Export', desc: 'Download or share your results', icon: Target },
];

const testimonials = [
  {
    name: 'Aziza Karimova',
    role: 'Data Analyst, FinTech Solutions',
    text: "Intelligence Studio bizning ish jarayonimizni tubdan o'zgartirdi. Ma'lumotlarni tozalash va tahlil qilish endi bir necha daqiqada amalga oshadi.",
    avatar: 'AK',
    rating: 5,
  },
  {
    name: 'Jasur Toshmatov',
    role: 'CEO, DataDrive.uz',
    text: "AI tahlil va 3D vizualizatsiya imkoniyatlari juda kuchli. Mijozlarimizga professional hisobotlar taqdim etish osonlashdi.",
    avatar: 'JT',
    rating: 5,
  },
  {
    name: 'Nilufar Abdullayeva',
    role: 'Marketing Director, E-Commerce Hub',
    text: "CSV fayllarni yuklash va avtomatik dashboard yaratish — bu haqiqatan ham sehrli. Vaqtni 10 barobar tejaydi.",
    avatar: 'NA',
    rating: 5,
  },
];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
              Kirish
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground text-sm font-semibold px-5 glow-primary">
              Boshlash <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 pb-20 sm:pb-32 px-4 sm:px-6">
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-accent/8 blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8">
              <Zap className="w-3.5 h-3.5" />
              Professional Data Analytics Platform
              <Star className="w-3 h-3" />
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              Ma'lumotlaringizni{' '}
              <span className="text-gradient">aqlli</span>{' '}
              tahlil qiling
            </h1>

            <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              CSV, Excel va JSON fayllarni yuklang — biz avtomatik tozalash, profiling va professional dashboardlar yaratamiz
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button size="lg" onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground font-semibold h-13 px-8 text-base glow-primary hover:opacity-90 transition-all">
                <Sparkles className="w-5 h-5 mr-2" /> Bepul boshlash
              </Button>
              <Button variant="outline" size="lg" onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }} className="h-13 px-8 text-base border-border/50">
                <Eye className="w-5 h-5 mr-2" /> Batafsil ko'rish
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="glass-card p-4 text-center"
              >
                <p className="text-2xl sm:text-3xl font-bold text-gradient data-font">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Demo Screenshot */}
      <section className="py-8 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-primary/10 group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-10 bg-background/80 backdrop-blur-sm flex items-center gap-2 px-4 z-20">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="text-[10px] text-muted-foreground ml-2 font-mono">Intelligence Studio — Dashboard</span>
            </div>
            <motion.img
              src={demoDashboard}
              alt="Intelligence Studio dashboard demo showing charts, KPIs and data tables"
              className="w-full pt-10 transition-transform duration-700 group-hover:scale-[1.02]"
              loading="lazy"
            />
            <div className="absolute bottom-6 left-0 right-0 z-20 text-center">
              <Button size="sm" onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground font-semibold glow-primary">
                <Sparkles className="w-4 h-4 mr-2" /> Hoziroq sinab ko'ring
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Qanday <span className="text-gradient">ishlaydi?</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              4 oddiy qadamda ma'lumotlaringizni professional dashboardga aylantiring
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 relative group hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-primary/20 data-font">{step.num}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < 3 && (
                  <ChevronRight className="w-5 h-5 text-border absolute -right-3 top-1/2 -translate-y-1/2 hidden lg:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
              <ShieldCheck className="w-3 h-3" />
              Kuchli imkoniyatlar
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Professional <span className="text-gradient">Analytics</span> Platform
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Ma'lumotlarni tozalash, vizualizatsiya va AI tahlilning barchasini bir joyda
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 sm:p-8 group hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-chart-3/10 border border-chart-3/20 text-chart-3 text-xs font-medium mb-4">
              <Quote className="w-3 h-3" />
              Mijozlar fikrlari
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Foydalanuvchilar <span className="text-gradient">nima deydi?</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Minglab mutaxassislar Intelligence Studio'dan foydalanmoqda
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="glass-card p-6 relative group hover:border-primary/20 transition-all duration-300"
              >
                <Quote className="w-8 h-8 text-primary/10 absolute top-4 right-4" />
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center glass-card p-10 sm:p-14 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">
              Hoziroq <span className="text-gradient">boshlang</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Ro'yxatdan o'ting va bir necha daqiqada ma'lumotlaringizni professional darajada tahlil qiling
            </p>
            <Button size="lg" onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground font-semibold h-13 px-10 text-base glow-primary hover:opacity-90 transition-all">
              Bepul ro'yxatdan o'tish <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">
              <span className="text-gradient">Intelligence</span> Studio
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Intelligence Studio. Professional Data Analytics.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
