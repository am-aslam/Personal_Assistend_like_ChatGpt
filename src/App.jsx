import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Send,
  Repeat2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Copy,
  Edit3,
} from "lucide-react";
import Lottie from "lottie-react";
import botAvatar from "./bot-avatar.json";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [memoryKey, setMemoryKey] = useState("");
  const messagesEndRef = useRef(null);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }]);
  };

  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage) return;
    addMessage("user", userMessage);
    setInput("");

    await sendMessageFromText(userMessage);
  };

  const sendMessageFromText = async (text) => {
    const payload = memoryKey
      ? { message: text, key: memoryKey }
      : { message: text };

    try {
      const res = await fetch("http://127.0.0.1:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const botMessage = data.response || "Alex didn't understand.";
      addMessage("bot", botMessage);
      speak(botMessage);

      if (data.action === "input") setMemoryKey(data.key);
      else setMemoryKey("");
    } catch (err) {
      addMessage("bot", "❌ Could not connect to backend.");
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("⚠️ Speech Recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const voiceText = event.results[0][0].transcript;
      setInput(voiceText);
      addMessage("user", voiceText);
      sendMessageFromText(voiceText);
    };

    recognition.onerror = (event) => {
      alert("🎙️ Voice recognition error: " + event.error);
    };

    recognition.start();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      const content = data.response || "Alex couldn't read that file.";

      // Simulate user input from file content
      addMessage("user", content);
      await sendMessageFromText(content);
    } catch (err) {
      addMessage("bot", "❌ Upload failed.");
    }
  };

  return (
    <div className="bg-[#0D0D0D] text-white min-h-screen flex flex-col">
      <header className="p-4 text-lg font-semibold border-b border-gray-800 flex items-center justify-between">
        <span className="text-xl sm:text-2xl">Alex</span>
        <Lottie animationData={botAvatar} className="w-10 h-10" />
      </header>

      <main
        className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto"
        style={{ maxHeight: "75vh" }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-full sm:max-w-xl px-4 py-3 rounded-2xl text-sm whitespace-pre-line break-words ${
                msg.sender === "user"
                  ? "bg-gray-700 text-white"
                  : "bg-[#1E1E1E] text-gray-200"
              }`}
            >
              {msg.text}
              {msg.sender === "bot" && (
                <div className="flex items-center mt-2 space-x-2 text-gray-500 text-xs">
                  <ThumbsUp className="w-4 h-4 cursor-pointer" />
                  <ThumbsDown className="w-4 h-4 cursor-pointer" />
                  <Edit3 className="w-4 h-4 cursor-pointer" />
                  <Copy className="w-4 h-4 cursor-pointer" />
                  <Repeat2 className="w-4 h-4 cursor-pointer" />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 border-t border-gray-800 bg-[#0D0D0D]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center rounded-2xl bg-[#1E1E1E] px-4 py-2">
            <input
              type="text"
              placeholder="Ask Alex anything..."
              className="flex-1 bg-transparent focus:outline-none text-white placeholder-gray-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="text-gray-400 cursor-pointer px-2"
            >
              📄
            </label>
            <Mic
              onClick={handleVoiceInput}
              className="w-5 h-5 text-gray-400 cursor-pointer"
            />
            <div
              onClick={sendMessage}
              className="ml-2 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </footer>

      <div className="text-xs text-center text-gray-500 py-2">
        Alex can make mistakes. Check important info.{" "}
        <a href="#" className="underline">
          See Cookie Preferences.
        </a>
      </div>
    </div>
  );
}
