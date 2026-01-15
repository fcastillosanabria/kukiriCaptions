from moviepy.editor import VideoFileClip, CompositeVideoClip, VideoClip, ImageClip
from PIL import Image, ImageDraw, ImageFont
import whisper
import numpy as np

# ---------------- CONFIG (EXACTA AL FRONTEND) ----------------
VIDEO_ENTRADA = "hola.mp4"
SALIDA = "video_subtitulado.mp4"
FPS = 30

# Colores exactos del frontend
COLOR_TEXTO = (255, 255, 255)
COLOR_BORDE = (0, 0, 0)
COLOR_FONDO_NORMAL = (225, 225, 225, 230)
COLOR_FONDO_CLAVE = (255, 215, 0, 230)

# Animación (120ms como en frontend)
ANIM_DURACION_MS = 120
ANIM_FRAMES = int((ANIM_DURACION_MS / 1000) * FPS)

# ---------------- TRANSCRIPCIÓN ----------------
def transcribir_video(video_path):
    """Transcribe el video y retorna segmentos con palabras"""
    print("🎤 Transcribiendo con Whisper...")
    model = whisper.load_model("small")
    result = model.transcribe(
        video_path,
        language="es",
        word_timestamps=True
    )
    return result["segments"]

# ---------------- PROCESAMIENTO DE BLOQUES ----------------
def crear_bloques_desde_segmentos(segmentos, max_palabras=4):
    """Crea bloques de palabras con timestamps"""
    bloques = []
    
    for seg in segmentos:
        if "words" not in seg or not seg["words"]:
            continue
        
        words = seg["words"]
        bloque_actual = []
        
        for w in words:
            bloque_actual.append(w)
            
            if len(bloque_actual) >= max_palabras:
                bloques.append({
                    "words": bloque_actual,
                    "start": bloque_actual[0]["start"],
                    "end": bloque_actual[-1]["end"]
                })
                bloque_actual = []
        
        if bloque_actual:
            bloques.append({
                "words": bloque_actual,
                "start": bloque_actual[0]["start"],
                "end": bloque_actual[-1]["end"]
            })
    
    return bloques

# ---------------- ANIMACIÓN POP (EXACTA AL FRONTEND) ----------------
def pop_scale(t):
    """
    Función de escala pop EXACTA al frontend
    """
    if t < 0.5:
        return 0.85 + (t / 0.5) * 0.25  # 0.85 → 1.10
    else:
        return 1.10 - ((t - 0.5) / 0.5) * 0.10  # 1.10 → 1.0

