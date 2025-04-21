document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileItems = document.getElementById('fileItems');
    const mergeBtn = document.getElementById('mergeBtn');
    const clearAllBtn = document.getElementById('clearAll');
    const progress = document.getElementById('progress');
    const progressFill = progress.querySelector('.progress-fill');
    
    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    let files = [];

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const newFiles = Array.from(e.dataTransfer.files).filter(file => {
            if (file.type !== 'application/pdf') {
                return false;
            }
            if (file.size > MAX_FILE_SIZE) {
                alert(`File "${file.name}" exceeds the maximum size of 50MB`);
                return false;
            }
            return true;
        });
        
        if (newFiles.length === 0) {
            alert('Please drop valid PDF files (max 50MB each)');
            return;
        }
        
        if (files.length + newFiles.length > MAX_FILES) {
            alert(`Maximum ${MAX_FILES} files can be merged at once`);
            return;
        }
        
        handleFiles(newFiles);
    });

    // Click to select files
    dropZone.addEventListener('click', () => {
        if (files.length >= MAX_FILES) {
            alert(`Maximum ${MAX_FILES} files can be merged at once`);
            return;
        }
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const newFiles = Array.from(fileInput.files).filter(file => {
            if (file.type !== 'application/pdf') {
                return false;
            }
            if (file.size > MAX_FILE_SIZE) {
                alert(`File "${file.name}" exceeds the maximum size of 50MB`);
                return false;
            }
            return true;
        });
        
        if (newFiles.length === 0) {
            alert('Please select valid PDF files (max 50MB each)');
            return;
        }
        
        if (files.length + newFiles.length > MAX_FILES) {
            alert(`Maximum ${MAX_FILES} files can be merged at once`);
            return;
        }
        
        handleFiles(newFiles);
        fileInput.value = ''; // Reset file input
    });

    function handleFiles(newFiles) {
        files = [...files, ...newFiles];
        updateFileList();
        updateUI();
    }

    function updateFileList() {
        fileItems.innerHTML = '';
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
                <div class="file-actions">
                    <button class="button" onclick="previewFile(${index})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="button danger" onclick="removeFile(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            fileItems.appendChild(fileItem);
        });
    }

    function updateUI() {
        mergeBtn.disabled = files.length < 2;
        clearAllBtn.style.display = files.length > 0 ? 'block' : 'none';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    window.removeFile = (index) => {
        files.splice(index, 1);
        updateFileList();
        updateUI();
    };

    window.previewFile = (index) => {
        const file = files[index];
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    };

    clearAllBtn.addEventListener('click', () => {
        files = [];
        updateFileList();
        updateUI();
    });

    mergeBtn.addEventListener('click', async () => {
        if (files.length < 2) return;

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files[]', file);
        });

        mergeBtn.disabled = true;
        progress.style.display = 'block';
        progressFill.style.width = '50%';

        try {
            const response = await fetch('/api/merge', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Merge failed');
            }

            progressFill.style.width = '100%';

            // Get the merged PDF file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link and click it to download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'merged.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Reset the form
            files = [];
            updateFileList();
            updateUI();
            
            setTimeout(() => {
                progress.style.display = 'none';
                progressFill.style.width = '0';
            }, 1000);

        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Failed to merge PDFs. Please try again.');
            mergeBtn.disabled = false;
            progress.style.display = 'none';
            progressFill.style.width = '0';
        }
    });
}); 