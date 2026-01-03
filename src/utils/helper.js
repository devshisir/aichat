export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

// Format timestamp consistently for display
export const formatTimestamp = (dateString) => {
  if (!dateString) {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Parse the date string - handle ISO format with or without timezone
  let date;

  // If the date string doesn't have a timezone indicator (Z or +/-),
  // assume it's UTC and append 'Z'
  if (
    typeof dateString === "string" &&
    !dateString.includes("Z") &&
    !dateString.match(/[+-]\d{2}:\d{2}$/)
  ) {
    // Remove microseconds if present and append Z for UTC
    const normalizedDateString = dateString.replace(/\.\d+$/, "") + "Z";
    date = new Date(normalizedDateString);
  } else {
    date = new Date(dateString);
  }

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Format to local time consistently
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Sort messages by created_at (oldest first, newest last)
export const sortMessagesByCreatedAt = (messages) => {
  return [...messages].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
};

// Format messages for display
// Response structure: [{ id, user_id, session_id, role, content, meta_data, created_at }, ...]
export const formatMessages = (messagesArray) => {
  if (!messagesArray || messagesArray.length === 0) {
    return [];
  }

  // Sort messages by created_at (oldest first, newest last)
  const sortedMessages = sortMessagesByCreatedAt(messagesArray);

  // Format messages for chat display
  const formattedMessages = sortedMessages.map((msg) => ({
    id: msg.id || Date.now() + Math.random(),
    text: msg.content || msg.text || msg.message || "",
    isRight: msg.role === "user",
    timestamp: formatTimestamp(msg.created_at),
  }));

  return formattedMessages;
};

// Convert audio blob to WAV format
const convertToWav = async (audioBlob) => {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const wav = audioBufferToWav(audioBuffer);
    return new Blob([wav], { type: "audio/wav" });
  } catch (error) {
    console.error("Error converting to WAV:", error);
    throw error;
  }
};

// Convert AudioBuffer to WAV format
const audioBufferToWav = (buffer) => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length;
  const bufferSize = 44 + length * numChannels * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, length * numChannels * bytesPerSample, true);

  // Convert audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(
        -1,
        Math.min(1, buffer.getChannelData(channel)[i])
      );
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  return arrayBuffer;
};

export const toggleRecording = async ({
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
}) => {
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
    // Start recording - clear previous audio first
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setSelectedAudioFile(null);
    setInput("");
    // Reset file input so the same file can be selected again
    if (fileInputRef?.current) {
      fileInputRef.current.value = "";
    }

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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        try {
          // Convert to WAV format
          const wavBlob = await convertToWav(audioBlob);
          setAudioBlob(wavBlob);
          const url = URL.createObjectURL(wavBlob);
          setAudioUrl(url);
          // Clear text input when audio recording is completed
          setInput("");
        } catch (error) {
          setError("Failed to convert audio to WAV format");
          console.error("Error converting audio:", error);
        }

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

export const handleAudioFileSelect = (
  e,
  {
    setSelectedAudioFile,
    setAudioBlob,
    setAudioUrl,
    setRecordingTime,
    setInput,
    setError,
  }
) => {
  const file = e.target.files[0];
  if (file) {
    // Check if file is .wav format
    const isWavFile =
      file.type === "audio/wav" ||
      file.type === "audio/wave" ||
      file.type === "audio/x-wav" ||
      file.name.toLowerCase().endsWith(".wav");

    if (isWavFile) {
      setSelectedAudioFile(file);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      // Clear text input when audio is selected
      setInput("");
      // Clear any previous errors
      setError(null);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    } else {
      setError("Please select a .wav format audio file");
      // Reset file input
      e.target.value = "";
    }
  }
};

export const removeAudio = ({
  audioUrl,
  setAudioBlob,
  setAudioUrl,
  setSelectedAudioFile,
  setRecordingTime,
  fileInputRef,
}) => {
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
  }
  setAudioBlob(null);
  setAudioUrl(null);
  setSelectedAudioFile(null);
  setRecordingTime(0);
  // Reset file input so the same file can be selected again
  if (fileInputRef?.current) {
    fileInputRef.current.value = "";
  }
};
