import os
from datetime import datetime, timedelta
from sqlalchemy import inspect, text
from models import db, User, Subject, Material, MaterialProgress, Assignment, Submission, Message

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
        _add_missing_user_columns()
        seed_data()

def _add_missing_user_columns():
    try:
        inspector = inspect(db.engine)
        if inspector.has_table('users'):
            columns = {column['name'] for column in inspector.get_columns('users')}
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

