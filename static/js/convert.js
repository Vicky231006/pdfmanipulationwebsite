document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const convertBtn = document.getElementById('convertBtn');
    const progress = document.getElementById('progress');
    const progressFill = progress.querySelector('.progress-fill');
    
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
            return file.type.startsWith('image/');
        });
        handleFiles(newFiles);
    });

    // Click to select files
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const newFiles = Array.from(fileInput.files).filter(file => {
            return file.type.startsWith('image/');
        });
        handleFiles(newFiles);
    });

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function handleFiles(newFiles) {
        files = [...files, ...newFiles];
        updateFileList();
        convertBtn.disabled = files.length === 0;
    }

    function updateFileList() {
        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.createElement('div');
                preview.className = 'file-preview';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;
                preview.appendChild(img);
                
                const info = document.createElement('div');
                info.className = 'file-info';
                info.innerHTML = `
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                `;
                
                const actions = document.createElement('div');
                actions.className = 'file-actions';
                actions.innerHTML = `
                    <button class="button danger" onclick="removeFile(${index})">Remove</button>
                `;
                
                fileItem.appendChild(preview);
                fileItem.appendChild(info);
                fileItem.appendChild(actions);
            };
            reader.readAsDataURL(file);
            
            fileList.appendChild(fileItem);
        });
    }

    window.removeFile = (index) => {
        files.splice(index, 1);
        updateFileList();
        convertBtn.disabled = files.length === 0;
    };

    convertBtn.addEventListener('click', async () => {
        if (files.length === 0) return;

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files[]', file);
        });

        convertBtn.disabled = true;
        progress.style.display = 'block';
        progressFill.style.width = '50%';

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Conversion failed');
            }

            progressFill.style.width = '100%';

            // Get the PDF file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link and click it to download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'converted.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Reset the form
            files = [];
            updateFileList();
            convertBtn.disabled = true;
            
            setTimeout(() => {
                progress.style.display = 'none';
                progressFill.style.width = '0';
            }, 1000);

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to convert images to PDF. Please try again.');
            convertBtn.disabled = false;
            progress.style.display = 'none';
            progressFill.style.width = '0';
        }
    });
}); 