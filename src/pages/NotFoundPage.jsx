import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Zap, Map, BookOpen, TrendingUp, Target, ArrowLeft } from 'lucide-react';

const NotFoundPage = ({ requestedPath }) => {
  const navigate = useNavigate();

  const helpfulLinks = [
    { path: '/', label: 'Now (Dashboard)', desc: 'Current focus session & daily priorities', icon: Zap },
    { path: '/roadmap', label: 'World Roadmap', desc: 'Hierarchical domain knowledge map', icon: Map },
    { path: '/learning-plan', label: 'Learning Path', desc: 'Scheduled tasks and syllabus milestones', icon: BookOpen },
    { path: '/statistics', label: 'Growth Analytics', desc: 'Focus metrics, streak rhythm & telemetry', icon: TrendingUp },
    { path: '/trajectory', label: 'Capabilities Trajectory', desc: 'Demonstrated skills & capability readiness', icon: Target },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 text-center">
      {/* 404 Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-mono font-bold uppercase tracking-wider mb-4">
        <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
        <span>404 · Uncharted Coordinate</span>
      </div>

      {/* Main Heading */}
      <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white mb-3">
        Page Not Found
      </h1>

      {/* Explanatory Context */}
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto mb-6 leading-relaxed">
        The route {requestedPath ? <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-mono text-xs font-semibold">{requestedPath}</code> : 'you requested'} does not exist in this learning workspace.
      </p>

      {/* Primary Return Button */}
      <div className="flex justify-center mb-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-electric-600 hover:bg-electric-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer hover:scale-102 active:scale-98"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard (Now)</span>
        </button>
      </div>

      {/* Helpful Directory Cards */}
      <div className="text-left bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Available Learning Coordinates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {helpfulLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-800/60 hover:border-electric-400 dark:hover:border-electric-500 hover:shadow-sm transition-all text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-electric-50 dark:bg-electric-950/60 border border-electric-200 dark:border-electric-800 flex items-center justify-center text-electric-600 dark:text-electric-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-electric-600 dark:group-hover:text-electric-400 transition-colors">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
