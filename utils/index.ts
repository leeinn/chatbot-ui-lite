import { Message } from "@/types";
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";

export const OpenAIStream = async (
  messages: Message[],
  conversationId: string
) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const newMessages = messages?.[messages.length - 1]?.content || "";

  const res = await fetch("http://8.129.19.173:880/v1/chat-messages", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
    },
    method: "POST",
    body: JSON.stringify({
      inputs: {
        referenced_file: "测试文件",
      },
      query: newMessages,
      response_mode: "streaming",
      conversation_id: conversationId,
      user: "abc-123",
      files: [
        {
          type: "document",
          transfer_method: "remote_url",
          url: "https://blog-static-cdn-1309919152.cos.ap-beijing.myqcloud.com/%E6%B5%8B%E8%AF%95%E6%95%B0%E6%8D%AE.txt",
        },
      ],
    }),
  });

  if (res.status !== 200) {
    throw new Error("API returned an error");
  }

  // 状态标记
  let inThinkTag = false;

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          try {
            const data = JSON.parse(event.data);

            // 处理结束事件
            if (data.event === "message_end") {
              controller.close();
              return;
            }

            // 提取内容和会话ID
            const content = data.answer || "";
            const conversation_id = data.conversation_id;

            // 根据内容分析该如何处理
            const result = processContent(content, inThinkTag);
            inThinkTag = result.newThinkState;

            // 构建响应内容
            const contentToSend = {
              text: result.text,
              thinking: result.thinking,
              conversation_id,
            };

            // 发送响应
            if (contentToSend.text || contentToSend.thinking) {
              controller.enqueue(encoder.encode(JSON.stringify(contentToSend)));
            }
          } catch (e) {
            console.error(e);
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);
      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};

// 将内容处理逻辑抽离为独立函数
const processContent = (content: string, inThinkTag: boolean) => {
  let text = "";
  let thinking = "";
  let newThinkState = inThinkTag;

  if (inThinkTag) {
    // 在思考标签内
    const endTagIndex = content.indexOf("</think>");
    if (endTagIndex !== -1) {
      // 找到结束标签
      thinking = content.substring(0, endTagIndex);
      text = content.substring(endTagIndex + 8); // 8 是 </think> 的长度
      newThinkState = false;
    } else {
      // 没有结束标签
      thinking = content;
    }
  } else {
    // 不在思考标签内
    const startTagIndex = content.indexOf("<think>");
    if (startTagIndex !== -1) {
      // 找到开始标签
      text = content.substring(0, startTagIndex);

      // 检查同一块中是否有结束标签
      const remainingContent = content.substring(startTagIndex + 7);
      const endTagIndex = remainingContent.indexOf("</think>");

      if (endTagIndex !== -1) {
        // 同一块中有结束标签
        thinking = remainingContent.substring(0, endTagIndex);
        text += remainingContent.substring(endTagIndex + 8);
      } else {
        // 没有结束标签
        thinking = remainingContent;
        newThinkState = true;
      }
    } else {
      // 没有开始标签
      text = content;
    }
  }

  return { text, thinking, newThinkState };
};
