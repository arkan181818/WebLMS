import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { Users, BookOpen, Layers, Target, Clock } from 'lucide-react';
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar user={user} onLogout={onLogout} />
      
      <div className="flex-1 ml-64 p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Halo, {user.display_name}! 👋</h1>
          <p className="text-slate-500 mt-2">Selamat datang kembali di RuangBelajar. Mari lanjutkan progresmu hari ini.</p>
        </motion.div>

        {user.role === 'guru' ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={<BookOpen />} label="Total Materi" value={data.stats.total_materials} color="bg-blue-500" />
            <StatCard icon={<Users />} label="Total Murid" value={data.stats.total_students} color="bg-indigo-500" />
            <StatCard icon={<Layers />} label="Mata Pelajaran" value={data.stats.total_subjects} color="bg-emerald-500" />
            <StatCard icon={<Target />} label="Total Tugas" value={data.stats.total_assignments} color="bg-orange-500" />
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard icon={<BookOpen />} label="Materi Tersedia" value={data.stats.total_materials} color="bg-blue-500" />
            <StatCard icon={<Target />} label="Materi Selesai" value={data.stats.completed_count} color="bg-emerald-500" />
            
            <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <h3 className="text-slate-500 text-sm font-medium mb-2">Progres Keseluruhan</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-slate-800">{data.stats.progress_percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.stats.progress_percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-primary h-2.5 rounded-full"
                ></motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {user.role === 'guru' ? 'Materi Terakhir Ditambahkan' : 'Materi Terbaru'}
            </h2>
            <button className="text-sm font-medium text-primary hover:text-primary-hover">Lihat Semua</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(user.role === 'guru' ? data.recent_materials : data.latest_materials).map((materi, idx) => (
              <motion.div variants={itemVariants} key={idx} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group bg-slate-50 hover:bg-white">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors">{materi.title}</h4>
                  {materi.summary && <p className="text-sm text-slate-500 line-clamp-2">{materi.summary}</p>}
                  <div className="flex items-center gap-2 mt-3 text-xs font-medium text-slate-400">
                    <Clock size={14} /> Baru saja ditambahkan
                  </div>
                </div>
              </motion.div>
            ))}
            {(user.role === 'guru' ? data.recent_materials : data.latest_materials).length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500">Belum ada materi.</div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };
  return (
    <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${color}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-medium">{label}</h3>
        <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
      </div>
    </motion.div>
  );
}
