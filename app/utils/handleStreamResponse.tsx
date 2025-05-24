import React from 'react';

const streamThreshold = Number(process.env.NEXT_PUBLIC_API_THRESHOLD || 10);

interface Message {
  type: 'user' | 'system' | 'info';
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
            prevMessages.map(msg => {
                if (msg.id === newMessageId) {
                    // 检查这条消息是否是第一次被流式响应更新
                    // 通过判断 role 是否仍然是 'system' 来识别
                    const isFirstUpdate = msg.role === 'system'; 
                    
                    return {
                        ...msg,
                        text: processThinkTags(
                            // 如果是第一次更新，用 data 替换现有文本 ("思考中......")
                            // 否则，将 data 追加到现有文本后面
                            isFirstUpdate ? data : msg.text + data
                        ),
                        role: 'assistant'
                    };
                }
                return msg;
            })
        );
    }

    return accumulatedData;
};
