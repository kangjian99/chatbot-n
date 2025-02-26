'use client';

import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // 导入 Bootstrap
import MessageList from "./components/MessageList"; // 导入新的组件
import FileUploader from "./components/FileUploader";
import UploadedFilesSidebar from "./components/FileSidebar";
import ThreadsSidebar from "./components/ThreadsSidebar";
import Login from "./components/Login";
import { sendMessage } from './utils/sendMessage';
import { saveToLocalStorage, loadFromLocalStorage, cleanUpExpiredLocalStorage } from './utils/localStorageUtil';
import { useRouter } from 'next/navigation';
import { ConfigurationContext } from './ContextProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faSync, faMagic, faArrowRightLong } from '@fortawesome/free-solid-svg-icons';

const url = process.env.NEXT_PUBLIC_API_URL;
const default_n = process.env.NEXT_PUBLIC_API_N || 2;
const headline = process.env.NEXT_PUBLIC_API_HEADLINE || "AI 知识库管理助手";

interface Message {
  type: 'user' | 'system' | 'info';
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
    const [isLoggedIn, setIsLoggedIn] = useState(false); 
    const [isLoading, setIsLoading] = useState(true); // 新增状态来追踪加载状态
    const [memoryLoading, setMemoryLoading] = useState(false);
    const { krangeValue, kValue, userModel, selectedTemplate, setSelectedTemplate } = useContext(ConfigurationContext);
    const router = useRouter();

    useEffect(() => {
        document.title = `${headline} - ${user_id}`;
      }, [user_id]); // 空依赖数组意味着这个效果仅在组件挂载时运行，非空则在user_id更新后执行
        
