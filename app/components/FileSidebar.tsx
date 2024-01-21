import React, { useState, useEffect } from "react";

interface UploadedFilesSidebarProps {
    uploadedFiles: string[];
    onFileSelect: (fileName: string) => void;
    refreshTrigger: boolean;
}

const url = process.env.NEXT_PUBLIC_API_URL;

const UploadedFilesSidebar: React.FC<UploadedFilesSidebarProps> = ({ uploadedFiles, onFileSelect, refreshTrigger }) => {
    const [files, setFiles] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const fetchFilenames = async (skipPush = false) => {
        try {
            const response = await fetch(url + 'get-filenames', {
                method: 'GET',
                credentials: 'include' // 确保携带凭证
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const fileNames = await response.json(); // 直接使用返回的数组
            // 如果有已上传的文件，将其最新内容添加到fileNames数组
            if (!skipPush && uploadedFiles.length > 0) {
                fileNames.push(uploadedFiles[uploadedFiles.length - 1]);
            }
            setFiles(fileNames);
            if (uploadedFiles.length > 0) {
                if (fileNames.length > 0) {
                setSelectedFile(fileNames[fileNames.length - 1]);
            }}
        } catch (error) {
            console.error('Error:', error);
        }
    };

    useEffect(() => {
        fetchFilenames();
    }, [refreshTrigger]);

    const handleClear = async () => {
        try {
            // 向后端发送清除请求
            const response = await fetch(url + 'clear', {
                method: 'POST', // 或者是 GET，取决于后端的实现
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // 请求成功后重新获取文件列表
            fetchFilenames(true);
        } catch (error) {
            console.error('Error:', error);
        }
    };

//    useEffect(() => {
        // 当文件列表更新时，将最新的文件设置为选中状态
//        if (files.length > 0) {
//            setSelectedFile(files[files.length - 1]);
//        }
//    }, [files]);
    
    const handleFileClick = (fileName: string) => {
        setSelectedFile(fileName);
        onFileSelect(fileName);
    };

    return (
        <div
            style={{
                width: "200px",
                borderRight: "1px solid #ccc",
                padding: "20px",
            }}
        >
            <h2 style={{ fontSize: "14px", marginBottom: "10px" }}>已上传文件</h2>
            <ul
                style={{
                    listStyle: "none",
                    padding: 10,
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    backgroundColor: "#f9f9f9",
                    marginBottom: "10px",
                }}
            >
                {files.map((file, index) => (
                    <li
                        key={index}
                        style={{ marginBottom: "5px", cursor: "pointer" }}
                        onClick={() => handleFileClick(file)}
                    >
                        <span
                            style={{
                                backgroundColor: selectedFile === file ? "#004080" : "transparent",
                                color: selectedFile === file ? "white" : "black",
                                padding: "5px 10px",
                                borderRadius: "5px",
                                display: "inline-block",
                                wordBreak: 'break-word',  // 添加换行样式
                                fontSize: "13px",
                            }}
                        >
                            {file}
                        </span>
                    </li>
                ))}
            </ul>
            <button style={{ float: "right", fontSize: "12px", border: '1px solid #ccc', borderRadius: '5px', padding: "5px 10px" }} onClick={handleClear}>
                清除文件
            </button>
        </div>
    );
};


export default UploadedFilesSidebar;
