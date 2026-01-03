import React from "react";

const ChatMessage = ({ message, isRight = false, avatar, timestamp }) => {
  return (
    <div
      className={`flex items-start gap-3 w-2/3 ${
        isRight ? "justify-end ml-auto" : ""
      }`}
    >
      {!isRight && (
        <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-gray-500 text-sm font-medium">
              {message.sender?.charAt(0).toUpperCase() || "U"}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2 flex-1">
        <div className={`text-xs text-gray-500 ${isRight ? "text-right" : ""}`}>
          {timestamp || "Just now"}
        </div>
        <div
          className={`rounded-2xl p-3 ${
            isRight
              ? "bg-blue-500 text-white rounded-tr-sm"
              : "bg-gray-100 text-gray-800 rounded-tl-sm"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">
            {typeof message === "string" ? message : message.text || message}
          </p>
        </div>
      </div>
      {isRight && (
        <div className="w-12 h-12 rounded-full bg-blue-500 shrink-0 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-white text-sm font-medium">You</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;

