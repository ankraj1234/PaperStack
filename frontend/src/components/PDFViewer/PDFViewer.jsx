import React from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { useLocation } from 'react-router-dom';

const PDFViewer = () => {
  const location = useLocation();
  const passedPath = location.state?.pdfPath || '';
  const fullUrl = `http://127.0.0.1:8000/${passedPath.replace(/\\/g, '/')}`;

  return (
    <div style={{ height: '100vh' }}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer fileUrl={fullUrl} />
      </Worker>
    </div>
  );
};

export default PDFViewer;
