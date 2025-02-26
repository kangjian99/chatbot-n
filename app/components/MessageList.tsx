import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  type: 'user' | 'system' | 'image' | 'info';
  role?: 'system' | 'assistant';
  text: string;
  imageUrl?: string; // 添加 imageUrl 字段来存储图片的 URL
}

interface MessageListProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const MessageList: React.FC<MessageListProps> = ({ messages, messagesEndRef }) => {
  const [expandedMessages, setExpandedMessages] = useState<{ [key: number]: boolean }>({});
  const textRef = useRef<HTMLDivElement>(null);
  const [copiedMessageIds, setCopiedMessageIds] = useState<Set<number>>(new Set());

  const copyToClipboard = async (text: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageIds(prev => new Set(prev).add(messageId));
      setTimeout(() => {
        setCopiedMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
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

    // 创建临时DIV用于测量文本大小
    const tempDiv = document.createElement('div');
    tempDiv.style.width = `${textRef.current.offsetWidth}px`;
    tempDiv.style.font = window.getComputedStyle(textRef.current).font;
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.overflowWrap = 'break-word';
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    document.body.appendChild(tempDiv);

    // 获取行高
    const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
    const maxHeight = lineCount * lineHeight;
    
    // 如果文本很短，直接返回
    tempDiv.textContent = text;
    if (tempDiv.clientHeight <= maxHeight) {
      document.body.removeChild(tempDiv);
      return text;
    }
    
    // 二分查找合适的截断点
    let low = 1;
    let high = text.length;
    let mid;
    let result = "";
    
    while (low <= high) {
      mid = Math.floor((low + high) / 2);
      tempDiv.textContent = text.substring(0, mid) + "...";
      
      if (tempDiv.clientHeight <= maxHeight) {
        result = text.substring(0, mid);
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    document.body.removeChild(tempDiv);
    
    // 确保至少有一些内容
    if (result.length === 0 && text.length > 0) {
      // 如果二分查找失败，至少返回一些字符
      return text.substring(0, 20) + "...";
    }
    
    return result + "...";
  };

  const renderMessage = (msg: Message, index: number) => {
    const isCopied = copiedMessageIds.has(index);

    const copyButton = (
      <button
        onClick={() => copyToClipboard(msg.text, index)}
        className={`absolute bottom-1 right-1 p-1 rounded bg-white/80 flex items-center gap-1 text-xs shadow-sm hover:bg-white transition-opacity duration-200`}
        style={{ opacity: 0 }}
        title={isCopied ? "已复制" : "复制"}
      >
        {isCopied ? (
          <CheckIcon className="w-3.5 h-3.5" />
        ) : (
          <ClipboardIcon className="w-3.5 h-3.5" />
        )}
        {isCopied ? "已复制" : "复制"}
      </button>
    );

    if (msg.type === 'user') {
      const isExpanded = expandedMessages[index];
      const displayText = isExpanded ? msg.text : truncateText(msg.text, 6);

      return (
        <div key={index} className="flex flex-row-reverse items-start my-2.5 mx-0.5">
          <div className="flex-shrink-0 w-7 h-7 ml-1.5 mt-1 rounded-full bg-blue-50 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-500" />
          </div>
          <div 
            ref={textRef}
            className="relative group p-2.5 rounded-lg bg-blue-100 text-gray-900 max-w-[60%] break-words text-sm cursor-default 
              hover:shadow-md transition-shadow duration-200"
            style={{ letterSpacing: '0.04em' }}
            onMouseEnter={(e) => {
              const button = e.currentTarget.querySelector('button');
              if (button) button.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget.querySelector('button');
              if (button && !copiedMessageIds.has(index)) button.style.opacity = '0';
            }}
          >
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[gfm]}>{processText(displayText)}</ReactMarkdown>
            </div>
            {displayText !== msg.text && (
              <div 
                className="text-blue-600 cursor-pointer mt-1.5 text-xs text-center"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(index);
                }}
              >
                {isExpanded ? '收起' : '展开全部'}
              </div>
            )}
            {copyButton}
          </div>
        </div>
      );
    } else if (msg.type === 'image') {
      return (
        <div key={index} className="flex flex-row-reverse my-2.5 mx-0.5">
          <div className="flex-shrink-0 w-7 h-7 ml-1.5 mt-1 rounded-full bg-blue-50 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-500" />
          </div>
          <img
            src={msg.imageUrl}
            alt="Uploaded"
            className="max-w-[200px] max-h-[200px] rounded-lg hover:shadow-md transition-shadow duration-200"
          />
        </div>
      );
    } else if (msg.type === 'system' || msg.role === 'assistant') {
      return (
        <div key={index} className="flex items-start my-2.5 mx-0.5">
          {/* <div className="flex-shrink-0 w-5 mr-1 mt-2.5 flex items-center justify-center"></div> */}
          <div className="flex-shrink-0 w-7 h-7 mr-1.5 mt-1 rounded-full bg-gray-100 flex items-center justify-center">
            <Bot className="w-4 h-4 text-gray-600" />
        </div>
          <div
            className={`relative group p-2.5 rounded-lg bg-gray-100 text-gray-700 
              ${containsMarkdownTableOrCodeBlock(msg.text) ? 'max-w-[80%]' : 'max-w-[70%]'}
              break-words ${msg.role === 'system' ? 'text-xs italic' : 'text-[15px]'}
              hover:shadow-md transition-shadow duration-200`}
            style={{ letterSpacing: '0.04em' }}
            onMouseEnter={(e) => {
              const button = e.currentTarget.querySelector('button');
              if (button) button.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget.querySelector('button');
              if (button && !copiedMessageIds.has(index)) button.style.opacity = '0';
            }}
          >
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[gfm]}>{processText(msg.text)}</ReactMarkdown>
            </div>
            {copyButton}
          </div>
        </div>
      );
    } else if (msg.type === 'info') {
      return (
        <div key={index} className="flex items-start my-2.5 mx-0.5">
          <div className="w-7 h-7 mr-1.5" /> {/* 空白占位 */}
          <div className="relative group p-2.5 rounded-lg bg-gray-100 text-gray-700 text-xs italic"
            style={{ letterSpacing: '0.04em' }}>
            {msg.text}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="message-list-container">
      {messages.map(renderMessage)}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