# ---------------- DIBUJO (REPLICANDO CANVAS EXACTO) ----------------
def dibujar_bloque(words, canvas_width, canvas_height, frame_num):
    """
    Replica EXACTAMENTE la función dibujarBloque() del frontend
    CON TEXTO CENTRADO EN LOS BLOQUES
    """
    
    # Crear imagen transparente
    img = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Cargar fuentes Arial Bold
    try:
        font_60 = ImageFont.truetype("arialbd.ttf", 60)
        font_80 = ImageFont.truetype("arialbd.ttf", 80)
    except:
        try:
            font_60 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 60)
            font_80 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 80)
        except:
            try:
                font_60 = ImageFont.truetype("Arial.ttf", 60)
                font_80 = ImageFont.truetype("Arial.ttf", 80)
            except:
                print("⚠️ Advertencia: No se encontró Arial, usando fuente por defecto")
                font_60 = ImageFont.load_default()
                font_80 = ImageFont.load_default()
    
    # Constantes EXACTAS del frontend
    margen_x = 80
    max_width = canvas_width - margen_x * 2
    x = margen_x
    y = int(canvas_height * 0.75)
    
    # Encontrar palabra clave (la más larga)
    clave = max(words, key=lambda w: len(w["word"]))
    
    # Dibujar cada palabra
    for w in words:
        es_grande = w == clave
        
        # Calcular progreso de animación (0 a 1)
        if frame_num < ANIM_FRAMES:
            progress = frame_num / ANIM_FRAMES
            scale = pop_scale(progress)
        else:
            scale = 1.0
        
        base_size = 80 if es_grande else 60
        size = base_size
        
        # Usar fuente correcta
        font = font_80 if es_grande else font_60
        
        # Medir texto
        texto = w["word"]
        bbox = draw.textbbox((0, 0), texto, font=font)
        w_text = bbox[2] - bbox[0]
        
        # Salto de línea
        if x + w_text > margen_x + max_width:
            x = margen_x
            y += size + 30
        
        # Color de fondo
        fondo = COLOR_FONDO_CLAVE if es_grande else COLOR_FONDO_NORMAL
        
        # Transformación exacta del canvas
        centro_x = x + w_text / 2
        centro_y = y - size / 2
        
        # Calcular dimensiones escaladas
        w_scaled = w_text * scale
        h_scaled = size * scale
        
        # Calcular posición del rectángulo
        rect_x = x - 12
        rect_y = y - size
        rect_w = w_text + 24
        rect_h = size + 24
        
        # Aplicar escala desde el centro
        rect_x_scaled = centro_x - (rect_w * scale) / 2
        rect_y_scaled = centro_y - (rect_h * scale) / 2
        
        # Dibujar rectángulo de fondo
        draw.rectangle(
            [rect_x_scaled, rect_y_scaled, 
             rect_x_scaled + rect_w * scale, rect_y_scaled + rect_h * scale],
            fill=fondo
        )
        
        # Centrar texto en el rectángulo
        if scale != 1.0:
            # Crear imagen temporal para el texto escalado
            temp_w = int(w_text * 2)
            temp_h = int(size * 2)
            temp_img = Image.new("RGBA", (temp_w, temp_h), (0, 0, 0, 0))
            temp_draw = ImageDraw.Draw(temp_img)
            
            # Dibujar texto centrado en imagen temporal
            temp_draw.text(
                (temp_w // 4, temp_h // 4),
                texto,
                font=font,
                fill=COLOR_TEXTO,
                stroke_width=3,
                stroke_fill=COLOR_BORDE
            )
            
            # Escalar imagen
            scaled_w = int(temp_w * scale)
            scaled_h = int(temp_h * scale)
            temp_img_scaled = temp_img.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
            
            # Centrar en el rectángulo escalado
            paste_x = int(rect_x_scaled + (rect_w * scale - w_scaled) / 2)
            paste_y = int(rect_y_scaled + (rect_h * scale) / 2 - (scaled_h / 4))
            img.paste(temp_img_scaled, (paste_x, paste_y), temp_img_scaled)
        else:
            # Medir altura real del texto para centrado preciso
            bbox = draw.textbbox((0, 0), texto, font=font)
            h_text = bbox[3] - bbox[1]
            
            # Centrar texto horizontal y verticalmente en el rectángulo
            text_x = rect_x_scaled + (rect_w - w_text) / 2
            text_y = rect_y_scaled + (rect_h - h_text) / 2
            
            draw.text(
                (text_x, text_y),
                texto,
                font=font,
                fill=COLOR_TEXTO,
                stroke_width=3,
                stroke_fill=COLOR_BORDE
            )
        
        x += w_text + 25
    
    return img

# ---------------- GENERACIÓN VIDEO ----------------
def generar_video():
    print("🎬 Cargando video...")
    video = VideoFileClip(VIDEO_ENTRADA)
    
    ancho = video.w
    alto = video.h
    
    print(f"📐 Dimensiones: {ancho}x{alto}")
    
    # Transcribir
    segmentos = transcribir_video(VIDEO_ENTRADA)
    
    # Crear bloques
    print("📝 Creando bloques de subtítulos...")
    bloques = crear_bloques_desde_segmentos(segmentos)
    
    print(f"✨ Generando {len(bloques)} bloques con animación...")
    
    print("🎥 Componiendo video final...")
    
    # Crear video compuesto con alpha blending manual
    def make_final_frame(t):
        # Obtener frame del video original y hacer copia editable
        base_frame = video.get_frame(t).copy()
        
        # Ver si hay algún bloque activo en este tiempo
        for bloque in bloques:
            if bloque["start"] <= t <= bloque["end"]:
                # Calcular tiempo relativo al bloque
                t_rel = t - bloque["start"]
                frame_num = int(t_rel * FPS)
                
                # Dibujar subtítulos
                img_pil = dibujar_bloque(bloque["words"], ancho, alto, frame_num)
                overlay = np.array(img_pil)
                
                # Separar canales
                overlay_rgb = overlay[:, :, :3]
                overlay_alpha = overlay[:, :, 3] / 255.0
                
                # Componer: video * (1 - alpha) + overlay * alpha
                for c in range(3):
                    base_frame[:, :, c] = (
                        base_frame[:, :, c] * (1 - overlay_alpha) +
                        overlay_rgb[:, :, c] * overlay_alpha
                    ).astype('uint8')
                
                break  # Solo un bloque activo a la vez
        
        return base_frame
    
    final = VideoClip(make_final_frame, duration=video.duration)
    final = final.set_audio(video.audio)
    
    print("💾 Exportando video con audio...")
    final.write_videofile(
        SALIDA,
        fps=FPS,
        codec='libx264',
        audio_codec='aac',
        preset='medium',
        bitrate='8000k'
    )
    
    print("✅ ¡Video completado!")
    video.close()

# ---------------- EJECUCIÓN ----------------
if __name__ == "__main__":
    generar_video()