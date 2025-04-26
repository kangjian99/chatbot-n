// sendMessage.ts
import { handleStreamResponse } from './handleStreamResponse';
import { saveToLocalStorage, loadFromLocalStorage } from './localStorageUtil';

interface Message {
    type: 'user' | 'system' | 'info';
    role?: 'system' | 'assistant';
    text: string;
    id?: number;
}

interface SendMessageParams {
    userInput: string;
    user_id: string;
    thread_id: string;
    url: string | undefined;
    prompts: [string, string][];
    selectedTemplate: string;
    selectedFileName: string | null;
    krangeValue: number;
    kValue: number;
    userModel: string;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setUserInput: React.Dispatch<React.SetStateAction<string>>;
    setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
}

export const sendMessage = async ({
    userInput,
    user_id,
    thread_id,
    url,
    prompts,
    selectedTemplate,
    selectedFileName,
    krangeValue,
    kValue,
    userModel,
    setMessages,
    setUserInput,
    setIsSending,
}: SendMessageParams) => {
    const newMessageId = Date.now(); // 使用时间戳作为简单的唯一ID
    // 检查用户输入是否为空
    if (!userInput.trim()) {
        setMessages((prevMessages) => [
            ...prevMessages,
            { type: "system", text: "发送信息不能为空...", role: "system", id: newMessageId },
        ]);
        return;
    } else {
        // 将用户输入和"思考中..."消息添加到消息列表
        setMessages((prevMessages) => [
            ...prevMessages,
            { type: "user", text: userInput },
            { type: "system", text: "思考中......", role: "system", id: newMessageId },
        ]);
        setIsSending(true);
    }

    try {
        // 添加一个小延迟，确保消息状态更新完成
        // await new Promise(resolve => setTimeout(resolve, 50));
        
        const response = await fetch(url + "message", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: user_id,
                user_input: userInput,
                thread_id: thread_id,
                selected_template: selectedTemplate,
                prompt_template: prompts[Number(selectedTemplate)],
                selected_file: selectedFileName, // 将选中的文件名添加到请求中
                max_k: krangeValue,
                k: kValue,
                user_model: userModel
            }), // 发送选择的模板
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // 处理流式响应
        // console.log(response, response.body)
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
    setUserInput("");
    setIsSending(false);
};
