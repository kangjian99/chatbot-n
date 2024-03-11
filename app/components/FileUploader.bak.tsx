import React, { useState, FunctionComponent } from "react";

interface FileUploaderProps {
    onUpload: (file: File) => void;
}

const FileUploader: FunctionComponent<FileUploaderProps> = ({ onUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploaded, setIsUploaded] = useState<boolean>(false);
    const allowedExtensions = [".txt", ".docx", ".pdf"];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0];

        if (selected) {
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (selected.size > maxSize) {
                alert("文件大小不能超过5MB！");
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
<div
    style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: "10px",
    }}
>
    <input
        type="file"
        accept={allowedExtensions.join(",")}
        onChange={handleFileChange}
        style={{
            marginRight: "10px",
            fontSize: "13px",
            padding: "6px",
            borderRadius: "5px",
            border: "1px solid #ccc",
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
            fontSize: "14px",
            cursor: "pointer",
        }}
    >
        {isUploaded ? '文件处理' : '上传文件'}
    </button>
</div>
    );
};

export default FileUploader;
