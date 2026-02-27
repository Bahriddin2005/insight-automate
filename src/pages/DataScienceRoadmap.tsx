import { motion } from 'framer-motion';
import { 
  Code2, Database, BarChart3, Brain, Server, Settings2, Cloud, Flame,
  ChevronRight, Sparkles
} from 'lucide-react';
import PlatformLayout from '@/components/layout/PlatformLayout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

const sections = [
  {
    id: 'languages',
    icon: Code2,
    title: '1️⃣ Programming Languages',
    color: 'text-blue-400',
    items: [
      { 
        name: '🐍 Python (Eng muhim)', 
        tags: ['Pandas', 'NumPy', 'Scikit-learn', 'Matplotlib', 'Seaborn', 'Statsmodels', 'XGBoost / LightGBM', 'TensorFlow / PyTorch'],
        highlight: true
      },
      { name: '🗄 SQL', tags: ['MySQL', 'PostgreSQL', 'SQL Server', 'BigQuery'] },
      { name: '🧮 R', tags: ["Ba'zi kompaniyalarda"] },
    ]
  },
  {
    id: 'analysis',
    icon: BarChart3,
    title: '2️⃣ Data Analysis & Manipulation',
    color: 'text-emerald-400',
    items: [
      { name: 'Asosiy toollar', tags: ['Pandas', 'NumPy', 'Excel (Advanced)', 'Power BI ✅', 'Tableau'] }
    ]
  },
  {
    id: 'visualization',
    icon: BarChart3,
    title: '3️⃣ Data Visualization',
    color: 'text-purple-400',
    items: [
      { name: 'Kutubxonalar', tags: ['Matplotlib', 'Seaborn', 'Plotly', 'Power BI', 'Tableau'] }
    ]
  },
  {
    id: 'ml',
    icon: Brain,
    title: '4️⃣ Machine Learning',
    color: 'text-amber-400',
    items: [
      { name: '📌 Classical ML', tags: ['Scikit-learn', 'XGBoost', 'LightGBM', 'CatBoost'] },
      { name: '📌 Deep Learning', tags: ['TensorFlow', 'Keras', 'PyTorch'] },
    ]
  },
  {
    id: 'bigdata',
    icon: Server,
    title: '5️⃣ Big Data Technologies',
    color: 'text-red-400',
    items: [
      { name: 'Texnologiyalar', tags: ['Apache Spark (PySpark)', 'Hadoop', 'Hive', 'Kafka'] }
    ]
  },
  {
    id: 'engineering',
    icon: Settings2,
    title: '6️⃣ Data Engineering Tools',
    color: 'text-cyan-400',
    items: [
      { name: 'Toollar', tags: ['Airflow', 'dbt', 'Docker', 'Git', 'CI/CD', 'ETL pipelines'] }
    ]
  },
  {
    id: 'databases',
    icon: Database,
    title: '7️⃣ Databases',
    color: 'text-orange-400',
    items: [
      { name: 'Bazalar', tags: ['PostgreSQL', 'MySQL', 'MongoDB', 'Snowflake', 'BigQuery', 'Redshift'] }
    ]
  },
  {
    id: 'cloud',
    icon: Cloud,
    title: '8️⃣ Cloud Platforms (Juda muhim!)',
    color: 'text-sky-400',
    items: [
      { name: 'Platformalar', tags: ['AWS', 'Google Cloud Platform (GCP)', 'Microsoft Azure'] }
    ]
  },
];

const minimalStack = [
  'Python (Advanced)',
  'Pandas + NumPy',
  'SQL (Advanced joins, window functions)',
  'Statistics',
  'Scikit-learn',
  'Power BI yoki Tableau',
  'Git',
  'Basic Cloud (AWS yoki GCP)',
];

export default function DataScienceRoadmap() {
  return (
    <PlatformLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            2026 Roadmap
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            📊 Data Science'da Asosiy Texnologiyalar
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Data Scientist bo'lish uchun kerakli barcha texnologiyalar va toollar ro'yxati
          </p>
        </motion.div>

        {/* Sections */}
        <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="space-y-3">
          {sections.map((section, idx) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <AccordionItem value={section.id} className="border rounded-xl bg-card/50 backdrop-blur-sm px-4 overflow-hidden">
                <AccordionTrigger className="hover:no-underline gap-3">
                  <div className="flex items-center gap-3">
                    <section.icon className={`w-5 h-5 ${section.color}`} />
                    <span className="font-semibold text-foreground text-left">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-2">
                    {section.items.map((item, i) => (
                      <div key={i} className="space-y-2">
                        <p className={`text-sm font-medium ${item.highlight ? 'text-primary' : 'text-muted-foreground'}`}>
                          {item.name}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {item.tags.map(tag => (
                            <Badge 
                              key={tag} 
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>

        {/* Minimal Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              🔥 2026 yilda Top Data Scientist bo'lish uchun Minimal Stack
            </h2>
          </div>
          <div className="grid gap-2">
            {minimalStack.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                <span>✔ {item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </PlatformLayout>
  );
}
