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
  Trigger,
} from '@react-pdf-viewer/highlight';
import { useLocation } from 'react-router-dom';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';

import ChatBot from '../ChatBot/ChatBot';

interface PDFViewerProps {
  pdfPath?: string;
  paperId?: number; 
}

interface Note {
  id: number;
  content: string;
  highlightAreas: HighlightArea[];
  quote: string;
}

// Map to store notes for each PDF document
interface NotesMap {
  [pdfPath: string]: Note[];
}

const STORAGE_KEY = 'pdf_viewer_notes';

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfPath = '', paperId }) => {
  const [message, setMessage] = React.useState('');
  // Store notes for each PDF path
  const [allNotes, setAllNotes] = React.useState<NotesMap>(() => {
    // Load saved notes from localStorage on component mount
    try {
      const savedNotes = localStorage.getItem(STORAGE_KEY);
      return savedNotes ? JSON.parse(savedNotes) : {};
    } catch (error) {
      console.error('Error loading notes from localStorage:', error);
      return {};
    }
  });
  
  // Current PDF notes
  const [currentNotes, setCurrentNotes] = React.useState<Note[]>([]);
  const notesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const noteEles: Map<number, HTMLElement> = new Map();
  const [currentDoc, setCurrentDoc] = React.useState<PdfJs.PdfDocument | null>(null);
  
  // Generate a unique ID for new notes
  const getNextNoteId = React.useCallback(() => {
    // Find the highest existing ID across all documents and increment by 1
    let highestId = 0;
    Object.values(allNotes).forEach(docNotes => {
      docNotes.forEach(note => {
        if (note.id > highestId) highestId = note.id;
      });
    });
    return highestId + 1;
  }, [allNotes]);

  const fullUrl = `http://127.0.0.1:8000/${pdfPath.replace(/\\/g, '/')}`;

  // Save notes to localStorage whenever they change
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allNotes));
    } catch (error) {
      console.error('Error saving notes to localStorage:', error);
    }
  }, [allNotes]);

  // Load notes for the current PDF document
  React.useEffect(() => {
    if (pdfPath) {
      // Set current notes to those associated with the current PDF path
      const existingNotes = allNotes[pdfPath] || [];
      setCurrentNotes(existingNotes);
    }
  }, [pdfPath, allNotes]);

  const handleDocumentLoad = (e: DocumentLoadEvent) => {
    setCurrentDoc(e.doc);
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
    // Use a regular DOM ref instead of React.useRef to avoid eslint warnings
    let textareaElement: HTMLTextAreaElement | null = null;
    
    setTimeout(() => {
      if (textareaElement) {
        textareaElement.focus();
      }
    }, 100);
    
    const addNote = () => {
      if (message !== '') {
        const newNoteId = getNextNoteId();
        const note: Note = {
          id: newNoteId,
          content: message,
          highlightAreas: props.highlightAreas,
          quote: props.selectedText,
        };
        
        // Update the notes for the current PDF path
        const updatedNotes = [...currentNotes, note];
        setCurrentNotes(updatedNotes);
        
        // Update the global notes map
        setAllNotes(prev => ({
          ...prev,
          [pdfPath]: updatedNotes
        }));
        
        props.cancel();
        setMessage(''); // Clear the message after adding
        
        // Automatically switch to the notes tab after adding a note
        setTimeout(() => activateTab(3), 100);
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
            ref={(el) => { textareaElement = el; }}
            rows={3}
            style={{
              border: '1px solid rgba(0, 0, 0, .3)',
              width: '100%',
            }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add your note here..."
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
      {currentNotes.map((note) => (
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
    trigger: 'selection' as Trigger, // Automatically show the highlight panel on text selection
  });

  const { jumpToHighlightArea } = highlightPluginInstance;

  React.useEffect(() => {
    return () => {
      noteEles.clear();
    };
  }, []);

  // Add function to delete a note
  const deleteNote = (noteId: number) => {
    // Filter out the note with the given ID
    const updatedNotes = currentNotes.filter(note => note.id !== noteId);
    
    // Update current notes
    setCurrentNotes(updatedNotes);
    
    // Update the global notes map
    setAllNotes(prev => ({
      ...prev,
      [pdfPath]: updatedNotes
    }));
  };

  const sidebarNotes = (
    <div
      ref={notesContainerRef}
      style={{
        overflow: 'auto',
        width: '100%',
      }}
    >
      {currentNotes.length === 0 && <div style={{ textAlign: 'center' }}>There are no notes</div>}
      {currentNotes.map((note) => {
        return (
          <div
            key={note.id}
            style={{
              borderBottom: '1px solid rgba(0, 0, 0, .3)',
              padding: '8px',
              position: 'relative',
            }}
            ref={(ref): void => {
              if (ref) {
                noteEles.set(note.id, ref as HTMLElement);
              }
            }}
          >
            <div 
              style={{ 
                cursor: 'pointer',
                paddingRight: '24px' // Make room for delete button
              }}
              onClick={() => jumpToHighlightArea(note.highlightAreas[0])}
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
            
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the parent onClick
                deleteNote(note.id);
              }}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#d32f2f',
                fontSize: '16px',
                padding: '4px',
                borderRadius: '4px',
              }}
              title="Delete note"
            >
              ✕
            </button>
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

      {isChatOpen && <ChatBot onClose={toggleChat} paperId={paperId} />}
    </div>
  );
};

export default PDFViewer;