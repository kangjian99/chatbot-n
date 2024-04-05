import React, { useState } from 'react';
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
  const containsMarkdownTable = (text: string) => {
    // 匹配表格：查找是否有行以|开头和结尾，且至少有一行是分隔行（只包含|, -, 和空格）
    const lines = text.split('\n');
    const hasTableBorders = lines.some(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
    const hasSeparatorLine = lines.some(line => /^[\|\-\s]+$/.test(line.trim()));
    return hasTableBorders && hasSeparatorLine;
  };
  const processText = (text: string) => {
    return text
      .replace(/(<br\s*\/?>\s*)+/gi, '\n') // Replace consecutive <br> tags with a single \n
      .replace(/\n\n+(?=\d)/g, '\n');
  };

  return (
    <div className="message-list-container">
      {messages.map((msg, index) => (
        <div key={index} style={{ textAlign: msg.type === 'user' ? 'right' : 'left', margin: '10px 5px' }}>
          {msg.type === 'image' ? (
            <img
              src={msg.imageUrl}
              alt="Uploaded"
              style={{ margin: '0 0 0 auto', maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
            />
          ) : (
            <span
              style={{
                padding: '6px 10px',  // 上下 6px，左右 10px
                borderRadius: '10px',
                background: msg.type === 'user' ? '#BAE6FC' : '#eee',
                color: msg.type === 'user' ? 'black' : '#374151',
                display: 'inline-block',
                maxWidth: msg.type === 'user' ? '60%' : containsMarkdownTable(msg.text) ? '90%' : '70%',
                wordWrap: 'break-word',
                fontSize: msg.role === 'system' ? '13px' : '15px',
                fontStyle: msg.role === 'system' ? 'italic' : 'normal',
                cursor: 'default', // 使用默认光标样式
              }}
              onClick={() => copyToClipboard(msg.text)} // 添加点击事件处理器
            >
                <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[gfm]}>{processText(msg.text)}</ReactMarkdown>
                </div>
            </span>
          )}
        </div>
      ))}
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
