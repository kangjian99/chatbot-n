import React, { useState, FunctionComponent } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons';

interface FileUploaderProps {
    onUpload: (file: File) => void;
}

const FileUploader: FunctionComponent<FileUploaderProps> = ({ onUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploaded, setIsUploaded] = useState<boolean>(false);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [isUrlUploaded, setIsUrlUploaded] = useState<boolean>(false);
    const allowedExtensions = ["docx", "txt", "pdf", "csv", "md"];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0];

        if (selected) {
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (selected.size > maxSize) {
                alert("文件大小不能超过10MB！");
                event.target.value = ""; // 清空文件输入，以便重新选择文件
                setSelectedFile(null);
            } else {
                setSelectedFile(selected);
            }
        }
    };

    const handleFileUpload = async () => {
        if (selectedFile) {
            setIsUploaded(true); // 开始上传
            try {
                await onUpload(selectedFile);
            } catch (error) {
                console.error("上传失败:", error);
            }
            setIsUploaded(false); // 更新上传状态
        } else {
            alert("请选择一个文件上传！");
        }
    };
    
    {/* 处理URL文件上传 */}
    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFileUrl(event.target.value);
    };

    const validateUrl = (url: string): boolean => {
        const urlPattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,})|'+ // domain name
        '(\\/[-a-z\\d%_.~+\\/]*)*'+ // path
        '(\\/[\\w\\d%_.~+\\u4e00-\\u9fa5-]+\\.(docx|txt|pdf))$', 'i'); // query string
        return !!urlPattern.test(url) && allowedExtensions.some(ext => url.endsWith(ext));
    };

    const handleUrlFileUpload = async () => {
        if (validateUrl(fileUrl)) {
            try {
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const blob = await response.blob();
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (blob.size > maxSize) {
                    alert("文件大小不能超过10MB！");
                    return; // 如果文件过大，不执行后续操作
                }
                const fileExt = fileUrl.split('.').pop();
                const filename = fileUrl.split('/').pop() || 'default';
                const file = new File([blob], filename, { type: `application/${fileExt}` });
                setIsUrlUploaded(true); // 开始上传
                await onUpload(file);
                setFileUrl('');
            } catch (error) {
                console.error("下载失败:", error);
            }
            setIsUrlUploaded(false); // 更新上传状态
        } else {
            alert("请输入一个有效的HTTPS链接，文件后缀必须是.docx, .txt, 或者 .pdf！");
        }
    };

    return (
<div style={{ marginBottom: "10px" }}>
    {/* Section 1: Local File Upload */}
    <div
        style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
        }}
    >
        <input
            type="file"
            accept={allowedExtensions.join(",")}
            onChange={handleFileChange}
            style={{
                marginRight: "20px",
                fontSize: "13px",
                padding: "6px",
                borderRadius: "5px",
                border: "1px solid #ccc", // 更浅的边框颜色，以便在深色背景上更清晰
                backgroundColor: selectedFile ? '#3A6A9A' : "#467EB7", // 深色背景
                color: "#fff", // 白色文字
                width: "300px",
                outline: "none" // 可选，移除聚焦时的边框
            }}
            title={`支持格式: ${allowedExtensions.map(ext => `${ext}`).join("/")}`}
        />
        <button
            onClick={handleFileUpload}
            style={{
                padding: '5px', // 调整 padding 使按钮更大
                marginRight: '5px',
                borderRadius: '50%', // 圆形按钮
                border: '1px solid #eee',
                background: isUploaded ? '#eee' : selectedFile ? '#20808D' : '#eee',
                color: isUploaded ? '#666' : selectedFile ? 'white' : '#666',
                fontSize: '14px',
                cursor: 'pointer',
                width: '40px', // 确保按钮是圆形
                height: '40px', // 确保按钮是圆形
                display: 'flex', // 使用 flexbox 对齐内容
                alignItems: 'center', // 垂直居中
                justifyContent: 'center', // 水平居中
            }}
        >
            <FontAwesomeIcon icon={faArrowUpFromBracket} />
        </button>
    </div>

    <div style={{ marginBottom: "10px" }}></div>

    {/* Section 2: URL File Upload */}
    <div
        style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
        }}
    >
        <input
            type="text"
            value={fileUrl}
            onChange={handleUrlChange}
            placeholder="输入文件链接(支持docx/txt/pdf)"
            style={{
                marginRight: "20px",
                fontSize: "13px",
                padding: "6px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                width: "300px",
            }}
        />
        <button
            onClick={handleUrlFileUpload}
            style={{
                padding: '5px',
                marginRight: '5px',
                borderRadius: '50%',
                border: '1px solid #eee',
                background: isUrlUploaded ? '#eee' : fileUrl ? '#20808D' : '#eee',
                color: isUrlUploaded ? '#666' : fileUrl ? 'white' : '#666',
                fontSize: '14px',
                cursor: 'pointer',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <FontAwesomeIcon icon={faArrowUpFromBracket} />
        </button>
    </div>
</div>
    );
};

export default FileUploader;