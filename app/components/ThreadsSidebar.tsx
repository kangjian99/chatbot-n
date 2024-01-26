import React, { useState, useEffect } from "react";

const url = process.env.NEXT_PUBLIC_API_URL;
const max_threads = 5;

interface ThreadsSidebarProps {
    onThreadSelect: (thread: { id: string; name: string }) => void;
    user_id : string;
    len : number;
}

const ThreadsSidebar: React.FC<ThreadsSidebarProps> = ({ onThreadSelect, user_id , len }) => {
    const [threads, setThreads] = useState<{id: string, name: string}[]>([]);
    const [selectedThread, setSelectedThread] = useState<string | null>(null);

    const fetchThreads = async () => {
        try {
            const response = await fetch(url + `get-threads?user_id=${user_id}&length=${threads.length}`, {
                method: 'GET',
                credentials: 'include' // 确保携带凭证
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const threadsData = await response.json(); // 直接使用返回的数组
            // console.log(threadsData)
            // Check if the threadsData is empty and set an appropriate state
            if (threadsData.length === 0) {
                setThreads([{ id: 'initial', name: '新对话' }]);
            } else {
                if (threads.length > 0) {
                  // 非刷新页面，后端仅返回一个元素，替换最开头的“新对话”元素
                  // console.log(threadsData[0], threads[0])
                  if (JSON.stringify(threadsData[0]) !== JSON.stringify(threads[1])) {
                    setThreads(prevThreads => [threadsData[0], ...prevThreads.slice(1)]);
                  }
                }  else {
                setThreads(threadsData);
            }
            }
    
            // Optionally, handle the selection of the first thread or a placeholder
            if (threadsData.length > 0) {
                setSelectedThread(threadsData[0].id);
            } else {
                setSelectedThread('initial');
            }

        } catch (error) {
            console.error('Error:', error);
        }
    };

    useEffect(() => {
        fetchThreads();
    }, []);
    
    const handleThreadClick = async (threadId: string) => {
        const newselectedThread = threads.find((thread) => thread.id === threadId);
        const preThread = threads.find(thread => thread.id === selectedThread);
        if (newselectedThread && preThread) {
            // console.log(preThread, newselectedThread)
            if (newselectedThread.name != '新对话' && preThread.name === '新对话' && len > 1) {
                await fetchThreads(); // 判断离开已经有内容的新对话，更新对话记录
            }
            setSelectedThread(threadId);
            onThreadSelect(newselectedThread);
          }
    };
    
    useEffect(() => {
        if (selectedThread) {
          handleThreadClick(selectedThread);
        }
      }, [selectedThread]);

    const handleNewThread = async () => {
        const existingNewThread = threads.find(thread => thread.name === '新对话');
        const currentThread = threads.find(thread => thread.id === selectedThread);
        let isFetchedThread = false
        if (currentThread && currentThread.name === '新对话' && len > 1) {
        await fetchThreads();  // 判断新对话长度超过1，则更新对话列表后再建新对话
        isFetchedThread = true
        }
        if (!existingNewThread || isFetchedThread) {
            // Generate a random thread ID
        const newThreadId = Math.random().toString(36).substring(2, 15);
        // Add the new thread to the threads state
        setThreads(prevThreads => [{ id: newThreadId, name: '新对话' }, ...prevThreads]);
        // Optionally, select the new thread
        setSelectedThread(newThreadId);
        onThreadSelect({ id: newThreadId, name: '新对话' });        
        } else if (existingNewThread) {
                setSelectedThread(existingNewThread.id);
            }
    };

    useEffect(() => {
        if (threads.length >= 2 && threads[0].name === '新对话' && threads[1].name === '新对话') {
          setSelectedThread(threads[1].id)
          setThreads(prevThreads => prevThreads.slice(1));
        }
        if (threads.length > max_threads+1) {
            setThreads(prevThreads => prevThreads.slice(0, max_threads+1));  // 最大max个对话记录，+1个是新对话可能暂时为空
        }
        // console.log("Threads updated:", threads);
      }, [threads]);

    return (
        <div
            style={{
                width: "220px",
                borderRight: "1px solid #ccc",
                padding: "20px",
            }}
        >
            <h2 style={{ fontSize: "13px", marginBottom: "10px" }}>对话记录</h2>
            <ul
                style={{
                    padding: 10,
                }}
            >
                {threads.map((thread, index) => (
                    <li
                        key={index}
                        style={{ marginBottom: "5px", cursor: "pointer" }}
                        onClick={() => handleThreadClick(thread.id)}
                    >
                        <span
                            style={{
                                backgroundColor: selectedThread === thread.id ? "#004080" : "#f9f9f9",
                                color: selectedThread === thread.id ? "white" : "black",
                                padding: "5px 5px",
                                borderRadius: "5px",
                                border: "1px solid #ccc", // 添加细外框
                                display: "inline-block",
                                wordBreak: 'break-word',  // 添加换行样式
                                fontSize: "13px",
                            }}
                        >
                            {thread.name}
                        </span>
                    </li>
                ))}
            </ul>
            <button onClick={handleNewThread} style={{ float: "right", fontSize: "12px", border: '1px solid #ccc', borderRadius: '5px', padding: "5px 5px" }}>
                新建对话</button>
        </div>
    );
};


export default ThreadsSidebar;
