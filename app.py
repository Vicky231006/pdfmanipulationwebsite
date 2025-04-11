import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from PIL import Image
import PyPDF2
import io
import uuid
import tempfile

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()  # Use system temp directory
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
ALLOWED_PDF_EXTENSIONS = {'pdf'}
MAX_FILES = 10  # Maximum number of files that can be merged at once
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB per file

def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def allowed_pdf(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PDF_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert')
def convert():
    return render_template('convert.html')

@app.route('/merge')
def merge():
    return render_template('merge.html')

@app.route('/reorder')
def reorder():
    return render_template('reorder.html')

@app.route('/api/convert', methods=['POST'])
def api_convert():
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files[]')
    if not files:
        return jsonify({'error': 'No files selected'}), 400

    # Create PDF
    output = io.BytesIO()
    first_image = True
    
    try:
        for file in files:
            if file and allowed_image(file.filename):
                img = Image.open(file)
                if img.mode == 'RGBA':
                    img = img.convert('RGB')
                if first_image:
                    img.save(output, 'PDF')
                    first_image = False
                else:
                    temp_output = io.BytesIO()
                    img.save(temp_output, 'PDF')
                    temp_output.seek(0)
                    
                    # Merge with existing PDF
                    existing_pdf = PyPDF2.PdfReader(output)
                    new_pdf = PyPDF2.PdfReader(temp_output)
                    pdf_writer = PyPDF2.PdfWriter()
                    
                    for page in existing_pdf.pages:
                        pdf_writer.add_page(page)
                    for page in new_pdf.pages:
                        pdf_writer.add_page(page)
                    
                    output.seek(0)
                    output.truncate()
                    pdf_writer.write(output)
        
        output.seek(0)
        return send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='converted.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/merge', methods=['POST'])
def api_merge():
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files[]')
    if not files or len(files) < 2:
        return jsonify({'error': 'At least two PDF files are required'}), 400
    
    if len(files) > MAX_FILES:
        return jsonify({'error': f'Maximum {MAX_FILES} files can be merged at once'}), 413

    try:
        merger = PyPDF2.PdfMerger()
        
        for file in files:
            if not file or not allowed_pdf(file.filename):
                return jsonify({'error': f'Invalid PDF file: {file.filename}'}), 400
            
            # Check file size
            file.seek(0, os.SEEK_END)
            size = file.tell()
            if size > MAX_FILE_SIZE:
                return jsonify({'error': f'File {file.filename} exceeds maximum size of 50MB'}), 413
            file.seek(0)
            
            try:
                merger.append(file)
            except Exception as e:
                return jsonify({'error': f'Error processing {file.filename}: {str(e)}'}), 400
        
        output = io.BytesIO()
        merger.write(output)
        merger.close()
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='merged.pdf'
        )
    except Exception as e:
        print(f"Error merging PDFs: {str(e)}")
        return jsonify({'error': 'Failed to merge PDFs. Please try again.'}), 500

@app.route('/api/reorder', methods=['POST'])
def api_reorder():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if not file or not allowed_pdf(file.filename):
        return jsonify({'error': 'Invalid file'}), 400
    
    try:
        pdf_reader = PyPDF2.PdfReader(file)
        pages = []
        for page in pdf_reader.pages:
            pages.append(page)
        
        # Save file temporarily and return its ID
        temp_id = str(uuid.uuid4())
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{temp_id}.pdf')
        with open(temp_path, 'wb') as f:
            pdf_writer = PyPDF2.PdfWriter()
            for page in pages:
                pdf_writer.add_page(page)
            pdf_writer.write(f)
        
        return jsonify({
            'id': temp_id,
            'num_pages': len(pages)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_order', methods=['POST'])
def api_save_order():
    data = request.json
    if not data or 'id' not in data or 'order' not in data:
        return jsonify({'error': 'Invalid request'}), 400
    
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{data['id']}.pdf")
    if not os.path.exists(temp_path):
        return jsonify({'error': 'File not found'}), 404
    
    try:
        pdf_reader = PyPDF2.PdfReader(temp_path)
        pdf_writer = PyPDF2.PdfWriter()
        
        # Add pages in new order
        for page_num in data['order']:
            pdf_writer.add_page(pdf_reader.pages[page_num])
        
        output = io.BytesIO()
        pdf_writer.write(output)
        output.seek(0)
        
        # Clean up temp file
        try:
            os.remove(temp_path)
        except:
            pass  # Ignore cleanup errors in serverless environment
        
        return send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='reordered.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 