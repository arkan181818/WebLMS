import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { Users, BookOpen, Layers, Target, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Dashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/api/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-slate-400 font-medium">Memuat Dashboard...</span>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const stats = data?.stats || {};
  const isGuru = user?.role === 'guru';
  const recentMaterials = isGuru ? (data?.recent_materials || []) : (data?.latest_materials || []);

  const statConfigs = isGuru ? [
    { icon: <BookOpen />, label: 'Total Materi', value: stats.total_materials || 0, gradient: 'from-primary to-violet', shadow: 'shadow-primary/30' },
    { icon: <Users />, label: 'Total Murid', value: stats.total_students || 0, gradient: 'from-cyan to-secondary', shadow: 'shadow-cyan/30' },
    { icon: <Layers />, label: 'Mata Pelajaran', value: stats.total_subjects || 0, gradient: 'from-secondary to-emerald-400', shadow: 'shadow-secondary/30' },
    { icon: <Target />, label: 'Total Tugas', value: stats.total_assignments || 0, gradient: 'from-accent to-rose', shadow: 'shadow-accent/30' },
  ] : [
    { icon: <BookOpen />, label: 'Materi Tersedia', value: stats.total_materials || 0, gradient: 'from-primary to-violet', shadow: 'shadow-primary/30' },
    { icon: <Target />, label: 'Materi Selesai', value: stats.completed_count || 0, gradient: 'from-secondary to-cyan', shadow: 'shadow-secondary/30' },
  ];

  return (
    <div className="page-bg flex">
      <div className="mesh-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex-1 md:ml-64 ml-0 p-5 pt-20 md:p-8 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white">Halo, {user?.display_name || user?.username || 'Pengguna'}! 👋</h1>
          <p className="text-slate-400 mt-2">Selamat datang kembali di RuangBelajar. Mari lanjutkan progresmu hari ini.</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className={`grid grid-cols-1 md:grid-cols-2 ${isGuru ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-5 mb-8`}>
          {statConfigs.map((stat, idx) => (
            <motion.div key={idx} variants={itemVariants} className="glass-card p-5 flex items-center gap-4 group hover:border-white/20 transition-all duration-300">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-0.5">{stat.value}</p>
              </div>
            </motion.div>
          ))}

          {/* Progress card for murid */}
          {!isGuru && (
            <motion.div variants={itemVariants} className="glass-card p-5 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400 font-medium">Progres Keseluruhan</p>
                <TrendingUp size={16} className="text-primary-light" />
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-white">{stats.progress_percentage || 0}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.progress_percentage || 0}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="bg-gradient-to-r from-primary to-violet h-2.5 rounded-full shadow-lg shadow-primary/30"
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Recent Materials */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              {isGuru ? 'Materi Terakhir Ditambahkan' : 'Materi Terbaru'}
            </h2>
            <button className="text-sm font-medium text-primary-light hover:text-white transition-colors flex items-center gap-1">
              Lihat Semua <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentMaterials.map((materi, idx) => (
              <motion.div
                variants={itemVariants}
                key={idx}
                className="flex gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-primary/30 transition-all duration-300 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-violet/20 text-primary-light flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 border border-primary/20">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1 group-hover:text-primary-light transition-colors">{materi.title}</h4>
                  {materi.summary && <p className="text-sm text-slate-500 line-clamp-2">{materi.summary}</p>}
                  <div className="flex items-center gap-2 mt-3 text-xs font-medium text-slate-600">
                    <Clock size={12} /> Baru saja ditambahkan
                  </div>
                </div>
              </motion.div>
            ))}
            {recentMaterials.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500">Belum ada materi.</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