      const checkSession = useCallback(async () => {
        try {
            const savedUserId = loadFromLocalStorage('user_id');
            if (!savedUserId) {
                setIsLoggedIn(false);
                return;
            }
    
            const response = await fetch(`${url}check_session?user_id=${encodeURIComponent(savedUserId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (response.ok) {
                setIsLoggedIn(true);
                setUser_id(savedUserId);
            } else {
                setIsLoggedIn(false);
                localStorage.removeItem('user_id');
            }
        } catch (error) {
            console.error("检查会话失败:", error);
            setIsLoggedIn(false);
        } finally {
            setIsLoading(false);
        }
    }, [url]);
    
    useEffect(() => {
        checkSession();
    }, [checkSession]);
    
    const handleLoginSuccess = (username: string) => {
        setIsLoggedIn(true);
        setUser_id(username);
        // 可以选择保存一些非敏感信息到localStorage，以加快后续加载
        saveToLocalStorage('user_id', username);
    };
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 增加状态变量用于跟踪选择的 prompt_template
    const [prompts, setPrompts] = useState<[string, string][]>([]);

    useEffect(() => {
        // 尝试从localStorage加载prompts
        const cachedPrompts = loadFromLocalStorage('prompts');
        if (cachedPrompts) {
            setPrompts(cachedPrompts);
        }
        if (!selectedTemplate) {
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
        }
    }, []);

    useEffect(() => {
        cleanUpExpiredLocalStorage();
      }, []);

    // 新增文件上传逻辑
    const handleFileUpload = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_id", user_id);

        const updateSysMessages = (newMessage: string) => {
            setMessages((prevMessages) => [
              ...prevMessages,
              { type: "system", text: newMessage, role: "system" },
            ]);
          };

        try {
            const response = await fetch(url + "upload", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (response.ok) {
                const responseData = await response.text(); // 获取后端返回的字符串数据
                updateSysMessages(responseData); 
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
                    return { type: "info", text: data.Info, role: "system", id: newMessageId };
                } else if (data.hasOwnProperty('Assistant')) {
                    return { type: "system", text: data.Assistant, role: "assistant", id: newMessageId };
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

    const handleThreadSelect = (thread: any) => {
        // Handle the thread selection, perhaps by setting state or performing an action
        setThread_id(thread.id);
        setThread_name(thread.name);
    };

    const smallButtonStyle = {
        fontSize: '12px',
        padding: '3px 6px',
        border: '1px solid #ccc', 
        color: '#6c757d',
        backgroundColor: '#eee',
        marginRight: '20px',
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
                    <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <ThreadsSidebar onThreadSelect={handleThreadSelect} user_id={user_id} len={messages.length} />
                        <div style={{ marginTop: 'auto', marginBottom: '10px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                                onClick={() => router.push('/generate-cards')}
                                className="btn btn-secondary"
                                style={{
                                    ...smallButtonStyle,
                                }}
                                disabled={isSending || memoryLoading} >
                                <FontAwesomeIcon icon={faMagic} />
                            </button>
                            <button
                                onClick={() => {
                                    saveToLocalStorage(`memory-${user_id}-${thread_id}`, "");
                                    handleMemory();
                                }}
                                className="btn btn-secondary"
                                style={{
                                    ...smallButtonStyle,
                                }}
                                disabled={isSending || memoryLoading} >
                                <FontAwesomeIcon icon={faSync} />
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="btn btn-secondary"
                                style={{
                                    ...smallButtonStyle,
                                }}
                                disabled={isSending || memoryLoading} >
                                <FontAwesomeIcon icon={faGear} />
                            </button>
                        </div>
                    </div>
                    </nav>
                    <div className="center-container">
                    <div className="main-content">
                    <MessageList
                            messages={messages}
                            messagesEndRef={messagesEndRef}
                        />{" "}
                    <div style={{ 
                        display: 'flex', 
                        paddingLeft: '50px', 
                        paddingRight: '50px', 
                        marginBottom: '10px',
                        gap: '10px' 
                    }}>
                        {/* 左侧按钮和下拉列表容器 */}
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '5px',
                            marginRight: '10px',
                            width: '200px', // 与下拉列表等宽
                            alignSelf: 'center'
                        }}>
                            {/* 快捷按钮组 */}
                            <div style={{ 
                                display: 'flex', 
                                gap: '5px'
                            }}>
                                <button 
                                    onClick={() => setSelectedTemplate('1')}
                                    style={{
                                        flex: 1,
                                        padding: '3px 0',
                                        borderRadius: '5px',
                                        border: '1px solid var(--primary-color)',
                                        background: selectedTemplate === '1' ? '#20808D' : 'var(--secondary-color)',
                                        color: selectedTemplate === '1' ? 'white' : '#000',
                                        fontSize: '12px'
                                    }}
                                >
                                    提炼总结
                                </button>
                                <button 
                                    onClick={() => setSelectedTemplate('2')}
                                    style={{
                                        flex: 1,
                                        padding: '3px 0',
                                        borderRadius: '5px',
                                        border: '1px solid var(--primary-color)',
                                        background: selectedTemplate === '2' ? '#20808D' : 'var(--secondary-color)',
                                        color: selectedTemplate === '2' ? 'white' : '#000',
                                        fontSize: '12px'
                                    }}
                                >
                                    小红书
                                </button>
                                <button 
                                    onClick={() => setSelectedTemplate('5')}
                                    style={{
                                        flex: 1,
                                        padding: '3px 0',
                                        borderRadius: '5px',
                                        border: '1px solid var(--primary-color)',
                                        background: selectedTemplate === '5' ? '#20808D' : 'var(--secondary-color)',
                                        color: selectedTemplate === '5' ? 'white' : '#000',
                                        fontSize: '12px'
                                    }}
                                >
                                    专业翻译
                                </button>
                            </div>
                            {/* 下拉选择列表 */}
                            <select 
                                value={selectedTemplate} 
                                onChange={e => setSelectedTemplate(e.target.value)} 
                                className="custom-select"
                                style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc',
                                    fontSize: '14px'
                                }}
                            >
                                {prompts.map(([key, value], index) => (
                                    <option key={key} value={index}>{key}</option>
                                ))}
                            </select>
                        </div>

                        {/* 输入框和发送按钮 */}
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
                                marginRight: '10px',
                                height: '70px', // 调整高度以匹配左侧总高度
                            }}
                            disabled={isSending}
                            rows={3}
                            placeholder="在此输入..."
                        />
                        <button 
                            onClick={() => sendMessage({ userInput, user_id, thread_id, url, prompts, selectedTemplate, selectedFileName, krangeValue, kValue, userModel, setMessages, setUserInput, setIsSending })} 
                            style={{ 
                                padding: '5px',
                                borderRadius: '50%',
                                border: '1px solid #eee',
                                background: isSending || memoryLoading ? '#eee' : userInput ? '#20808D' : '#eee',
                                color: isSending || memoryLoading ? '#666' : userInput ? 'white' : '#666',
                                width: '40px',
                                height: '40px',
                                marginRight: "5px",
                                fontSize: "14px",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                alignSelf: 'center' // 垂直居中对齐
                            }}
                            disabled={isSending || memoryLoading || !userInput}
                        >
                            <FontAwesomeIcon icon={faArrowRightLong} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', paddingLeft: '50px', paddingRight: '50px', marginBottom: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <button 
                            onClick={() => {
                                setUserInput('写作：[人设/稿件类型/风格]\n[主题及关键信息]\n[视角/切入点]（可选）\n[字数]');
                                setSelectedTemplate('0');
                            }} 
                            style={{
                                padding: '5px',
                                borderRadius: '5px',
                                border: '1px solid #ccc',
                                background: 'var(--secondary-color)',
                                color: '#444',
                                marginRight: '15px',
                                fontSize: '12px'
                            }}
                        >
                            撰稿快捷模板
                        </button>
                        <button 
                            onClick={() => {
                                setUserInput('');
                            }} 
                            style={{
                                padding: '5px',
                                borderRadius: '5px',
                                border: '1px solid #ccc',
                                background: 'var(--secondary-color)',
                                color: '#444',
                                marginRight: '10px',
                                fontSize: '12px'
                            }}
                        >
                            Clear
                        </button>
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
