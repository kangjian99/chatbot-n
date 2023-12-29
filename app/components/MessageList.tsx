import React, { useState } from 'react';

interface Message {
  type: 'user' | 'system' | 'image';
  role?: 'system';
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

  return (
    <div style={{ height: '450px', overflowY: 'auto', marginBottom: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
      {messages.map((msg, index) => (
        <div key={index} style={{ textAlign: msg.type === 'user' ? 'right' : 'left', margin: '10px 0' }}>
          {msg.type === 'image' ? (
            <img
              src={msg.imageUrl}
              alt="Uploaded"
              style={{ margin: '0 0 0 auto', maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
            />
          ) : (
            <span
              style={{
                padding: '10px',
                borderRadius: '20px',
                background: msg.type === 'user' ? '#007bff' : '#eee',
                color: msg.type === 'user' ? 'white' : 'black',
                display: 'inline-block',
                maxWidth: '70%',
                wordWrap: 'break-word',
                fontSize: msg.role === 'system' ? '13px' : '15px',
                fontStyle: msg.role === 'system' ? 'italic' : 'normal',
                cursor: 'default', // 使用默认光标样式
              }}
              onClick={() => copyToClipboard(msg.text)} // 添加点击事件处理器
            >
          {/* 使用 dangerouslySetInnerHTML 渲染包含 HTML 的消息文本
          <div dangerouslySetInnerHTML={{ __html: msg.text }} /> */}
              {msg.text}
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
