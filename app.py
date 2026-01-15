from flask import Flask, render_template, request, jsonify
import whisper
import os
# Importamos la librería para el refresco automático
from livereload import Server 

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Cargamos el modelo (Recuerda que esto tarda un poco al iniciar)
model = whisper.load_model("small")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/transcribir", methods=["POST"])
def transcribir():
    video = request.files["video"]
    os.makedirs("uploads", exist_ok=True)
    path = "uploads/video.mp4"
    video.save(path)

    result = model.transcribe(path, language="es", word_timestamps=True)
    bloques = []

    for seg in result["segments"]:
        if "words" not in seg: continue
        palabras = seg["words"]
        for i in range(0, len(palabras), 4):
            bloque = palabras[i:i+4]
            bloques.append({
                "start": bloque[0]["start"],
                "end": bloque[-1]["end"],
                "words": [{"word": w["word"].strip()} for w in bloque]
            })

    return jsonify({"video": "/uploads/video.mp4", "bloques": bloques})

# ---------------- RUN APP ----------------
if __name__ == "__main__":
    # En lugar de app.run, usamos el servidor de livereload
    app.debug = True
    server = Server(app.wsgi_app)
    
    # Le decimos que vigile cambios en la carpeta templates y archivos .py
    server.watch('templates/*.html')
    server.watch('*.py')
    
    # Iniciamos el servidor en el puerto 5000
    server.serve(port=5000, host='127.0.0.1')