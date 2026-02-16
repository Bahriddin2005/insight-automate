import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface InsightsPanelProps {
  insights: string[];
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">AI Insights</h2>
      </div>
      <ul className="space-y-2.5">
        {insights.map((insight, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
            className="flex items-start gap-2.5 text-sm text-foreground/85"
          >
            <span className="w-1.5 h-1.5 rounded-full gradient-primary mt-1.5 shrink-0" />
            {insight}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
