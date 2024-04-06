import React from 'react';

const streamThreshold = Number(process.env.NEXT_PUBLIC_API_THRESHOLD || 10);

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
    let tempData = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            if (tempData) {
                // 处理最后一批数据
                accumulatedData += tempData;
                updateMessage(tempData);
            }
            break;
        }

        let messageText = decoder.decode(value, { stream: true });
        if (messageText.startsWith("data: ")) {
            messageText = messageText.replace(/data: /g, "");
            let messages = messageText.split("\n\n");
            messages.forEach(msg => {
                msg = msg.trim();
                if (msg !== "") {
                    try {
                        let data = JSON.parse(msg);
                        tempData += data.data;
                    } catch (e) {
                        console.error("Error parsing JSON:", e, "in message:", msg);
                    }
                }
            });

            // 设定一个阈值，当累积的数据达到时进行批量处理
            if (tempData.length > streamThreshold) {
                accumulatedData += tempData;
                updateMessage(tempData);
                tempData = ""; // 重置临时数据
            }
        }
    }

    function updateMessage(data: string) {
        // 使用函数式更新，避免依赖外部的accumulatedData变量
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === newMessageId ? { ...msg, text: accumulatedData === data ? data : msg.text + data, role: 'assistant' } : msg
            )
        );
    }

    return accumulatedData;
};
