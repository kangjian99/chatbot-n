'use client';

import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // 导入 Bootstrap
import MessageList from "./components/MessageList"; // 导入新的组件
import FileUploader from "./components/FileUploader_url";
import UploadedFilesSidebar from "./components/FileSidebar";
import ThreadsSidebar from "./components/ThreadsSidebar";
import Login from "./components/Login";
import { handleStreamResponse } from './components/handleStreamResponse';

const url = process.env.NEXT_PUBLIC_API_URL;

interface Message {
  type: 'user' | 'system';
  role?: 'system' | 'assistant';
  text: string;
  id?: number;
}

export default function Home() {
    const initialMessages: Message[] = [
        {
          type: "system",
          role: "system",
          text: "请提问，文档问答请先选择文件并上传；根据文档内容撰写文章指令，需以“写作”开头。",
        },
      ];
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [user_id, setUser_id] = useState<string>('');
    const [thread_id, setThread_id] = useState<string>('');
    const [thread_name, setThread_name] = useState<string>('');
    const [userInput, setUserInput] = useState<string>('');
    const [isSending, setIsSending] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(false);
    const [nrangeValue, setNrangeValue] = useState(3);
    const [isLoggedIn, setIsLoggedIn] = useState(false); 
    const [isLoading, setIsLoading] = useState(true); // 新增状态来追踪加载状态

    useEffect(() => {
        document.title = `文档助手Chatbot - ${user_id}`;
      }, [user_id]); // 空依赖数组意味着这个效果仅在组件挂载时运行，非空则在user_id更新后执行

    useEffect(() => {
        // 检查用户是否已登录
        const checkSession = async () => {
            try {
                const response = await fetch(url + "check_session", {
                    credentials: "include",
                });
                if (response.ok) {
                    const data = await response.json();
                    setIsLoggedIn(true);
                    if (data.user_id) {
                        setUser_id(data.user_id);
                    }
                } else {
                    setIsLoggedIn(false);
                }
            } catch (error) {
                console.error("检查会话失败:", error);
            } finally {
                setIsLoading(false); // 检查完成后取消加载状态
            }
        };
        checkSession();
    }, []);

    const handleLoginSuccess = (username: string) => {
        setIsLoggedIn(true); // 处理登录成功的逻辑
        setUser_id(username);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 增加状态变量用于跟踪选择的 prompt_template
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [prompts, setPrompts] = useState([]);

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
        formData.append("user_id", user_id);

        try {
            const response = await fetch(url + "upload", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (response.ok) {
                alert("文件上传成功！较长文档需等待系统处理10秒以上再检索。");
                setSelectedTemplate('1')  // 直接设定模板为文档问答
                if (!uploadedFiles.includes(file.name)) {
                    setUploadedFiles(prevFiles => [...prevFiles, file.name]); // 更新上传文件列表
                }
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

const handleMemory = async () => {
    try {
        const response = await fetch(`${url}memory?user_id=${encodeURIComponent(user_id)}&thread_id=${thread_id}`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const eventData = await response.json();
        const newMessages = eventData.map((data: any, index: number) => {
            try {
                const newMessageId = Date.now() + index; // 使用时间戳和索引作为唯一ID
                if (data.hasOwnProperty('User')) {
                    return { type: "user", text: data.User, id: newMessageId };
                } else if (data.hasOwnProperty('Info')) {
                    return { type: "system", text: data.Info, role: "system", id: newMessageId };
                } else if (data.hasOwnProperty('Assistant')) {
                    return { type: "system", text: data.Assistant, id: newMessageId };
                }
            } catch (error) {
                console.error('Error parsing JSON:', error, 'in message:', data);
                return null; // 如果解析失败，返回 null 或者忽略该消息
            }
        }).filter((message:string): message is NonNullable<typeof message> => message !== null); // 过滤掉解析失败的消息

        setMessages((prevMessages) => [
            ...prevMessages,
            ...newMessages,
        ]);
    } catch (error) {
        console.error('Error occurred:', error);
    }
};

    const sendMessage = async () => {
        const newMessageId = Date.now(); // 使用时间戳作为简单的唯一ID
        // 检查用户输入是否为空
        if (!userInput.trim()) {
            setMessages((prevMessages) => [
                ...prevMessages,
                { type: "system", text: "发送信息不能为空...", role: "system", id: newMessageId },
            ]);
            return;
        } else {
            // 将用户输入和“思考中...”消息添加到消息列表
            setMessages((prevMessages) => [
                ...prevMessages,
                { type: "user", text: userInput },
                { type: "system", text: "思考中......", role: "system", id: newMessageId },
            ]);
            setIsSending(true);
        }

        try {
            const response = await fetch(url + "message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_id: user_id,
                    user_input: userInput,
                    thread_id: thread_id,
                    selected_template: selectedTemplate,
                    prompt_template: prompts[Number(selectedTemplate)],
                    selected_file: selectedFileName, // 将选中的文件名添加到请求中
                    n: nrangeValue
                }), // 发送选择的模板
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // 处理流式响应
            // console.log(response, response.body)
            if (response.body) {
                const reader = response.body.getReader();
                handleStreamResponse(reader, setMessages, newMessageId);
            } else {
                console.error("Response body is null");
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
        setUserInput("");
        setIsSending(false);
    };

    const handleThreadSelect = (thread: any) => {
        // Handle the thread selection, perhaps by setting state or performing an action
        setThread_id(thread.id);
        setThread_name(thread.name);
    };

    useEffect(() => {
        if (!thread_id) return;
        if (thread_name != '新对话') {
            setMessages([])
            handleMemory();
        } else {
            setMessages(initialMessages)
        }
    }, [thread_id]);

    if (isLoading) {
        return <div>Loading...</div>; // 或者一个旋转器/加载器组件
    }
    
    return (
        <div>
            {!isLoggedIn ? (
                <Login onLoginSuccess={handleLoginSuccess} />
            ) : (
                    <main className="main-container">
                    <header className="header">
                        <div className="row">
                        <div className="col-12 text-center">
                            <br></br><h3>AI-assisted Writer</h3>
                        </div>
                        </div>
                    </header>
                    <nav className="left-sidebar">
                        <ThreadsSidebar onThreadSelect={handleThreadSelect} user_id={user_id} len={messages.length}/>
                    </nav>
                    <div className="main-content" style={{ padding: '20px 25px' }}>
                    <MessageList
                            messages={messages}
                            messagesEndRef={messagesEndRef}
                        />{" "}
                    <div style={{ display: 'flex', paddingLeft: '80px', paddingRight: '80px', marginBottom: '20px', alignItems: 'center' }}>
                        {/* 下拉选择列表 */}
                        <select style={{width: "200px"}} value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="custom-select" >
                            {prompts.map(([key, value], index) => (
                                <option key={key} value={index}>{key}</option>
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
                            marginLeft: '10px',
                            marginRight: '20px',
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
                    <div style={{ display: 'flex', paddingLeft: '80px', paddingRight: '80px', marginBottom: '0px', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', marginBottom: '15px', alignItems: 'center' }}>
                                <label style={{ marginRight: '10px', fontSize: '13px' }}>Choices</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="3"
                                        value={nrangeValue}
                                        onChange={(e) => setNrangeValue(Number(e.target.value))}
                                        className="form-range"
                                        style={{ marginRight: '10px', width: "80px" }}
                                        title={'回复数量1~3'}
                                    />
                                <span style={{ marginRight: '45px', fontSize: '13px' }}>{nrangeValue}</span>
                            </div>
                        </div>
                        <FileUploader onUpload={handleFileUpload} />{" "}
                    </div>

                    </div>
                    <nav className="right-sidebar">
                        <UploadedFilesSidebar 
                        uploadedFiles={uploadedFiles} 
                        onFileSelect={handleFileSelect} 
                        refreshTrigger={refreshTrigger} 
                        user_id={user_id} 
                        />
                    </nav>
                    <footer className="footer">
                        {/* Add footer content if needed */}
                    </footer>
                    </main>
        )}
    </div>
    );
}
