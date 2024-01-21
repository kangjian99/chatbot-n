import React, { useState, FunctionComponent } from "react";

interface FileUploaderProps {
    onUpload: (file: File) => void;
}

const FileUploader: FunctionComponent<FileUploaderProps> = ({ onUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [isUploaded, setIsUploaded] = useState<boolean>(false);
    const allowedExtensions = ["docx", "txt", "pdf"];

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
            setIsUploaded(true); // 开始上传
            try {
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const blob = await response.blob();
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (blob.size > maxSize) {
                    alert("文件大小不能超过5MB！");
                    setIsUploaded(false); // 更新上传状态
                    return; // 如果文件过大，不执行后续操作
                }
                const fileExt = fileUrl.split('.').pop();
                const filename = fileUrl.split('/').pop() || 'default';
                const file = new File([blob], filename, { type: `application/${fileExt}` });
                onUpload(file);
                setFileUrl('');
            } catch (error) {
                console.error("下载失败:", error);
            }
            setIsUploaded(false); // 更新上传状态
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
            {isUploaded ? '文件处理' : '本地上传'}
        </button>
    </div>

    <div style={{ marginBottom: "15px" }}></div>

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
                marginRight: "10px",
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
            {isUploaded ? '文件处理' : '链接上传'}
        </button>
    </div>
</div>
    );
};

export default FileUploader;