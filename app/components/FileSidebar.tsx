import React, { useState, useEffect } from "react";
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/localStorageUtil';

interface UploadedFilesSidebarProps {
    uploadedFiles: string[];
    onFileSelect: (fileName: string) => void;
    refreshTrigger: boolean;
    user_id : string;
}

const url = process.env.NEXT_PUBLIC_API_URL;

const UploadedFilesSidebar: React.FC<UploadedFilesSidebarProps> = ({ uploadedFiles, onFileSelect, refreshTrigger, user_id }) => {
    const [files, setFiles] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const fetchFilenames = async () => {
        try {
            const response = await fetch(url + `get-filenames?user_id=${user_id}`, {
                method: 'GET',
                credentials: 'include' // 确保携带凭证
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const fileNames = await response.json(); // 直接使用返回的数组
            setFiles(fileNames);
            saveToLocalStorage('files', fileNames);
            if (uploadedFiles.length > 0) {
                if (fileNames.length > 1) {
                setSelectedFile(fileNames[1]);
            }}
        } catch (error) {
            console.error('Error:', error);
        }
    };

    useEffect(() => {
        const cachedFileNames = loadFromLocalStorage('files');
        if (cachedFileNames) {
            setFiles(cachedFileNames);
        }
    }, []);

    useEffect(() => {
        fetchFilenames();
    }, [refreshTrigger]);

    const [isClearing, setIsClearing] = useState(false);
    const handleClear = async () => {
        setIsClearing(true); 
        try {
            // 向后端发送清除请求
            const response = await fetch(url + `clear?user_id=${user_id}&file_name=${selectedFile}`, {
                method: 'GET', // 或者是 GET，取决于后端的实现
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // 请求成功后重新获取文件列表
            fetchFilenames();
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsClearing(false);
        }
    };

//    useEffect(() => {
        // 当文件列表更新时，将最新的文件设置为选中状态
//        if (files.length > 0) {
//            setSelectedFile(files[files.length - 1]);
//        }
//    }, [files]);

function truncateFileName(fileName: String, maxLength = 30) {
    if (fileName.length <= maxLength) return fileName;
    const start = fileName.slice(0, Math.ceil(maxLength / 2));
    const end = fileName.slice(-Math.floor(maxLength / 2));
    return `${start}...${end}`;
  }
     
    const handleFileClick = (fileName: string) => {
        setSelectedFile(fileName);
        onFileSelect(fileName);
    };

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div
            style={{
                // width: "220px",
                // borderRight: "1px solid #ccc",
                // padding: "20px",
                // paddingRight: "50px"
            }}
        >
            <h2 style={{ fontSize: "14px", marginLeft: "10px", marginTop: "20px", marginBottom: "10px" }}>已上传知识库 {files.length <= 1 ? files.length : files.length - 1}</h2>
            <ul
                style={{
                    padding: 10,
                    listStyle: "none"
                }}
            >
                {files.map((file, index) => (
                    <li
                        key={index}
                        style={{ marginBottom: "6px", cursor: "pointer" }}
                        onClick={() => handleFileClick(file)}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <span
                            style={{
                                backgroundColor: selectedFile === file ? "#3A6A9A" : (hoveredIndex === index ? "#d0e0f0" : "#e8eef6"),
                                color: selectedFile === file ? "white" : "black",
                                padding: "5px 5px",
                                borderRadius: "5px",
                                display: "inline-block",
                                wordBreak: 'break-word',  // 添加换行样式
                                fontSize: "13px",
                                fontStyle: files.length > 1 && index === 0 ? "italic" : "normal",
                            }}
                            title={file} // 悬停显示全名
                        >
                            {truncateFileName(file)}
                        </span>
                    </li>
                ))}
            </ul>
            <div style={{ paddingLeft: "10px" }}>
            {files.length > 0 && (
            <button style={{ float: "left", fontSize: "12px", backgroundColor: "#eee", border: '1px solid red', borderRadius: '5px', padding: "5px 5px" }} onClick={handleClear}>
                {isClearing ? '清除中' : '清除选中文件'}
            </button>
            )}
            </div>
        </div>
    );
};


export default UploadedFilesSidebar;
