// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Initialize PDF-lib
const PDFLib = window.PDFLib;

let currentPdf = null;
let pageOrder = [];
let pdfDoc = null;
let autoScrollInterval = null;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const pageGrid = document.getElementById('pageGrid');
const saveOrderBtn = document.getElementById('saveOrder');
const downloadPdfBtn = document.getElementById('downloadPdf');
const progressBar = document.querySelector('.progress-fill');
const progressContainer = document.getElementById('progress');
const pagesContainer = document.getElementById('pagesContainer');
const fileInput = document.getElementById('fileInput');

// Initialize Sortable
const sortable = new Sortable(pageGrid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    scroll: true,
    scrollSensitivity: 100,
    scrollSpeed: 20,
    forceAutoScrollFallback: true,
    autoScroll: true,
    scrollThreshold: 30,
    onEnd: () => {
        updatePageOrder();
        saveOrderBtn.disabled = false;
    }
});

// Event Listeners
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        await handlePdfUpload(file);
    } else {
        alert('Please upload a PDF file');
    }
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        await handlePdfUpload(file);
    } else if (file) {
        alert('Please upload a PDF file');
    }
});

saveOrderBtn.addEventListener('click', () => {
    downloadPdfBtn.click();
});

downloadPdfBtn.addEventListener('click', async () => {
    try {
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        
        const pdfDoc = await PDFLib.PDFDocument.create();
        const pages = Array.from(pageGrid.children);
        
        for (let i = 0; i < pages.length; i++) {
            const pageIndex = parseInt(pages[i].dataset.pageIndex);
            const [donorPage] = await pdfDoc.copyPages(currentPdf, [pageIndex]);
            pdfDoc.addPage(donorPage);
            progressBar.style.width = `${((i + 1) / pages.length) * 100}%`;
        }
        
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reordered.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        progressBar.style.width = '100%';
        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
        }, 1000);
        
    } catch (error) {
        console.error('Error saving PDF:', error);
        alert('Error saving PDF. Please try again.');
        progressContainer.style.display = 'none';
    }
});

async function handlePdfUpload(file) {
    try {
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        
        const arrayBuffer = await file.arrayBuffer();
        currentPdf = await PDFLib.PDFDocument.load(arrayBuffer);
        pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        pageGrid.innerHTML = '';
        pageOrder = [];
        
        const pageCount = pdfDoc.numPages;
        for (let i = 0; i < pageCount; i++) {
            const page = await pdfDoc.getPage(i + 1);
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Increase scale and set background
            const viewport = page.getViewport({ scale: 0.8 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Fill white background
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            await page.render({
                canvasContext: context,
                viewport: viewport,
                background: 'white'
            }).promise;
            
            const pageElement = createPageElement(canvas, i);
            pageGrid.appendChild(pageElement);
            pageOrder.push(i);
            
            progressBar.style.width = `${((i + 1) / pageCount) * 100}%`;
        }
        
        dropZone.style.display = 'none';
        pagesContainer.style.display = 'block';
        saveOrderBtn.disabled = true;
        
        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
        }, 1000);
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. Please try again.');
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
    }
}

function createPageElement(canvas, pageIndex) {
    const pageItem = document.createElement('div');
    pageItem.className = 'page-item';
    pageItem.dataset.pageIndex = pageIndex;
    
    const preview = document.createElement('div');
    preview.className = 'page-preview';
    preview.appendChild(canvas);
    
    const pageNumber = document.createElement('div');
    pageNumber.className = 'page-number';
    pageNumber.textContent = `Page ${pageIndex + 1}`;
    
    const actions = document.createElement('div');
    actions.className = 'page-actions';
    
    const previewBtn = document.createElement('button');
    previewBtn.className = 'page-action';
    previewBtn.innerHTML = '<i class="fas fa-search"></i>';
    previewBtn.onclick = () => previewPage(canvas.toDataURL());
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'page-action';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = () => deletePage(pageItem);
    
    actions.appendChild(previewBtn);
    actions.appendChild(deleteBtn);
    
    preview.appendChild(pageNumber);
    preview.appendChild(actions);
    pageItem.appendChild(preview);
    
    return pageItem;
}

function previewPage(dataUrl) {
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.style.display = 'flex';
    
    const content = document.createElement('div');
    content.className = 'preview-content';
    
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'preview-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    content.appendChild(closeBtn);
    content.appendChild(img);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

function deletePage(pageElement) {
    if (confirm('Are you sure you want to delete this page?')) {
        pageGrid.removeChild(pageElement);
        updatePageOrder();
        updatePageNumbers();
        saveOrderBtn.disabled = false;
    }
}

function updatePageOrder() {
    pageOrder = Array.from(pageGrid.children).map(el => parseInt(el.dataset.pageIndex));
}

function updatePageNumbers() {
    Array.from(pageGrid.children).forEach((pageItem, index) => {
        const pageNumber = pageItem.querySelector('.page-number');
        pageNumber.textContent = `Page ${index + 1}`;
    });
}

// Clean up function
function cleanupAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

// Clean up events
const cleanupEvents = ['beforeunload', 'unload', 'resize', 'move', 'focus', 'blur', 
                      'minimize', 'maximize', 'restore', 'close', 'open'];

cleanupEvents.forEach(event => {
    window.addEventListener(event, cleanupAutoScroll);
});