import React from 'react';

interface Message {
  type: 'user' | 'system';
  role?: 'system' | 'assistant';
  text: string;
  id?: number;
}

export const handleStreamResponse = async (
    reader: ReadableStreamDefaultReader,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    newMessageId: number
) => {
    const decoder = new TextDecoder();
    let accumulatedData = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        let messageText = decoder.decode(value, { stream: true });

        if (messageText.startsWith("data: ")) {
            try {
                messageText = messageText.replace(/data: /g, "");
                let messages = messageText.split("\n\n"); // 由于网络延迟可能导致多个JSON对象的数组，根据换行符分割
                messages.forEach(msg => {
                    msg = msg.trim();
                    if (msg !== "") {
                        try {
                            let data = JSON.parse(msg); // 解析每个JSON字符串
                            // console.log("Parsed Data:", data.data);
                            accumulatedData += data.data; // 累积 data 属性的值
                        } catch (e) {
                            console.error("Error parsing JSON:", e, "in message:", msg);
                            // 可以根据需要在这里添加 break 或 continue
                        }
                    }
                });

                // 以下是多个回复的特殊处理
                const pattern = /\n\*\*\*[^*]+?\*\*\*(?=\n|$)/g; // 匹配所有单独一行的“*** ***”
                const dashPattern = /-----/; // 检查是否存在“-----”
            
                if (pattern.test(accumulatedData)) {
                    if (dashPattern.test(accumulatedData)) {
                        // 如果存在“-----”，则清除所有“*** ***”
                        accumulatedData = accumulatedData.replace(pattern, '');
                    } else {
                        // 否则，仅保留最后一个“*** ***”
                        let matches = accumulatedData.match(pattern);
                        if (matches && matches.length > 1) {
                            // 移除除最后一个外的所有匹配项
                            for (let i = 0; i < matches.length - 1; i++) {
                                accumulatedData = accumulatedData.replace(matches[i], '');
                            }
                        }
                    }
                } else { accumulatedData = accumulatedData.replace(/\n\*\*\*[^*]+?\*\*\*/, '');
                }

                // 更新“思考中...”消息
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.id === newMessageId
                            ? { ...msg, text: accumulatedData, role: 'assistant' }
                            : msg
                    )
                );
            } catch (error) {
                console.error("Error parsing message:", error);
            }
        }
    }
};
