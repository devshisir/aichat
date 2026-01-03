import React, { useState, useRef, useEffect } from "react";
import ReactJsonView from "react-json-view";

const Dashboard = () => {
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

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const apiUrl = import.meta.env.VITE_WEBHOOK_URL;
  const isWebhookConfigured = apiUrl && apiUrl.trim() !== "";

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Toggle recording audio (click to start, click again to stop)
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          setAudioBlob(audioBlob);
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          // Clear text input when audio recording is completed
          setInput("");
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        // Start timer
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        setError("Microphone access denied. Please allow microphone access.");
        console.error("Error accessing microphone:", err);
      }
    }
  };

  // Handle audio file selection
  const handleAudioFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith("audio/")) {
        setSelectedAudioFile(file);
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        // Clear text input when audio is selected
        setInput("");
        // Create preview URL
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
      } else {
        setError("Please select an audio file");
      }
    }
  };

  // Remove selected audio
  const removeAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setSelectedAudioFile(null);
    setRecordingTime(0);
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Format time in MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate that either text or audio is provided, but not both
    const hasText = input.trim() !== "";
    const hasAudio = selectedAudioFile !== null || audioBlob !== null;

    if (!hasText && !hasAudio) {
      setError("Please enter text or record/upload audio");
      return;
    }

    if (hasText && hasAudio) {
      setError("Please provide either text OR audio, not both");
      return;
    }

    if (!isWebhookConfigured) {
      setError("Webhook URL is not configured");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Build URL with query parameters
      const url = new URL(apiUrl);

      // Add text as query parameter if text is provided
      if (hasText) {
        url.searchParams.append("text", input.trim());
      }

      // Add audio as query parameter if audio is provided (convert to base64)
      if (hasAudio) {
        let audioBase64 = "";
        if (selectedAudioFile) {
          // Convert file to base64
          const reader = new FileReader();
          audioBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const base64String = reader.result.split(",")[1]; // Remove data:audio/...;base64, prefix
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(selectedAudioFile);
          });
        } else if (audioBlob) {
          // Convert blob to base64
          const reader = new FileReader();
          audioBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const base64String = reader.result.split(",")[1]; // Remove data:audio/...;base64, prefix
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
          });
        }
        if (audioBase64) {
          url.searchParams.append("audio", audioBase64);
        }
      }

      // Add other query parameters
      if (userId) url.searchParams.append("user_id", userId);
      if (sessionId) url.searchParams.append("session_id", sessionId);
      if (role) url.searchParams.append("role", role);

      // Request options - no body needed since everything is in query params
      const requestOptions = {
        method: "POST",
      };

      const response = await fetch(url.toString(), requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonData = await response.json();
      setData(jsonData);

      // Clear audio after successful submission
      removeAudio();
      setInput("");
    } catch (err) {
      setError(err.message || "An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        API JSON Response Viewer
      </h1>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Input Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Webhook Configuration Warning */}
          {!isWebhookConfigured && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-yellow-600 mr-2 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="text-yellow-800 font-semibold text-sm">
                    Webhook URL Not Configured
                  </h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please set VITE_WEBHOOK_URL in your .env file and restart
                    the dev server.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Query Parameters Section */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="userId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  User ID
                </label>
                <input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="sessionId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Session ID
                </label>
                <input
                  id="sessionId"
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter session ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Role
                </label>
                <input
                  id="role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="user"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mb-4">
              {/* WhatsApp-like Input Box */}
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                {/* Attachment/Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || !isWebhookConfigured || isRecording}
                  className="shrink-0 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  title="Upload audio file"
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
                  accept="audio/*"
                  onChange={handleAudioFileSelect}
                  className="hidden"
                />

                {/* Text Input */}
                <input
                  id="input"
                  type="text"
                  value={input}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setInput(newValue);
                    // Clear audio when text is entered
                    if (newValue.trim() && (selectedAudioFile || audioBlob)) {
                      removeAudio();
                    }
                  }}
                  placeholder="Type a message"
                  className="flex-1 outline-none bg-transparent text-gray-800 placeholder-gray-400 disabled:cursor-not-allowed"
                  disabled={loading || !isWebhookConfigured || isRecording}
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
              </div>

              {/* Audio Player Section - Below Input Field */}
              {(audioUrl || selectedAudioFile || audioBlob) && !isRecording && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      {selectedAudioFile ? (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Audio file: {selectedAudioFile.name}
                          </p>
                          <audio
                            src={audioUrl}
                            controls
                            className="w-full h-10"
                          />
                        </div>
                      ) : (
                        <audio
                          src={audioUrl}
                          controls
                          className="w-full h-10"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={removeAudio}
                      className="shrink-0 text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                      title="Remove audio"
                    >
                      <svg
                        className="w-5 h-5"
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
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isWebhookConfigured || isRecording}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-md transition duration-200 cursor-pointer"
            >
              {loading ? "Loading..." : "Submit"}
            </button>
          </form>
        </div>

        {/* Right Side - Response Area */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Response</h2>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-700">Sending request...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-red-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-red-800 font-semibold">Error</h3>
                  <p className="text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Output Area */}
          {data && !loading && !error && (
            <div className="overflow-auto max-h-[calc(100vh-250px)]">
              <ReactJsonView
                src={data}
                theme="apex"
                collapsed={false}
                displayDataTypes={true}
                displayObjectSize={true}
                enableClipboard={false}
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "1rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #e5e7eb",
                }}
              />
            </div>
          )}

          {/* Empty State */}
          {!data && !loading && !error && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <p>Submit a request to see the JSON response here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
