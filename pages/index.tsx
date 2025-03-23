import { Chat } from "@/components/Chat/Chat";
import { Footer } from "@/components/Layout/Footer";
import { Navbar } from "@/components/Layout/Navbar";
import { Message } from "@/types";
import { OpenAIStream } from "@/utils";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (message: Message) => {
    const updatedMessages = [...messages, message];

    setMessages(updatedMessages);
    setLoading(true);

    try {
      const stream = await OpenAIStream(updatedMessages, conversationId);

      if (!stream) {
        return;
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let isFirst = true;

      let textBuffer = "";
      let thinkingBuffer: string = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);

        console.log("chunkValue", chunkValue);

        try {
          // 解析接收到的JSON格式内容
          const parsedContent = JSON.parse(chunkValue);

          console.log("parsedContent", parsedContent);

          setConversationId(parsedContent.conversation_id);

          // 更新普通文本内容
          if (parsedContent.text) {
            textBuffer += parsedContent.text;
          }

          // 更新思考内容
          if (parsedContent.thinking) {
            thinkingBuffer += parsedContent.thinking;
          }

          if (isFirst) {
            isFirst = false;
            setMessages((messages) => [
              ...messages,
              {
                role: "assistant",
                content: textBuffer,
                thinking: thinkingBuffer,
              },
            ]);
          } else {
            setMessages((messages) => {
              const lastMessage = messages[messages.length - 1];
              const updatedMessage = {
                ...lastMessage,
                content: textBuffer,
                thinking: thinkingBuffer,
              };
              return [...messages.slice(0, -1), updatedMessage];
            });
          }
        } catch (e) {
          console.error("Error parsing chunk:", e, chunkValue);
          // 如果解析失败，则当作纯文本处理
          if (isFirst) {
            isFirst = false;
            setMessages((messages) => [
              ...messages,
              {
                role: "assistant",
                content: chunkValue,
              },
            ]);
          } else {
            setMessages((messages) => {
              const lastMessage = messages[messages.length - 1];
              const updatedMessage = {
                ...lastMessage,
                content: (lastMessage.content || "") + chunkValue,
              };
              return [...messages.slice(0, -1), updatedMessage];
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
      throw error;
    }

    setLoading(false);
    console.log("setLoading(false)");
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: `Hi there! I'm Chatbot UI, an AI assistant. I can help you with things like answering questions, providing information, and helping with tasks. How can I help you?`,
      },
    ]);
  };

  useEffect(() => {
    // scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `Hi there! I'm Chatbot UI, an AI assistant. I can help you with things like answering questions, providing information, and helping with tasks. How can I help you?`,
      },
    ]);
  }, []);

  return (
    <>
      <Head>
        <title>Chatbot UI</title>
        <meta
          name="description"
          content="A simple chatbot starter kit for OpenAI's chat model using Next.js, TypeScript, and Tailwind CSS."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col h-screen">
        <Navbar />

        <div className="flex-1 overflow-auto sm:px-10 pb-4 sm:pb-10">
          <div className="max-w-[800px] mx-auto mt-4 sm:mt-12">
            <Chat
              messages={messages}
              loading={loading}
              onSend={handleSend}
              onReset={handleReset}
            />
            <div ref={messagesEndRef} />
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
