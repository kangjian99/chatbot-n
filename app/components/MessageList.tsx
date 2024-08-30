import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';

interface Message {
  type: 'user' | 'system' | 'image';
  role?: 'system' | 'assistant';
  text: string;
  imageUrl?: string; // 添加 imageUrl 字段来存储图片的 URL
}

interface MessageListProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const MessageList: React.FC<MessageListProps> = ({ messages, messagesEndRef }) => {
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<{ [key: number]: boolean }>({});
  const textRef = useRef<HTMLDivElement>(null);
  // 复制文本到剪贴板的函数
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        console.log('Text copied to clipboard');
        setShowCopyConfirmation(true);
        setTimeout(() => setShowCopyConfirmation(false), 2000); // 2秒后隐藏确认消息
      },
      (err) => console.error('Could not copy text: ', err)
    );
  };

  const containsMarkdownTableOrCodeBlock = (text: string) => {
    const hasCodeBlock = text.includes("```");
    // 匹配表格：查找是否有行以|开头和结尾，且至少有一行是分隔行（只包含|, -, 和空格）
    const lines = text.split('\n');
    const hasTableBorders = lines.some(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
    const hasSeparatorLine = lines.some(line => /^[\|\-\s]+$/.test(line.trim()));
    return hasTableBorders && hasSeparatorLine || hasCodeBlock;
  };

  const processText = (text: string) => {
    return text
      //.replace(/(<br\s*\/?>\s*)+/gi, '\n') // Replace consecutive <br> tags with a single \n
      .replace(/(<br\s*\/?>\s*)+-/gi, '|\n||-') // Replace consecutive <br>- tags with 
      .replace(/\n\n+(?=\d)/g, '\n');
  };

  const toggleExpand = (index: number) => {
    setExpandedMessages(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const truncateText = (text: string, lineCount: number) => {
    if (!textRef.current) return text;

    const tempDiv = document.createElement('div');
    tempDiv.style.width = `${textRef.current.offsetWidth}px`;
    tempDiv.style.font = window.getComputedStyle(textRef.current).font;
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.overflowWrap = 'break-word';
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    document.body.appendChild(tempDiv);

    const words = text.split(' ');
    let result = '';

    for (let i = 0; i < words.length; i++) {
      tempDiv.textContent = result + words[i] + ' ';
      if (tempDiv.clientHeight > lineCount * parseInt(window.getComputedStyle(textRef.current).lineHeight)) {
        break;
      }
      result += words[i] + ' ';
    }

    document.body.removeChild(tempDiv);
    return result.trim() + (result.length < text.length ? '...' : '');
  };

  const renderMessage = (msg: Message, index: number) => {
    if (msg.type === 'user') {
      const isExpanded = expandedMessages[index];
      const displayText = isExpanded ? msg.text : truncateText(msg.text, 10);

      return (
        <div key={index} style={{ textAlign: 'right', margin: '10px 5px' }}>
          <span
            ref={textRef}
            style={{
              padding: '6px 10px',
              borderRadius: '10px',
              background: '#BAE6FC',
              color: '#222222',
              display: 'inline-block',
              maxWidth: '60%',
              wordWrap: 'break-word',
              fontSize: '14px',
              cursor: 'default',
            }}
            onClick={() => copyToClipboard(msg.text)}
          >
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[gfm]}>{processText(displayText)}</ReactMarkdown>
            </div>
            {displayText !== msg.text && (
              <div 
                style={{ 
                  color: '#2285c7', 
                  cursor: 'pointer', 
                  marginTop: '5px', 
                  fontSize: '14px',
                  textAlign: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(index);
                }}
              >
                {isExpanded ? '收起' : '展开全部'}
              </div>
            )}
          </span>
        </div>
      );
    } else if (msg.type === 'image') {
      return (
        <div key={index} style={{ textAlign: 'right', margin: '10px 5px' }}>
          <img
            src={msg.imageUrl}
            alt="Uploaded"
            style={{ margin: '0 0 0 auto', maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
          />
        </div>
      );
    } else {
      return (
        <div key={index} style={{ textAlign: 'left', margin: '10px 5px' }}>
          <span
            style={{
              padding: '6px 10px',
              borderRadius: '10px',
              background: '#F2F1F2',
              color: '#374151',
              display: 'inline-block',
              maxWidth: containsMarkdownTableOrCodeBlock(msg.text) ? '80%' : '70%',
              wordWrap: 'break-word',
              fontSize: msg.role === 'system' ? '13px' : '15px',
              fontStyle: msg.role === 'system' ? 'italic' : 'normal',
              cursor: 'default',
            }}
            onClick={() => copyToClipboard(msg.text)}
          >
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[gfm]}>{processText(msg.text)}</ReactMarkdown>
            </div>
          </span>
        </div>
      );
    }
  };

  return (
    <div className="message-list-container">
      {messages.map(renderMessage)}
      {showCopyConfirmation && (
        <div style={{ fontSize: '13px', position: 'fixed', bottom: '50px', left: '50%', transform: 'translateX(-50%)', background: 'green', color: 'white', padding: '8px', borderRadius: '4px', zIndex: 1000 }}>
          已复制到剪贴板
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
