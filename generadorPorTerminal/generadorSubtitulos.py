from moviepy.editor import VideoFileClip, CompositeVideoClip, ImageClip
from PIL import Image, ImageDraw, ImageFont
import whisper
import numpy as np

# ---------------- CONFIG ----------------
VIDEO_ENTRADA = "videoCorto.mp4"
SALIDA = "video_subtitulado.mp4"

ANCHO = 1080
ALTO = 1920
FPS = 30

MARGEN_X = 80
Y_POS = int(ALTO * 0.75)

MAX_PALABRAS = 4
DURACION_MIN = 0.15

# Colores
COLOR_FONDO_NORMAL = (225, 225, 225, 225)
COLOR_FONDO_CLAVE = (255, 215, 0, 200)
COLOR_TEXTO = "white"
COLOR_BORDE_NORMAL = "black"
COLOR_BORDE_CLAVE = "black"

# ---------------- TRANSCRIPCIÓN ----------------

def transcribir_video(video_path):
    model = whisper.load_model("small")
    result = model.transcribe(
        video_path,
        language="es",
        word_timestamps=True
    )
    return result["segments"]

# ---------------- LÓGICA DE TEXTO ----------------

def dividir_en_bloques(words, max_palabras=MAX_PALABRAS):
    bloques = []
    actual = []

    for w in words:
        actual.append(w)
        if len(actual) == max_palabras:
            bloques.append(actual)
            actual = []

    if actual:
        bloques.append(actual)

    return bloques


def palabra_clave(bloque):
    return max(bloque, key=lambda x: len(x["word"]))


# ---------------- RENDER SUBTÍTULO ----------------

def crear_subtitulo_bloque(bloque):
    img = Image.new("RGBA", (ANCHO, ALTO), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    try:
        font_normal = ImageFont.truetype("arialbd.ttf", 60)
        font_clave = ImageFont.truetype("arialbd.ttf", 80)
    except:
        font_normal = font_clave = ImageFont.load_default()

    x = MARGEN_X
    max_width = ANCHO - MARGEN_X

    clave = palabra_clave(bloque)

    for w in bloque:
        texto = w["word"].strip()
        font = font_clave if w == clave else font_normal

        bbox = draw.textbbox((0, 0), texto, font=font)
        w_text = bbox[2] - bbox[0]
        h_text = bbox[3] - bbox[1]

        if x + w_text > max_width:
            break

        # Fondo
        fondo = COLOR_FONDO_CLAVE if w == clave else COLOR_FONDO_NORMAL
        borde = COLOR_BORDE_CLAVE if w == clave else COLOR_BORDE_NORMAL

        draw.rectangle(
            [x - 12, Y_POS - 12, x + w_text + 12, Y_POS + h_text + 12],
            fill=fondo
        )

        draw.text(
            (x, Y_POS),
            texto,
            font=font,
            fill=COLOR_TEXTO,
            stroke_width=3,
            stroke_fill=borde
        )

        x += w_text + 25

    return np.array(img)

# ---------------- VIDEO FINAL ----------------

def generar_video():
    video = VideoFileClip(VIDEO_ENTRADA).resize((ANCHO, ALTO))
    segmentos = transcribir_video(VIDEO_ENTRADA)

    clips = [video]

    for seg in segmentos:
        if "words" not in seg:
            continue

        bloques = dividir_en_bloques(seg["words"])

        for bloque in bloques:
            inicio = bloque[0]["start"]
            fin = bloque[-1]["end"]
            duracion = max(DURACION_MIN, fin - inicio)

            img = crear_subtitulo_bloque(bloque)

            clip = (
                ImageClip(img)
                .set_start(inicio)
                .set_duration(duracion)
            )

            clips.append(clip)

    final = CompositeVideoClip(clips)
    final.write_videofile(SALIDA, fps=FPS)

# ---------------- EJECUCIÓN ----------------
if __name__ == "__main__":
    generar_video()
    print("✅ Video subtitulado estilo Shorts generado")
