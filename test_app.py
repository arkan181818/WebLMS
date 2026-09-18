import unittest
import io
import os
from app import app, db
from models import User, Subject, Material, MaterialProgress, Assignment, Submission

class FlaskELearningTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.test_client()

        with app.app_context():
            db.create_all()
            from database import seed_data
            seed_data()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def login(self, identifier, password):
        return self.client.post('/login', data=dict(
            identifier=identifier,
            password=password
        ), follow_redirects=True)

    def logout(self):
        return self.client.get('/logout', follow_redirects=True)

    def test_seed_data_created(self):
        with app.app_context():
            guru = User.query.filter_by(email='guru@sekolah.id').first()
            murid = User.query.filter_by(email='murid@sekolah.id').first()
            self.assertIsNotNone(guru)
            self.assertIsNotNone(murid)
            self.assertEqual(guru.role, 'guru')
            self.assertEqual(murid.role, 'murid')
            self.assertGreater(Subject.query.count(), 0)
            self.assertGreater(Material.query.count(), 0)
            self.assertGreater(Assignment.query.count(), 0)

    def test_login_guru(self):
        response = self.login('guru@sekolah.id', 'admin123')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Dashboard Guru', response.data)

    def test_login_murid(self):
        response = self.login('murid@sekolah.id', 'murid123')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Semangat Belajar', response.data)

    def test_guru_create_material(self):
        self.login('guru@sekolah.id', 'admin123')
        with app.app_context():
            sub = Subject.query.first()
            sub_id = sub.id

        response = self.client.post('/materi/tambah', data=dict(
            title='Belajar RESTful API dengan Flask',
            summary='Panduan lengkap membuat endpoint JSON dan HTTP methods',
            content='Materi pengenalan REST API...',
            subject_id=sub_id,
            video_url='https://www.youtube.com/watch?v=dummy123456'
        ), follow_redirects=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Belajar RESTful API dengan Flask', response.data)

    def test_guru_create_assignment(self):
        self.login('guru@sekolah.id', 'admin123')
        with app.app_context():
            sub = Subject.query.first()
            sub_id = sub.id

        # Guru buat tugas baru
        response = self.client.post('/tugas/tambah', data=dict(
            title='Tugas Proyek Akhir: Fullstack Python',
            description='Buat web app lengkap dengan upload berkas dan database SQLite.',
            subject_id=sub_id,
            due_date='2026-12-31T23:59'
        ), follow_redirects=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Tugas Proyek Akhir: Fullstack Python', response.data)

    def test_student_submit_assignment_all_file_types(self):
        # 1. Login Murid
        self.login('murid@sekolah.id', 'murid123')
        with app.app_context():
            task = Assignment.query.first()
            task_id = task.id

        # 2. Upload file jawaban (.zip format)
        test_file = (io.BytesIO(b"dummy zip binary content for assignment submission"), 'jawaban_tugas.zip')
        response = self.client.post(f'/tugas/{task_id}/kumpul', data={
            'submission_file': test_file,
            'note': 'Berikut source code dan lampiran tugas saya Pak.'
        }, content_type='multipart/form-data', follow_redirects=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Tugas berhasil dikumpulkan', response.data)

        # 3. Guru memeriksa dan memberi nilai
        self.logout()
        self.login('guru@sekolah.id', 'admin123')
        with app.app_context():
            sub = Submission.query.filter_by(assignment_id=task_id).first()
            self.assertIsNotNone(sub)
            sub_id = sub.id

        grade_response = self.client.post(f'/submission/{sub_id}/grade', data={
            'grade': 95,
            'feedback': 'Sangat bagus dan rapi! Struktur file zip lengkap.'
        }, follow_redirects=True)
        self.assertEqual(grade_response.status_code, 200)

        # 4. Murid melihat nilai yang diberikan guru
        self.logout()
        self.login('murid@sekolah.id', 'murid123')
        detail_resp = self.client.get(f'/tugas/{task_id}')
        self.assertIn(b'95', detail_resp.data)
        self.assertIn(b'Sangat bagus dan rapi', detail_resp.data)

if __name__ == '__main__':
    unittest.main()
