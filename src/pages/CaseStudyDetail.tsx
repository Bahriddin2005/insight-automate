import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Briefcase, BarChart3, Brain, DollarSign, Rocket, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, Lightbulb, Target, Github, Code2, Database, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCaseStudy, CATEGORIES, type CaseStudy } from '@/lib/caseStudies';
import { analyzeDataset } from '@/lib/dataProcessor';
import { generateGitHubExport } from '@/lib/githubExport';
import ThemeToggle from '@/components/dashboard/ThemeToggle';

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-accent" />;
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-destructive" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

export default function CaseStudyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const study = getCaseStudy(id || '');

  if (!study) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Case Study Not Found</h2>
          <Button onClick={() => navigate('/portfolio')}>Back to Portfolio</Button>
        </div>
      </div>
    );
  }

  const catInfo = CATEGORIES[study.category];

  const handleExport = () => {
    generateGitHubExport(study);
  };

  const handleAnalyze = () => {
    // Navigate to Intelligence Studio with this case study's data
    const analysis = analyzeDataset(study.sampleData as Record<string, unknown>[]);
    // Store in sessionStorage for Index to pick up
    sessionStorage.setItem('case_study_analysis', JSON.stringify({ analysis, fileName: study.title }));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portfolio')} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <p className="text-xs text-muted-foreground">{catInfo.label}</p>
              <h1 className="text-sm font-bold text-foreground">{study.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAnalyze} className="text-xs">
              <BarChart3 className="w-3 h-3 mr-1" /> Analyze in Studio
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
              <Github className="w-3 h-3 mr-1" /> Export for GitHub
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{catInfo.label}</span>
            <span className="text-xs text-muted-foreground">{study.duration}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{study.company}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{study.title}</h2>
          <p className="text-lg text-muted-foreground mb-4">{study.subtitle}</p>
          <div className="flex flex-wrap gap-1.5">
            {study.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">{tag}</span>
            ))}
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {study.kpis.map(kpi => (
            <div key={kpi.name} className="glass-card rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1 truncate">{kpi.name}</p>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendIcon trend={kpi.trend} />
                <span className={`text-xs font-medium ${kpi.trend === 'up' ? 'text-accent' : kpi.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {kpi.change}
                </span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full grid grid-cols-5 bg-card/50">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs">Analysis</TabsTrigger>
            <TabsTrigger value="code" className="text-xs">Code</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">Strategy</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Problem Statement */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Business Problem</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{study.problemStatement}</p>
              </div>

              {/* Dataset Overview */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Dataset Overview</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{study.datasetOverview}</p>
              </div>
            </div>

            {/* Data Cleaning */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Data Cleaning Process</h3>
              </div>
              <div className="space-y-2">
                {study.cleaningProcess.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-sm font-bold text-foreground mb-3">Tools & Technologies</h3>
              <div className="flex flex-wrap gap-2">
                {study.tools.map(tool => (
                  <span key={tool} className="px-3 py-1.5 rounded-lg bg-muted/50 text-sm text-foreground font-medium">{tool}</span>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ANALYSIS TAB */}
          <TabsContent value="analysis" className="space-y-6">
            {/* Executive Summary */}
            <div className="glass-card rounded-xl p-6 border-l-4 border-primary">
              <h3 className="text-sm font-bold text-foreground mb-3">Executive Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{study.executiveSummary}</p>
            </div>

            {/* Sample data preview */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground">Dataset Preview</h3>
                <Button variant="outline" size="sm" onClick={handleAnalyze} className="text-xs">
                  <BarChart3 className="w-3 h-3 mr-1" /> Full Analysis in Studio
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      {Object.keys(study.sampleData[0] || {}).map(col => (
                        <th key={col} className="text-left py-2 px-3 text-muted-foreground font-medium">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {study.sampleData.slice(0, 8).map((row, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="py-2 px-3 text-foreground truncate max-w-[200px]">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Showing 8 of {study.sampleData.length} rows</p>
            </div>
          </TabsContent>

          {/* CODE TAB */}
          <TabsContent value="code" className="space-y-6">
            {/* SQL Queries */}
            {study.sqlQueries.map((sq, i) => (
              <div key={i} className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">{sq.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{sq.explanation}</p>
                <pre className="bg-muted/30 rounded-lg p-4 text-xs text-foreground overflow-x-auto font-mono leading-relaxed">{sq.query}</pre>
              </div>
            ))}

            {/* Python Code */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Code2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Python Analysis</h3>
              </div>
              <pre className="bg-muted/30 rounded-lg p-4 text-xs text-foreground overflow-x-auto font-mono leading-relaxed">{study.pythonCode}</pre>
            </div>
          </TabsContent>

          {/* INSIGHTS TAB */}
          <TabsContent value="insights" className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Key Findings</h3>
            {study.insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-xl p-5 border-l-4 border-primary/50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{insight}</p>
                </div>
              </motion.div>
            ))}
          </TabsContent>

          {/* STRATEGY TAB */}
          <TabsContent value="recommendations" className="space-y-6">
            {/* Recommendations */}
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" /> Strategic Recommendations
              </h3>
              <div className="space-y-3">
                {study.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card rounded-xl p-4 flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary-foreground">{i + 1}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{rec}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Impact */}
            <div className="glass-card rounded-xl p-6 border-l-4 border-accent">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-foreground">Expected Impact</h3>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{study.impact}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
