import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Shield, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="w-full bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <BookOpen className="w-6 h-6" />
          RuangBelajar
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-slate-600 font-medium hover:text-primary transition-colors">
            Masuk
          </Link>
          <Link to="/login?mode=register" className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm">
            Daftar Sekarang
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-800 tracking-tight leading-tight mb-6">
            Platform Mentorship <br/>
            <span className="text-primary">Eksklusif & Terarah</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
            Belajar langsung 1-on-1 dengan mentor profesional. Akses materi personal, kerjakan tugas, dan diskusikan perkembangan Anda secara privat.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 transition-all hover:-translate-y-1">
              Mulai Belajar Sekarang <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div className="bg-white py-20 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-6 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <div className="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Materi Personal</h3>
              <p className="text-slate-500">Materi pembelajaran dan penugasan yang disesuaikan khusus untuk tingkat pemahaman Anda.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-6 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Mentorship 1-on-1</h3>
              <p className="text-slate-500">Diskusi langsung secara privat dengan pengajar Anda untuk memastikan progres belajar yang maksimal.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-6 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-6">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Sistem Persetujuan</h3>
              <p className="text-slate-500">Lingkungan belajar yang aman dan eksklusif. Setiap pendaftar wajib melalui proses verifikasi mentor.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
