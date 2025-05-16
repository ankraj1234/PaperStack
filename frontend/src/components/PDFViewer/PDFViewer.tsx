import * as React from 'react';
import { Worker, Viewer, DocumentLoadEvent, PdfJs, Position, Button, PrimaryButton, Tooltip } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import {
  highlightPlugin,
  HighlightArea,
  MessageIcon,
  RenderHighlightContentProps,
  RenderHighlightsProps,
  RenderHighlightTargetProps,
} from '@react-pdf-viewer/highlight';
import { useLocation } from 'react-router-dom';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';

import ChatBot from '../ChatBot/ChatBot';

interface PDFViewerProps {
  pdfPath?: string;
}

interface Note {
  id: number;
  content: string;
  highlightAreas: HighlightArea[];
  quote: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfPath = '' }) => {
  const [message, setMessage] = React.useState('');
  const [notes, setNotes] = React.useState<Note[]>([]);
  const notesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const noteEles: Map<number, HTMLElement> = new Map();
  const [currentDoc, setCurrentDoc] = React.useState<PdfJs.PdfDocument | null>(null);
  
  let noteId = notes.length;

  const location = useLocation();
  const state = location.state as PDFViewerProps;

  const passedPath = state?.pdfPath || '';
  const fullUrl = `http://127.0.0.1:8000/${passedPath.replace(/\\/g, '/')}`;

  const handleDocumentLoad = (e: DocumentLoadEvent) => {
    setCurrentDoc(e.doc);
    if (currentDoc && currentDoc !== e.doc) {
      // User opens new document
      setNotes([]);
    }
  };

  const renderHighlightTarget = (props: RenderHighlightTargetProps) => (
    <div
      style={{
        background: '#eee',
        display: 'flex',
        position: 'absolute',
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
        transform: 'translate(0, 8px)',
        zIndex: 1,
      }}
    >
      <Tooltip
        position={Position.TopCenter}
        target={
          <Button onClick={props.toggle}>
            <MessageIcon />
          </Button>
        }
        content={() => <div style={{ width: '100px' }}>Add a note</div>}
        offset={{ left: 0, top: -8 }}
      />
    </div>
  );

  const renderHighlightContent = (props: RenderHighlightContentProps) => {
    const addNote = () => {
      if (message !== '') {
        const note: Note = {
          id: ++noteId,
          content: message,
          highlightAreas: props.highlightAreas,
          quote: props.selectedText,
        };
        setNotes(notes.concat([note]));
        props.cancel();
        setMessage(''); // Clear the message after adding
      }
    };

    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(0, 0, 0, .3)',
          borderRadius: '2px',
          padding: '8px',
          position: 'absolute',
          left: `${props.selectionRegion.left}%`,
          top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
          zIndex: 1,
        }}
      >
        <div>
          <textarea
            rows={3}
            style={{
              border: '1px solid rgba(0, 0, 0, .3)',
              width: '100%',
            }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: '8px',
          }}
        >
          <div style={{ marginRight: '8px' }}>
            <PrimaryButton onClick={addNote}>Add</PrimaryButton>
          </div>
          <Button onClick={props.cancel}>Cancel</Button>
        </div>
      </div>
    );
  };

  const jumpToNote = (note: Note) => {
    activateTab(3);
    const notesContainer = notesContainerRef.current;
    if (noteEles.has(note.id) && notesContainer) {
      notesContainer.scrollTop = noteEles.get(note.id)!.getBoundingClientRect().top;
    }
  };

  const renderHighlights = (props: RenderHighlightsProps) => (
    <div>
      {notes.map((note) => (
        <React.Fragment key={note.id}>
          {note.highlightAreas
            .filter((area) => area.pageIndex === props.pageIndex)
            .map((area, idx) => (
              <div
                key={idx}
                style={Object.assign(
                  {},
                  {
                    background: 'yellow',
                    opacity: 0.4,
                  },
                  props.getCssProperties(area, props.rotation)
                )}
                onClick={() => jumpToNote(note)}
              />
            ))}
        </React.Fragment>
      ))}
    </div>
  );

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget,
    renderHighlightContent,
    renderHighlights,
  });

  const { jumpToHighlightArea } = highlightPluginInstance;

  React.useEffect(() => {
    return () => {
      noteEles.clear();
    };
  }, []);

  const sidebarNotes = (
    <div
      ref={notesContainerRef}
      style={{
        overflow: 'auto',
        width: '100%',
      }}
    >
      {notes.length === 0 && <div style={{ textAlign: 'center' }}>There are no notes</div>}
      {notes.map((note) => {
        return (
          <div
            key={note.id}
            style={{
              borderBottom: '1px solid rgba(0, 0, 0, .3)',
              cursor: 'pointer',
              padding: '8px',
            }}
            onClick={() => jumpToHighlightArea(note.highlightAreas[0])}
            ref={(ref): void => {
              if (ref) {
                noteEles.set(note.id, ref as HTMLElement);
              }
            }}
          >
            <blockquote
              style={{
                borderLeft: '2px solid rgba(0, 0, 0, 0.2)',
                fontSize: '.75rem',
                lineHeight: 1.5,
                margin: '0 0 8px 0',
                paddingLeft: '8px',
                textAlign: 'justify',
              }}
            >
              {note.quote}
            </blockquote>
            {note.content}
          </div>
        );
      })}
    </div>
  );

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => {
      const tabs = [];

      if (defaultTabs[0]) tabs.push(defaultTabs[0]); // Bookmarks
      if (defaultTabs[1]) tabs.push(defaultTabs[1]); // Thumbnails

      tabs.push({
        content: sidebarNotes,
        icon: <MessageIcon />,
        title: 'Notes',
      });

      return tabs;
    },
  });
  const { activateTab } = defaultLayoutPluginInstance;

  
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <div style={{ height: '100vh' }}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <div
          style={{
            border: '1px solid rgba(0, 0, 0, 0.3)',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <Viewer 
            fileUrl={fullUrl} 
            plugins={[highlightPluginInstance, defaultLayoutPluginInstance]} 
            onDocumentLoad={handleDocumentLoad}
          />
        </div>
      </Worker>

      <button
        onClick={toggleChat}
        aria-label="Open Chat Bot"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '40px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#0078D4',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        🤖
      </button>

      {isChatOpen && <ChatBot onClose={toggleChat} />}
    </div>
  );
};

export default PDFViewer;