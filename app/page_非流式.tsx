'use client';

import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // 导入 Bootstrap
import MessageList from "./components/MessageList"; // 导入新的组件
import FileUploader from "./components/FileUploader";
import UploadedFilesSidebar from "./components/FileSidebar";

const url = process.env.NEXT_PUBLIC_API_URL;

interface Message {
  type: 'user' | 'system';
  text: string;
  id?: number;
}

export default function Home() {
    const initialMessages: Message[] = [
        {
          type: "system",
          text: "请提问，根据文档问答请先选择文件并上传",
        },
      ];
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [userInput, setUserInput] = useState<string>('');
    const [isSending, setIsSending] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(false);

    useEffect(() => {
        document.title = "文档助手Chatbot";
    }, []); // 空依赖数组意味着这个效果仅在组件挂载时运行

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 增加状态变量用于跟踪选择的 prompt_template
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [prompts, setPrompts] = useState({});

    useEffect(() => {
        fetch(url + "prompts", {
            credentials: "include",
        })
            .then(response => response.json())
            .then(data => {
                setPrompts(data);
                // 设置默认选中的模板（如果有）
                if (data && Object.keys(data).length > 0) {
                    setSelectedTemplate(Object.keys(data)[0]);
                }
            })
            .catch(error => console.error('Error fetching prompts:', error));
    }, []);
    // 新增文件上传逻辑
    const handleFileUpload = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(url + "upload", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (response.ok) {
                alert("文件上传成功！较长文档需等待系统处理10秒以上再检索。");
                setSelectedTemplate('1')  // 直接设定模板为文档问答
                setUploadedFiles(prevFiles => [...prevFiles, file.name]); // 更新上传文件列表
                setSelectedFileName(file.name); // 设置最新上传的文件为选中状态
            } else {
                alert("文件上传失败！");
            }
        } catch (error) {
            console.error("上传错误:", error);
        }
        setRefreshTrigger(prev => !prev); // 改变触发器状态
    };

    const handleFileSelect = (fileName: string) => {
        setSelectedFileName(fileName);
        setSelectedTemplate('1')  // 直接设定模板为文档问答
    };    

    const sendMessage = async () => {
        const newMessageId = Date.now(); // 使用时间戳作为简单的唯一ID
        // 将用户输入和“思考中...”消息添加到消息列表
        setMessages(prevMessages => [
            ...prevMessages, 
            { type: 'user', text: userInput },
            { type: 'system', text: '思考中......', id: newMessageId }
        ]);
    
        setIsSending(true);

        try {
            const response = await fetch(url + 'message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    user_input: userInput,
                    prompt_template: selectedTemplate, // 发送选择的模板
                    selected_file: selectedFileName // 将选中的文件名添加到请求中
                }),
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // 更新“思考中...”消息为实际的回复
            setMessages(prevMessages => prevMessages.map(msg => 
                msg.id === newMessageId ? { ...msg, text: data } : msg
            ));
        } catch (error) {
            console.error('Error sending message:', error);
            // 可以在这里处理错误
        }
        setUserInput('');
        setIsSending(false);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '80%', maxWidth: '600px' }}>
            <MessageList
                        messages={messages}
                        messagesEndRef={messagesEndRef}
                    />{" "}
                 <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center' }}>
                    {/* 下拉选择列表 */}
                    <select style={{width: "175px"}} value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="custom-select" >
                        {Object.entries(prompts).map(([key, value], index) => (
                            <option key={key} value={index}>{typeof value === 'string' ? value : String(value)}</option>
                        ))}
                    </select>
                    {/* 输入框 */}
                    <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    style={{
                        fontSize: '14px',
                        flex: 1,
                        padding: '6px',
                        paddingLeft: '10px',
                        borderRadius: '5px',
                        border: '1px solid #ccc',
                        marginRight: '5px',
                    }}
                    disabled={isSending}
                    rows={3}
                    placeholder="在此输入..."
                />
                    <button 
                        onClick={sendMessage} 
                        style={{ 
                            padding: '5px', 
                            borderRadius: '5px', 
                            border: '1px solid #ccc', 
                            background: isSending ? '#ccc' : '#007bff', 
                            color: isSending ? '#666' : 'white',
                            width: '70px',
                            marginRight: "5px",
                            fontSize: "14px",
                        }}
                        disabled={isSending}
                    >
                        {isSending ? '已发送' : '发送'}
                    </button>
                </div>
                <FileUploader onUpload={handleFileUpload} />{" "}
            </div>
            <UploadedFilesSidebar 
        uploadedFiles={uploadedFiles} 
        onFileSelect={handleFileSelect} 
        refreshTrigger={refreshTrigger} 
    />    </div>
    );
}
