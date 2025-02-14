import React from 'react';

const streamThreshold = Number(process.env.NEXT_PUBLIC_API_THRESHOLD || 10);

interface Message {
  type: 'user' | 'system';
  role?: 'system' | 'assistant';
  text: string;
  id?: number;
}

const THINK_TAG_REGEX = /<think>/g;
const END_THINK_TAG_REGEX = /<\/think>/g;

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

    function processThinkTags(text: string): string {
        // 如果文本开头没有 think 标签，直接返回
        if (!text.startsWith('<think>') && !text.startsWith('```\n<think>')) return text;
        
        return text
            .replace(THINK_TAG_REGEX, text.startsWith('```\n<think>') ? '<think>' : '```\n<think>')
            .replace(END_THINK_TAG_REGEX, text.includes('</think>\n```') ? '</think>' : '</think>\n```');
    }
    
    function updateMessage(data: string) {
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === newMessageId ? {
                    ...msg,
                    text: processThinkTags(
                        // 如果 accumulatedData 等于 data，说明是第一次更新
                        accumulatedData === data ? data : msg.text + data
                    ),
                    role: 'assistant'
                } : msg
            )
        );
    }

    return accumulatedData;
};
