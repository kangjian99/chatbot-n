'use client';

import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // 导入 Bootstrap
import MessageList from "./components/MessageList"; // 导入新的组件
import FileUploader from "./components/FileUploader";
import UploadedFilesSidebar from "./components/FileSidebar";
import ThreadsSidebar from "./components/ThreadsSidebar";
import Login from "./components/Login";
import { handleStreamResponse } from './components/handleStreamResponse';
import { saveToLocalStorage, loadFromLocalStorage, cleanUpExpiredLocalStorage } from './components/localStorageUtil';

const url = process.env.NEXT_PUBLIC_API_URL;
const default_n = process.env.NEXT_PUBLIC_API_N || 2;
const default_k = process.env.NEXT_PUBLIC_API_MAX_K || 10;
const headline = process.env.NEXT_PUBLIC_API_HEADLINE || "AI 知识库管理助手";

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
          text: "请提问，文档问答请先选择文件并上传；\n根据文档内容撰写文章，提示词需以“写作”或“总结”开头。\n【举例】 \n写作：xxxxxx (提示词要素包括且不限于：文章主题、核心信息/内容关键词、字数等)",
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
    const [krangeValue, setKrangeValue] = useState(Number(default_k));
    const [isLoggedIn, setIsLoggedIn] = useState(false); 
    const [isLoading, setIsLoading] = useState(true); // 新增状态来追踪加载状态
    const [memoryLoading, setMemoryLoading] = useState(false);

    useEffect(() => {
        document.title = `${headline} - ${user_id}`;
      }, [user_id]); // 空依赖数组意味着这个效果仅在组件挂载时运行，非空则在user_id更新后执行
        
      useEffect(() => {
        // 尝试从localStorage加载登录状态
        const sessionInfo = loadFromLocalStorage('session');
        if (sessionInfo && sessionInfo.isLoggedIn && sessionInfo.user_id) {
            setIsLoggedIn(true);
            setUser_id(sessionInfo.user_id);
            setIsLoading(false);
        } else {
            // 如果本地没有有效的登录信息，则检查会话状态
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
                            // 保存会话信息到localStorage
                            saveToLocalStorage('session', { isLoggedIn: true, user_id: data.user_id });
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
        }
    }, []);    

    const handleLoginSuccess = (username: string) => {
        setIsLoggedIn(true);
        setUser_id(username);
        // 登录成功后，保存用户ID和登录状态
        saveToLocalStorage('session', { isLoggedIn: true, user_id: username });
    };    

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 增加状态变量用于跟踪选择的 prompt_template
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [prompts, setPrompts] = useState<[string, string][]>([]);

    useEffect(() => {
        // 尝试从localStorage加载prompts
        const cachedPrompts = loadFromLocalStorage('prompts');
        if (cachedPrompts) {
            setPrompts(cachedPrompts);
        }
        fetch(url + "prompts", {
            credentials: "include",
        })
            .then(response => response.json())
            .then(data => {
                setPrompts(data);
                saveToLocalStorage('prompts', data); // 保存到localStorage
                if (data && Object.keys(data).length > 0) {
                    setSelectedTemplate(Object.keys(data)[0]);
                }
            })
            .catch(error => console.error('Error fetching prompts:', error));
    }, []);

    useEffect(() => {
        cleanUpExpiredLocalStorage();
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
                setSelectedTemplate('0')  // 直接设定模板为文档问答
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
        setSelectedTemplate('0')  // 直接设定模板为文档问答
    };    

    const handleMemory = async () => {
        // 尝试从本地存储中加载记忆数据
        const cachedEventData = loadFromLocalStorage(`memory-${user_id}-${thread_id}`);
        if (cachedEventData) {
            updateMessagesUI(cachedEventData);  // 如果找到了本地数据，先用它更新UI
        }
        else {
          try {
              setMemoryLoading(true)
              const response = await fetch(`${url}memory?user_id=${encodeURIComponent(user_id)}&thread_id=${thread_id}`, {
                  credentials: 'include',
              });
    
              if (!response.ok) {
                  throw new Error('Network response was not ok');
              }
    
              const eventData = await response.json();
              updateMessagesUI(eventData);
              // 更新本地存储
              saveToLocalStorage(`memory-${user_id}-${thread_id}`, eventData);
              //saveToLocalStorage('memory', eventData); // thread_id没有本地存储
              setMemoryLoading(false)
          } catch (error) {
              console.error('Error occurred:', error);
          }
        }
    };
    
    // 抽离更新UI的逻辑到一个单独的函数
    const updateMessagesUI = (eventData: any[]) => {
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
        }).filter((message: any): message is NonNullable<typeof message> => message !== null); // 过滤掉解析失败的消息
    
        setMessages((prevMessages) => [
            ...prevMessages,
            ...newMessages,
        ]);
    };
{/* // thread_id没有本地存储
    useEffect(() => {
        const cachedEventData = loadFromLocalStorage('memory');
        if (cachedEventData) {
            updateMessagesUI(cachedEventData);
        }
    }, []);
*/}
    useEffect(() => {
        if (!thread_id) return;
        if (thread_name != '新对话') {
            setMessages([])
            handleMemory();
        } else {
            setMessages(initialMessages)
        }
    }, [thread_id]);
    
    function splitText(text: string, max_length: number, maxChunkSize: number, preferSeparator: string = '##'): string[] {
        if (text.length <= maxChunkSize) {
            return [text];
        }

        // Initial step to potentially truncate text based on max_length and count of English characters
        const enChars = text.match(/[a-zA-Z]/g) || [];
        if (enChars.length > max_length) {
            const lastNewline = text.lastIndexOf('\n', max_length);
            if (lastNewline !== -1) {
                text = text.substring(0, lastNewline);
            }
        }
    
        const result: string[] = [];
        let start = 0;
        let end = 0;
    
        while (start < text.length) {
            end = start + maxChunkSize;
            if (end < text.length) {
                let splitPoint = text.lastIndexOf(preferSeparator, end);
                if (splitPoint !== -1 && splitPoint > start) {
                    end = splitPoint;
                } else {
                    // Finding the last capital letter at the start of a line
                    const matches = [...text.substring(start, end).matchAll(/(?<=\n)[A-Z]/g)];
                    if (matches && matches.length > 0) {
                        end = start + matches[matches.length - 1].index;
                    }
                }
            }
            result.push(text.substring(start, end));
            start = end;
        }
    
        // Post-processing to merge short last segment
        if (result.length > 1 && result[result.length - 1].length < 200) {
            result[result.length - 2] += result.pop();
        }
    
        return result;
    }    

    const sendMessage = async () => {
        let newMessageId = Date.now(); // 使用时间戳作为简单的唯一ID
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

        if (userInput == "refresh") {
            saveToLocalStorage(`memory-${user_id}-${thread_id}`, "")
            handleMemory()
        }
        else {
            const selectedPrompt = prompts[Number(selectedTemplate)];

            let chunks;
            if (selectedPrompt[0].includes("译")) {
                // 当选定的模板中包含 "特定字符" 时，分割文本
                chunks = splitText(userInput, 50000, 8000);
            } else {
                // 否则，直接使用整个 userInput
                chunks = [userInput];
            }
        
            for (const [index, chunk] of chunks.entries()) {
                const isLastChunk = index === chunks.length - 1;
                //console.log(index, chunk);
                try {
                    const response = await fetch(url + "message", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            user_id: user_id,
                            user_input: chunk,
                            thread_id: thread_id,
                            selected_template: selectedTemplate,
                            prompt_template: selectedPrompt,
                            selected_file: selectedFileName,
                            max_k: krangeValue
                        }),
                        credentials: "include",
                    });
    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
    
                    if (response.body) {
                        try {
                            const reader = response.body.getReader();
                            const accumulatedData = await handleStreamResponse(reader, setMessages, newMessageId);
                            if (accumulatedData) {
                                let cachedEventData = loadFromLocalStorage(`memory-${user_id}-${thread_id}`) || [];
                                const formattedTime = new Date().toLocaleString("zh-CN", {timeZone: "Asia/Shanghai"}).slice(0, -3);
                                cachedEventData.push({ User: userInput }, { Assistant: accumulatedData }, { Info: formattedTime });
                                if (cachedEventData.length > 60) cachedEventData = cachedEventData.slice(-60); // 保留20条对话记录
                                saveToLocalStorage(`memory-${user_id}-${thread_id}`, cachedEventData);                           
                                if (!isLastChunk) {
                                    newMessageId = Date.now(); // 使用时间戳作为简单的唯一ID
                                    setMessages((prevMessages) => [
                                    ...prevMessages,
                                    { type: "user", text: "continue" },
                                    { type: "system", text: "请等待输出下一部分", role: "system", id: newMessageId },
                                ]);
                                }
                            }
                        } catch (error) {
                            console.error("Error handling stream response:", error);
                        }
                    } else {
                        console.error("Response body is null");
                    }
                } catch (error) {
                    console.error("Error sending message:", error);
                }
            }
        }
        setUserInput("");
        setIsSending(false);
    };

    const handleThreadSelect = (thread: any) => {
        // Handle the thread selection, perhaps by setting state or performing an action
        setThread_id(thread.id);
        setThread_name(thread.name);
    };

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
                        <div className="row" style={{ marginTop: '10px' }}>
                        <div className="col-12 text-center">
                            <h3>{headline}</h3>
                        </div>
                        </div>
                    </header>
                    <nav className="left-sidebar">
                    <div className="sidebar-content">
                        <ThreadsSidebar onThreadSelect={handleThreadSelect} user_id={user_id} len={messages.length}/>
                    </div>
                    </nav>
                    <div className="center-container">
                    <div className="main-content">
                    <MessageList
                            messages={messages}
                            messagesEndRef={messagesEndRef}
                        />{" "}
                    <div style={{ display: 'flex', paddingLeft: '75px', paddingRight: '75px', marginBottom: '15px', alignItems: 'center' }}>
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
                                background: isSending || memoryLoading ? '#ccc' : '#0D6FFE', 
                                color: isSending || memoryLoading ? '#666' : 'white',
                                width: '70px',
                                marginRight: "5px",
                                fontSize: "13px",
                            }}
                            disabled={isSending || memoryLoading}
                        >
                            {isSending ? '已发送' : '发送'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', paddingLeft: '75px', paddingRight: '75px', marginBottom: '0px', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', marginBottom: '15px', alignItems: 'center' }}>
                                <label style={{ marginRight: '10px', fontSize: '13px' }}>max_k</label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="15"
                                        value={krangeValue}
                                        onChange={(e) => setKrangeValue(Number(e.target.value))}
                                        className="form-range"
                                        style={{ marginRight: '10px', width: "80px" }}
                                        title={'max top_k'}
                                    />
                                <span style={{ marginRight: '45px', fontSize: '13px' }}>{krangeValue}</span>
                            </div>
                        </div>
                        <FileUploader onUpload={handleFileUpload} />{" "}
                    </div>
                    </div>

                    </div>
                    <nav className="right-sidebar">
                    <div className="sidebar-content">
                        <UploadedFilesSidebar 
                        uploadedFiles={uploadedFiles} 
                        onFileSelect={handleFileSelect} 
                        refreshTrigger={refreshTrigger} 
                        user_id={user_id} 
                        />
                    </div>
                    </nav>
                    <footer className="footer">
                        {/* Add footer content if needed */}
                    </footer>
                    </main>
        )}
    </div>
    );
}
