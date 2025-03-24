import { Message } from "@/types";
import { FC } from "react";
import { micromark } from "micromark";

interface Props {
  message: Message;
}

export const ChatMessage: FC<Props> = ({ message }) => {
  return (
    <div
      className={`flex flex-col ${
        message.role === "assistant" ? "items-start" : "items-end"
      }`}
    >
      {message.role === "assistant" &&
        message.thinking &&
        message.thinking.length > 0 && (
          <div className="bg-gray-100 p-3 rounded-md mb-2 text-sm text-gray-700">
            <div className="font-medium mb-1">思考过程：</div>
            <div
              dangerouslySetInnerHTML={{
                __html: micromark(message.thinking.replace(/\n\s*\n/g, "\n")),
              }}
            />
          </div>
        )}
      {message.content && (
        <div
          className={`flex items-center ${
            message.role === "assistant"
              ? " text-neutral-900"
              : "bg-[#e0e5e9] text-[#262626]"
          } rounded-2xl px-3 py-2 max-w-[67%] whitespace-pre-wrap`}
          style={{ overflowWrap: "anywhere" }}
        >
          <div
            dangerouslySetInnerHTML={{
              __html: micromark(message.content.replace(/\n\s*\n/g, "\n")),
            }}
          />
        </div>
      )}
    </div>
  );
};
