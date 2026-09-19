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
    columns = {column['name'] for column in inspect(db.engine).get_columns('users')}
    if 'department' not in columns:
        db.session.execute(text('ALTER TABLE users ADD COLUMN department VARCHAR(120)'))
        db.session.commit()
    if 'campus' not in columns:
        db.session.execute(text('ALTER TABLE users ADD COLUMN campus VARCHAR(150)'))
        db.session.commit()
    if 'semester' not in columns:
        db.session.execute(text('ALTER TABLE users ADD COLUMN semester VARCHAR(50)'))
        db.session.commit()

def seed_data():
    """Mengisi data awal jika database masih kosong"""
    pass

