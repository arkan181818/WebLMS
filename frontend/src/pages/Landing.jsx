import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Shield, ArrowRight, Sparkles, Zap, Star } from 'lucide-react';

export default function Landing() {
  return (
    <div className="page-bg">
      <div className="mesh-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Navbar */}
      <nav className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-violet rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Sparkles size={18} />
          </div>
          <span className="font-bold text-white text-xl tracking-tight">RuangBelajar</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-slate-400 font-medium hover:text-white transition-colors">
            Masuk
          </Link>
          <Link to="/login?mode=register" className="btn btn-primary text-sm py-2 px-5">
            Daftar Sekarang
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-sm font-medium mb-8"
          >
            <Zap size={14} /> Platform E-Learning Mentorship
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Belajar Lebih{' '}
            <span className="text-gradient">Terarah</span>
            <br />
            dengan{' '}
            <span className="text-gradient-warm">Mentor Pribadi</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Akses materi personal, kerjakan tugas, dan diskusikan perkembangan Anda secara privat. Platform mentorship 1-on-1 yang eksklusif.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="group flex items-center gap-3 bg-gradient-to-r from-primary via-violet to-primary bg-[length:200%_100%] hover:bg-right text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-primary/30 transition-all duration-500 hover:-translate-y-1">
              Mulai Belajar Sekarang
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-8 mt-16"
          >
            {[
              { num: '100+', label: 'Materi' },
              { num: '50+', label: 'Murid Aktif' },
              { num: '1:1', label: 'Mentorship' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-extrabold text-white">{s.num}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Features */}
      <div className="relative z-10 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Kenapa <span className="text-gradient">RuangBelajar</span>?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Platform yang dirancang untuk pengalaman belajar personal dan efektif.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <BookOpen className="w-7 h-7" />,
                gradient: 'from-secondary to-cyan',
                title: 'Materi Personal',
                desc: 'Materi pembelajaran yang disesuaikan khusus untuk tingkat pemahaman Anda.',
              },
              {
                icon: <Users className="w-7 h-7" />,
                gradient: 'from-primary to-violet',
                title: 'Mentorship 1-on-1',
                desc: 'Diskusi langsung secara privat dengan pengajar untuk progres maksimal.',
              },
              {
                icon: <Shield className="w-7 h-7" />,
                gradient: 'from-accent to-rose',
                title: 'Sistem Persetujuan',
                desc: 'Lingkungan belajar yang aman. Setiap pendaftar melalui verifikasi mentor.',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card p-8 group hover:border-white/20 transition-all duration-500 hover:-translate-y-2"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${f.gradient} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/[0.06] py-8">
        <p className="text-center text-sm text-slate-600">© 2026 RuangBelajar. Dibuat dengan ❤️</p>
      </div>
    </div>
  );
}
