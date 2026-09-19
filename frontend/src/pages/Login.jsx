import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, LogIn, UserPlus, ArrowLeft, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function Login({ onLogin }) {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setIsRegister(true);
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/api/login', { identifier, password });
      if (res.data.success) {
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
        }
        toast.success(res.data.message);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 600);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal masuk. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      toast.error('Konfirmasi password tidak cocok.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post('/api/register', {
        username: regUsername,
        email: regEmail,
        full_name: regFullName,
        password: regPassword,
        confirm_password: regConfirm,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setIsRegister(false);
        setRegUsername(''); setRegEmail(''); setRegFullName(''); setRegPassword(''); setRegConfirm('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mendaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-bg flex items-center justify-center p-4">
      <div className="mesh-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="absolute top-6 left-6 z-20">
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-medium">
          <ArrowLeft size={18} /> Kembali
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {!isRegister ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full max-w-md glass-card overflow-hidden"
          >
            <div className="p-8">
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-violet rounded-2xl flex items-center justify-center mb-4 text-white shadow-2xl shadow-primary/40">
                  <Sparkles size={30} />
                </div>
                <h2 className="text-2xl font-bold text-white">Masuk ke RuangBelajar</h2>
                <p className="text-sm text-slate-400 mt-2 text-center">Masukkan akun Anda untuk melanjutkan</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email atau Username <span className="text-rose">*</span></label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="input-field"
                    placeholder="contoh: murid@sekolah.id"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Password <span className="text-rose">*</span></label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full py-3 mt-4"
                >
                  {isLoading ? 'Memproses...' : <><LogIn size={18} /> Masuk Sekarang</>}
                </motion.button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Belum punya akun?{' '}
                <button onClick={() => setIsRegister(true)} className="text-primary-light font-semibold hover:underline">
                  Daftar di sini
                </button>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full max-w-md glass-card overflow-hidden"
          >
            <div className="p-8">
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-secondary to-cyan rounded-2xl flex items-center justify-center mb-4 text-white shadow-2xl shadow-secondary/40">
                  <UserPlus size={30} />
                </div>
                <h2 className="text-2xl font-bold text-white">Daftar Akun Baru</h2>
                <p className="text-sm text-slate-400 mt-2 text-center">Setelah mendaftar, akun Anda perlu disetujui oleh Guru</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nama Lengkap</label>
                  <input type="text" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} className="input-field" placeholder="Nama lengkap Anda" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Username <span className="text-rose">*</span></label>
                  <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="input-field" placeholder="username_baru" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email <span className="text-rose">*</span></label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="input-field" placeholder="email@contoh.com" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Password <span className="text-rose">*</span></label>
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="input-field" placeholder="Min. 6 karakter" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Konfirmasi Password <span className="text-rose">*</span></label>
                  <input type="password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} className="input-field" placeholder="Ketik ulang password" required />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-secondary w-full py-3 mt-2"
                >
                  {isLoading ? 'Memproses...' : <><UserPlus size={18} /> Daftar Sekarang</>}
                </motion.button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Sudah punya akun?{' '}
                <button onClick={() => setIsRegister(false)} className="text-primary-light font-semibold hover:underline">
                  Masuk di sini
                </button>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
