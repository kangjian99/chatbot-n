import React, { useState, FunctionComponent } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons';

interface FileUploaderProps {
    onUpload: (file: File) => void;
}

const FileUploader: FunctionComponent<FileUploaderProps> = ({ onUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploaded, setIsUploaded] = useState<boolean>(false);
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


    return (
<div style={{ marginBottom: "0px" }}>
    {/* Section 1: Local File Upload */}
    <div
        style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
        }}
    >
        <input
            type="file"
            accept={allowedExtensions.join(",")}
            onChange={handleFileChange}
            style={{
                width: "220px",
                marginRight: "20px",
                fontSize: "13px",
                padding: "6px",
                borderRadius: "5px",
                border: "1px solid #aaa", // 更浅的边框颜色，以便在深色背景上更清晰
                backgroundColor: selectedFile ? '#3A6A9A' : "#467EB7", // 深色背景
                color: "#fff", // 白色文字
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
</div>
    );
};

export default FileUploader;