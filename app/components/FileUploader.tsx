import React, { useState, FunctionComponent } from "react";

interface FileUploaderProps {
    onUpload: (file: File) => void;
}

const FileUploader: FunctionComponent<FileUploaderProps> = ({ onUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploaded, setIsUploaded] = useState<boolean>(false);
    const allowedExtensions = ["docx", "txt", "pdf"];

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
                border: "1px solid #aaa", // 更浅的边框颜色，以便在深色背景上更清晰
                backgroundColor: "#004080", // 深色背景
                color: "#fff", // 白色文字
                outline: "none" // 可选，移除聚焦时的边框
            }}
            title={`支持格式: ${allowedExtensions.map(ext => `${ext}`).join("/")}`}
        />
        <button
            onClick={handleFileUpload}
            style={{
                padding: "6px 10px",
                marginRight: "5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                background: isUploaded ? "#ccc" : "#004080",
                color: "white",
                fontSize: "13px",
                cursor: "pointer",
            }}
        >
            {isUploaded ? '文件处理' : '上传文件'}
        </button>
    </div>
</div>
    );
};

export default FileUploader;