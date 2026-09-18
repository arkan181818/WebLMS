// Main JavaScript logic for E-Learning Platform

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobileSidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });

        // Klik di luar sidebar untuk menutup pada layar kecil
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992 && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && e.target !== mobileToggle) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    // 2. Alert Dismissal
    document.querySelectorAll('.alert-close').forEach(button => {
        button.addEventListener('click', () => {
            const alertBox = button.closest('.alert');
            if (alertBox) {
                alertBox.style.opacity = '0';
                alertBox.style.transform = 'translateY(-8px)';
                alertBox.style.transition = 'all 0.2s ease';
                setTimeout(() => alertBox.remove(), 200);
            }
        });
    });

    // 3. Quick Fill Demo Credentials (Login Page)
    window.fillCredentials = function(email, password) {
        const idInput = document.getElementById('identifier');
        const pwdInput = document.getElementById('password');
        if (idInput && pwdInput) {
            idInput.value = email;
            pwdInput.value = password;
            // Visual highlight animation
            [idInput, pwdInput].forEach(inp => {
                inp.style.borderColor = 'var(--primary)';
                inp.style.backgroundColor = 'var(--primary-light)';
                setTimeout(() => {
                    inp.style.borderColor = '';
                    inp.style.backgroundColor = '';
                }, 800);
            });
        }
    };

    // 4. AJAX Toggle Mark Material Completed
    const completeBtn = document.getElementById('btnToggleComplete');
    if (completeBtn) {
        completeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const materialId = completeBtn.getAttribute('data-material-id');
            if (!materialId) return;

            const originalHtml = completeBtn.innerHTML;
            completeBtn.disabled = true;
            completeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

            try {
                const response = await fetch(`/materi/${materialId}/toggle-complete`, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                if (data.success) {
                    if (data.is_completed) {
                        completeBtn.className = 'btn btn-success btn-lg';
                        completeBtn.innerHTML = '<i class="fas fa-check-circle"></i> Selesai Dipelajari';
                        
                        const statusBadge = document.getElementById('statusBadge');
                        if (statusBadge) {
                            statusBadge.className = 'badge badge-done';
                            statusBadge.innerHTML = '<i class="fas fa-check"></i> Sudah Selesai';
                        }
                    } else {
                        completeBtn.className = 'btn btn-outline btn-lg';
                        completeBtn.innerHTML = '<i class="far fa-circle"></i> Tandai Sudah Selesai';
                        
                        const statusBadge = document.getElementById('statusBadge');
                        if (statusBadge) {
                            statusBadge.className = 'badge badge-pending';
                            statusBadge.innerHTML = '<i class="far fa-clock"></i> Belum Selesai';
                        }
                    }
                }
            } catch (err) {
                console.error('Error updating progress:', err);
                alert('Gagal memperbarui status belajar.');
                completeBtn.innerHTML = originalHtml;
            } finally {
                completeBtn.disabled = false;
            }
        });
    }

    // 5. File upload name preview
    const fileInput = document.getElementById('attachment');
    const fileNameDisplay = document.getElementById('file-chosen-name');
    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length > 0) {
                fileNameDisplay.textContent = `File terpilih: ${fileInput.files[0].name} (${(fileInput.files[0].size / 1024 / 1024).toFixed(2)} MB)`;
                fileNameDisplay.style.display = 'block';
            } else {
                fileNameDisplay.textContent = '';
                fileNameDisplay.style.display = 'none';
            }
        });
    }
});
