import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, BarChart3, Brain, Rocket, PieChart, FlaskConical,
  Shield, ChevronRight, Sparkles, Database
} from 'lucide-react';
import PlatformLayout from '@/components/layout/PlatformLayout';
import ProDataUpload from '@/components/prodata/ProDataUpload';
import ProDataEDA from '@/components/prodata/ProDataEDA';
import ProDataML from '@/components/prodata/ProDataML';
import ProDataPredict from '@/components/prodata/ProDataPredict';
import ProDataViz from '@/components/prodata/ProDataViz';
import ProDataAnalytics from '@/components/prodata/ProDataAnalytics';
import ProDataAdmin from '@/components/prodata/ProDataAdmin';

type Module = 'upload' | 'eda' | 'ml' | 'predict' | 'viz' | 'analytics' | 'admin';

const modules: { id: Module; label: string; icon: typeof Upload; desc: string }[] = [
  { id: 'upload', label: 'Data Upload', icon: Upload, desc: 'CSV, Excel, JSON yuklash' },
  { id: 'eda', label: 'EDA', icon: BarChart3, desc: 'Avtomatik tahlil' },
  { id: 'ml', label: 'ML Training', icon: Brain, desc: "Model o'rgatish" },
  { id: 'predict', label: 'Predictions', icon: Rocket, desc: 'Real-time bashorat' },
  { id: 'viz', label: 'Visualizations', icon: PieChart, desc: 'Interaktiv grafiklar' },
  { id: 'analytics', label: 'Advanced', icon: FlaskConical, desc: 'PCA, testlar' },
  { id: 'admin', label: 'Admin', icon: Shield, desc: 'Boshqaruv paneli' },
];

export default function ProDataLab() {
  const [active, setActive] = useState<Module>('upload');
  const [dataset, setDataset] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const handleDataLoaded = useCallback((data: any[], cols: string[], name: string) => {
    setDataset(data);
    setColumns(cols);
    setFileName(name);
  }, []);

  const renderModule = () => {
    switch (active) {
      case 'upload':
        return <ProDataUpload onDataLoaded={handleDataLoaded} currentData={dataset} fileName={fileName} />;
      case 'eda':
        return <ProDataEDA data={dataset} columns={columns} fileName={fileName} />;
      case 'ml':
        return <ProDataML data={dataset} columns={columns} />;
      case 'predict':
        return <ProDataPredict data={dataset} columns={columns} />;
      case 'viz':
        return <ProDataViz data={dataset} columns={columns} />;
      case 'analytics':
        return <ProDataAnalytics data={dataset} columns={columns} />;
      case 'admin':
        return <ProDataAdmin data={dataset} columns={columns} />;
      default:
        return null;
    }
  };

  return (
    <PlatformLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Pro<span className="text-gradient">DataLab</span>
              </h1>
              <p className="text-xs text-muted-foreground">AI Data Science Platform</p>
            </div>
          </div>
          {dataset && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg">
              <Database className="w-3 h-3" />
              <span className="font-medium text-foreground">{fileName}</span>
              <span>• {dataset.length} rows • {columns.length} cols</span>
            </div>
          )}
        </motion.div>

        {/* Module Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        >
          {modules.map((mod, i) => {
            const isActive = active === mod.id;
            const needsData = mod.id !== 'upload' && mod.id !== 'admin' && !dataset;
            return (
              <motion.button
                key={mod.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => !needsData && setActive(mod.id)}
                disabled={needsData}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : needsData
                    ? 'bg-secondary/30 text-muted-foreground/50 cursor-not-allowed'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <mod.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{mod.label}</span>
                <span className="sm:hidden">{mod.label.split(' ')[0]}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Active Module */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderModule()}
          </motion.div>
        </AnimatePresence>
      </div>
    </PlatformLayout>
  );
}
