import os
from datetime import datetime, timedelta
from sqlalchemy import inspect, text
from models import db, User, Subject, Material, MaterialAttachment, MaterialProgress, Assignment, Submission, Message

def init_db(app):
    db.init_app(app)
    with app.app_context():
        # Retry hingga 3x karena Neon DB bisa auto-suspend dan butuh waktu "bangun"
        import time
        for attempt in range(3):
            try:
                db.create_all()
                _optimize_database_performance()
                _add_missing_user_columns()
                seed_data()
                print("Database initialized successfully.")
                break
            except Exception as e:
                print(f"DB init attempt {attempt+1} failed: {e}")
                if attempt < 2:
                    time.sleep(3)  # tunggu 3 detik lalu coba lagi
                else:
                    print("WARNING: DB init failed after 3 attempts. Server will still start.")

def _optimize_database_performance():
    try:
        if 'sqlite' in str(db.engine.url):
            with db.engine.connect() as conn:
                conn.execute(text('PRAGMA journal_mode=WAL;'))
                conn.execute(text('PRAGMA synchronous=NORMAL;'))
                conn.execute(text('PRAGMA cache_size=-64000;'))
                conn.execute(text('PRAGMA temp_store=MEMORY;'))
                conn.commit()
    except Exception as e:
        print(f"DB Optimization notice: {e}")

def _add_missing_user_columns():
    try:
        inspector = inspect(db.engine)
        if inspector.has_table('users'):
            columns = {column['name'] for column in inspector.get_columns('users')}
            if 'is_approved' not in columns:
                # DEFAULT FALSE agar semua akun baru butuh persetujuan (kompatibel PostgreSQL & SQLite)
                default_val = 'FALSE' if 'postgresql' in str(db.engine.url) else '0'
                db.session.execute(text(f'ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT {default_val}'))
            if 'department' not in columns:
                db.session.execute(text('ALTER TABLE users ADD COLUMN department VARCHAR(120)'))
            if 'campus' not in columns:
                db.session.execute(text('ALTER TABLE users ADD COLUMN campus VARCHAR(150)'))
            if 'semester' not in columns:
                db.session.execute(text('ALTER TABLE users ADD COLUMN semester VARCHAR(50)'))
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Migration notice: {e}")

def seed_data():
    """Mengisi data awal jika database masih kosong"""
    try:
        if User.query.filter_by(role='guru').count() == 0:
            default_guru = User(
                username='admin_guru',
                email='admin@sekolah.com',
                full_name='Admin Guru Utama, S.Kom., M.T.',
                campus='Universitas Indonesia',
                department='Teknik Informatika',
                semester='Semester 8',
                role='guru',
                is_approved=True
            )
            default_guru.set_password('admin123')
            db.session.add(default_guru)
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Seed notice: {e}")

