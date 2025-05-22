import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatBot.css';

const ChatBot = ({ onClose, paperId }) => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [size, setSize] = useState({ width: 320, height: 420 });

  const containerRef = useRef(null);
  const isResizing = useRef(false);

  useEffect(() => {
    const onMouseMove = (e) => {
        if (!isResizing.current || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();

        const newWidth = rect.right - e.clientX; 
        const newHeight = e.clientY - rect.top; 
        const maxWidth = 600;
        const minWidth = 250;
        const maxHeight = 700;
        const minHeight = 300;

        const adjustedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        const adjustedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        // Set new size and adjust left position
        setSize({ width: adjustedWidth, height: adjustedHeight });
    };

    const onMouseUp = () => {
        isResizing.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
    }, []);


  const startResizing = (e) => {
    e.preventDefault();
    isResizing.current = true;
  };

  const sendMessage = async () => {
    const userInput = input.trim();

    if (!userInput) return;

    setMessages((msgs) => [...msgs, { sender: 'user', text: userInput }]);
    setInput('');

    try {
      const paperIdToUse = paperId; 
      const topK = 2;     

      console.log(paperId);

      const queryParams = new URLSearchParams({
        query: userInput,
        paper_id: paperIdToUse.toString(),
        top_k: topK.toString(),
      });         

      const response = await fetch(`http://127.0.0.1:8000/chatbot?${queryParams.toString()}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setMessages((msgs) => [
        ...msgs,
        { sender: 'bot', text: data || 'No reply from model.' },
      ]);
    } catch (error) {
      console.error('Error talking to chatbot API:', error);
      setMessages((msgs) => [
        ...msgs,
        { sender: 'bot', text: 'Sorry, something went wrong while contacting the chatbot.' },
      ]);
    }
  };


  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div ref={containerRef} className="chatbot-container" style={{ width: size.width, height: size.height }}>
      <div className="chatbot-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chatbot-message ${msg.sender === 'bot' ? 'bot' : 'user'}`}>
            {msg.sender === 'bot' ? (
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            ) : (
              msg.text
            )}
          </div>
        ))}
      </div>

      <div className="chatbot-input-area">
        <textarea
          className="chatbot-input"
          rows={1}
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="chatbot-send-btn" onClick={sendMessage} aria-label="Send">
          ➤
        </button>
      </div>

      <div
        className="chatbot-resizer"
        onMouseDown={startResizing}
        aria-label="Resize chatbot window"
        role="separator"
      />
    </div>
  );
};

export default ChatBot;