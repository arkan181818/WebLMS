import os
from datetime import datetime, timedelta
from models import db, User, Subject, Material, MaterialProgress, Assignment, Submission

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
        seed_data()

def seed_data():
    """Mengisi data awal jika database masih kosong"""
    pass

