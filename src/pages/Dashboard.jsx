import { ScrollArea } from "@/components/ui/scroll-area";
import ChatSkeleton from "@/components/ChatSkeleton";
import ChatMessage from "@/components/ChatMessage";
import {
  formatTime,
  toggleRecording as toggleRecordingHelper,
  handleAudioFileSelect as handleAudioFileSelectHelper,
  removeAudio as removeAudioHelper,
} from "@/utils/helper";
import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCcwIcon, XIcon } from "lucide-react";
import axios from "axios";

const Dashboard = () => {
  const navigate = useNavigate();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [role, setRole] = useState("user");

  // Messages state
  const [messages, setMessages] = useState([]);

  const apiUrl = import.meta.env.VITE_WEBHOOK_URL;
  const isWebhookConfigured = apiUrl && apiUrl.trim() !== "";

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Toggle recording audio (click to start, click again to stop)
  const toggleRecording = () => {
    toggleRecordingHelper({
      isRecording,
      setIsRecording,
      mediaRecorderRef,
      audioChunksRef,
      timerRef,
      setAudioBlob,
      setAudioUrl,
      setInput,
      setRecordingTime,
      setError,
      setSelectedAudioFile,
      fileInputRef,
      audioUrl,
    });
  };

  // Handle audio file selection
  const handleAudioFileSelect = (e) => {
    handleAudioFileSelectHelper(e, {
      setSelectedAudioFile,
      setAudioBlob,
      setAudioUrl,
      setRecordingTime,
      setInput,
      setError,
    });
  };

  const removeAudio = () => {
    removeAudioHelper({
      audioUrl,
      setAudioBlob,
      setAudioUrl,
      setSelectedAudioFile,
      setRecordingTime,
      fileInputRef,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      (input.trim() || audioBlob || selectedAudioFile) &&
      !loading &&
      isWebhookConfigured
    ) {
      setLoading(true);
      setError(null);

      try {
        // Create FormData
        const formData = new FormData();

        // Create payload object with snake_case field names as expected by API
        const payload = {
          user_id: userId || "123",
          session_id: sessionId || "abc",
          role: role || "user",
          text: input.trim() || "",
        };

        // Add payload as JSON string (as shown in the API example)
        formData.append("payload", JSON.stringify(payload));

        // Add audio file if available (recorded or selected)
        if (audioBlob) {
          formData.append("audio", audioBlob, "recording.wav");
        } else if (selectedAudioFile) {
          formData.append("audio", selectedAudioFile);
        }

        // Send POST request using axios
        const response = await axios.post(`${apiUrl}/voice/chat`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const responseData = response.data;

        // Add user message to chat
        if (input.trim() || audioBlob || selectedAudioFile) {
          const userMessage = {
            id: Date.now(),
            text: input.trim() || "[Audio message]",
            isRight: true,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setMessages((prev) => [...prev, userMessage]);
        }

        // Add AI response to chat
        // Handle different response formats
        let aiResponseText = null;

        if (typeof responseData === "string") {
          // Response is a direct string
          aiResponseText = responseData;
        } else if (responseData?.text) {
          aiResponseText = responseData.text;
        } else if (responseData?.message) {
          aiResponseText = responseData.message;
        } else if (responseData?.result) {
          aiResponseText = responseData.result;
        } else if (responseData?.response) {
          aiResponseText = responseData.response;
        } else if (responseData?.content) {
          aiResponseText = responseData.content;
        } else if (responseData && typeof responseData === "object") {
          // Try to get the first string value from the object
          const firstValue = Object.values(responseData).find(
            (val) => typeof val === "string" && val.trim()
          );
          if (firstValue) {
            aiResponseText = firstValue;
          }
        }

        if (aiResponseText) {
          const aiMessage = {
            id: Date.now() + 1,
            text: aiResponseText,
            isRight: false,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setMessages((prev) => [...prev, aiMessage]);
        }

        // Clear input and audio after successful submission
        setInput("");
        removeAudio();
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to send message. Please try again.";
        setError(errorMessage);
        console.error("Error submitting form:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Format time in MM:SS

  return (
    <>
      <div className="container mx-auto h-screen">
        {isWebhookConfigured ? (
          <div className="flex flex-col overflow-hidden h-full">
            <div className="border-b py-3 w-2/3 mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Chat with AI</h3>
                  <p className="text-sm text-gray-500">
                    Ask me anything about your services or products.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/")}
                  className="shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                  title="Close and go to home"
                >
                  <XIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <ScrollArea className="flex-1 w-2/3 mx-auto py-3">
              <div className="p-4 space-y-4">
                {loading && messages.length === 0 ? (
                  <ChatSkeleton />
                ) : (
                  <>
                    {messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isRight={message.isRight}
                        timestamp={message.timestamp}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>
            <div className="shrink-0 p-4 flex flex-col items-center gap-2">
              {error && (
                <div className="w-1/2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="w-1/2">
                {loading && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-4 w-4 bg-gray-800 rounded-full animate-pulse"></div>
                    <h4 className="text-sm font-medium animate-pulse">
                      Generating response...
                    </h4>
                  </div>
                )}
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-3 py-2"
                >
                  {/* Attachment/Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || !isWebhookConfigured || isRecording}
                    className="shrink-0 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    title="Upload .wav audio file"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".wav,audio/wav,audio/wave,audio/x-wav"
                    onChange={handleAudioFileSelect}
                    className="hidden"
                  />

                  {/* Text Input or Audio Player */}
                  {audioBlob || selectedAudioFile ? (
                    <div className="flex-1 flex items-center gap-2">
                      <audio src={audioUrl} controls className="flex-1 h-10" />
                      <button
                        type="button"
                        onClick={removeAudio}
                        className="shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        title="Remove audio"
                      >
                        <svg
                          className="w-4 h-4 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        id="input"
                        type="text"
                        value={input}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setInput(newValue);
                        }}
                        placeholder="Ask me anything"
                        className="flex-1 outline-none bg-transparent text-gray-800 placeholder-gray-400 disabled:cursor-not-allowed"
                        disabled={
                          loading || !isWebhookConfigured || isRecording
                        }
                      />

                      {/* Recording Indicator (only when recording) */}
                      {isRecording && (
                        <div className="flex items-center gap-2 shrink-0 text-red-500">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">
                            {formatTime(recordingTime)}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Record Button */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={loading || !isWebhookConfigured}
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isRecording
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-gray-100 hover:bg-gray-200"
                    } disabled:bg-gray-50 disabled:cursor-not-allowed`}
                    title={
                      isRecording
                        ? "Click to stop recording"
                        : "Click to start recording"
                    }
                  >
                    <svg
                      className={`w-5 h-5 ${
                        isRecording ? "text-white" : "text-gray-600"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </button>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !isWebhookConfigured ||
                      isRecording ||
                      (!input.trim() && !audioBlob && !selectedAudioFile)
                    }
                    className="shrink-0 w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    title="Send message"
                  >
                    <svg
                      className="w-5 h-5 text-white disabled:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-2/3 mx-auto h-full flex flex-col items-center justify-center">
            <div className="flex items-center justify-center bg-red-50 rounded-full p-2">
              <XIcon size={25} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-center mt-2">
              Webhook URL not configured
            </h1>
            <p className="text-gray-500">
              Please configure the webhook URL in the environment variables.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
