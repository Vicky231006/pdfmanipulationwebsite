# PDF Manipulator

A powerful web application for PDF manipulation built with Flask. This application allows users to:
- Convert images to PDF
- Merge multiple PDFs into a single document
- Reorder PDF pages with drag-and-drop functionality
- Delete pages from PDFs
- Replace pages in PDFs

## Features

1. **Image to PDF Conversion**
   - Supports various image formats (PNG, JPG, JPEG, GIF)
   - Drag and drop interface
   - Multiple image upload support

2. **PDF Merge**
   - Combine multiple PDFs into one
   - Preview PDFs before merging
   - Drag and drop interface

3. **PDF Page Management**
   - Reorder pages with drag and drop
   - Delete individual pages
   - Replace pages with new ones
   - Preview all pages

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd pdf-manipulator
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the application:
```bash
flask run
```

The application will be available at `http://localhost:5000`

## Technical Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **PDF Processing**: PyPDF2, Pillow
- **UI Components**: Drag and Drop API, Custom CSS

## License

MIT License 