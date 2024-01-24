'use client';

import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // 导入 Bootstrap
import MessageList from "./components/MessageList"; // 导入新的组件
import FileUploader from "./components/FileUploader_url";
import UploadedFilesSidebar from "./components/FileSidebar";
import Login from "./components/Login";

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
        document.title = "文档助手Chatbot";
    }, []); // 空依赖数组意味着这个效果仅在组件挂载时运行

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
                        document.title = `文档助手Chatbot - ${data.user_id}`;
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

    const handleLoginSuccess = () => {
        setIsLoggedIn(true); // 处理登录成功的逻辑
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
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
        // 建立 EventSource 连接
        const eventSource = new EventSource(url + 'memory', { withCredentials: true });
    
        // 监听消息事件
        eventSource.addEventListener('message', (event) => {
            const eventData = JSON.parse(event.data);
            const join_messages = eventData.data;
    
            // 处理消息，例如将其添加到消息列表
            const newMessageId = Date.now();
            setMessages((prevMessages) => [
            ...prevMessages,
            { type: "system", text: join_messages, role: "system", id: newMessageId },
            ]);
            // 关闭 SSE 连接
            eventSource.close();
        });
    
        // 监听错误事件
        eventSource.addEventListener('error', (event) => {
            console.error('Error occurred:', event);
        });
    };

    const sendMessage = async () => {
        const newMessageId = Date.now(); // 使用时间戳作为简单的唯一ID
        // 将用户输入和“思考中...”消息添加到消息列表
        setMessages((prevMessages) => [
            ...prevMessages,
            { type: "user", text: userInput },
            { type: "system", text: "思考中......", role: "system", id: newMessageId },
        ]);

        setIsSending(true);

const handleStreamResponse = async (
    reader: ReadableStreamDefaultReader
) => {
    const decoder = new TextDecoder();
    let accumulatedData = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        let messageText = decoder.decode(value, { stream: true });

        if (messageText.startsWith("data: ")) {
            try {
                messageText = messageText.replace(/data: /g, "");
                let messages = messageText.split("\n\n"); // 由于网络延迟可能导致多个JSON对象的数组，根据换行符分割
                messages.forEach(msg => {
                    msg = msg.trim();
                    if (msg !== "") {
                        try {
                            let data = JSON.parse(msg); // 解析每个JSON字符串
                            // console.log("Parsed Data:", data.data);
                            accumulatedData += data.data; // 累积 data 属性的值
                        } catch (e) {
                            console.error("Error parsing JSON:", e, "in message:", msg);
                            // 可以根据需要在这里添加 break 或 continue
                        }
                    }
                });

                // 以下是多个回复的特殊处理
                const pattern = /\n\*\*\*[^*]+?\*\*\*(?=\n|$)/g; // 匹配所有单独一行的“*** ***”
                const dashPattern = /-----/; // 检查是否存在“-----”
            
                if (pattern.test(accumulatedData)) {
                    if (dashPattern.test(accumulatedData)) {
                        // 如果存在“-----”，则清除所有“*** ***”
                        accumulatedData = accumulatedData.replace(pattern, '');
                    } else {
                        // 否则，仅保留最后一个“*** ***”
                        let matches = accumulatedData.match(pattern);
                        if (matches && matches.length > 1) {
                            // 移除除最后一个外的所有匹配项
                            for (let i = 0; i < matches.length - 1; i++) {
                                accumulatedData = accumulatedData.replace(matches[i], '');
                            }
                        }
                    }
                } else { accumulatedData = accumulatedData.replace(/\n\*\*\*[^*]+?\*\*\*/, '');
                }

                // 更新“思考中...”消息
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.id === newMessageId
                            ? { ...msg, text: accumulatedData, role: 'assistant' }
                            : msg
                    )
                );
            } catch (error) {
                console.error("Error parsing message:", error);
            }
        }
    }
};

        try {
            const response = await fetch(url + "message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_input: userInput,
                    prompt_template: selectedTemplate,
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
                handleStreamResponse(reader);
            } else {
                console.error("Response body is null");
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
        setUserInput("");
        setIsSending(false);
    };

    if (isLoading) {
        return <div>Loading...</div>; // 或者一个旋转器/加载器组件
    }
    
    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            {!isLoggedIn ? (
                <Login onLoginSuccess={handleLoginSuccess} />
            ) : (
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '80%', maxWidth: '600px' }}>
                <div className="row">
                <div className="col-12 text-center">
                    <br></br><h3>AI-assisted Writer</h3>
                </div>
                </div>
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
                    <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center', justifyContent: 'flex-end' }}>
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
                            <button 
                            onClick={handleMemory} 
                            style={{ float: "right", fontSize: "12px", border: '1px solid #ccc', borderRadius: '5px', padding: "5px 10px" }}
                            >
                            恢复记忆
                            </button>
                        </div>
                        <FileUploader onUpload={handleFileUpload} />{" "}
                    </div>
                </div>
                <UploadedFilesSidebar 
            uploadedFiles={uploadedFiles} 
            onFileSelect={handleFileSelect} 
            refreshTrigger={refreshTrigger} 
            />
            </ div>
        )}
    </div>
    );
}
