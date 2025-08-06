from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import pyttsx3
import subprocess

# For file reading
import pandas as pd
from PyPDF2 import PdfReader

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB limit

MEMORY_FILE = "memory.json"

# Load memory
try:
    with open(MEMORY_FILE, "r") as f:
        memory = json.load(f)
except FileNotFoundError:
    memory = {}

def save_memory():
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f)

# Text-to-speech
def speak(text):
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()

# Query LLaMA3 model
def query_llama3(prompt):
    try:
        result = subprocess.run(
            ["ollama", "run", "llama3"],
            input=prompt,
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    except Exception as e:
        return f"Error communicating with LLaMA3: {e}"

# Read file content based on extension
def extract_file_content(filepath):
    ext = os.path.splitext(filepath)[-1].lower()
    try:
        if ext == ".txt":
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()

        elif ext == ".csv":
            df = pd.read_csv(filepath)
            return df.to_string()

        elif ext == ".xlsx":
            df = pd.read_excel(filepath)
            return df.to_string()

        elif ext == ".pdf":
            reader = PdfReader(filepath)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text

        else:
            return None
    except Exception as e:
        return f"Error reading file: {e}"

# ==== ROUTES ====

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    command = data.get("message", "").lower()

    if "who created you" in command or "who made you" in command :
        return jsonify({"response":"I am a Large Language Model(LLM) created by Muhammed Aslam For his personal Assistens"})

    if "your name" in command or "what is your name" in command:
        return jsonify({"response": "My name is Alex"})

    if "remember" in command:
        key = command.replace("remember", "").strip()
        return jsonify({"response": f"What should I remember about {key}?", "action": "input", "key": key})

    elif "store" in command and "key" in data:
        memory[data["key"]] = data["message"]
        save_memory()
        return jsonify({"response": f"Got it! I remembered {data['key']} is {data['message']}."})

    elif "what do you remember" in command:
        if memory:
            items = [f"{k} is {v}" for k, v in memory.items()]
            return jsonify({"response": " ".join(items)})
        return jsonify({"response": "I don't remember anything yet."})

    elif "forget" in command:
        key = command.replace("forget", "").strip()
        if key in memory:
            del memory[key]
            save_memory()
            return jsonify({"response": f"I forgot {key}."})
        return jsonify({"response": f"I don’t know anything about {key}."})

    elif "exit" in command:
        return jsonify({"response": "Goodbye!"})

    else:
        response = query_llama3(data.get("message", ""))
        return jsonify({"response": response})

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"response": "No file part in the request."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"response": "No selected file."}), 400

    try:
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
        file.save(filepath)

        content = extract_file_content(filepath)
        if not content:
            return jsonify({"response": "Unsupported file format."}), 400

        # Optional: send content to LLaMA3 for direct analysis
        # analysis = query_llama3(f"Analyze this document:\n\n{content}")
        return jsonify({"response": content})

    except Exception as e:
        return jsonify({"response": f"File upload failed: {e}"}), 500

# ==== RUN APP ====
if __name__ == "__main__":
    app.run(debug=True)
