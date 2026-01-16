# KukiriCaptions

Aplicación en Python para generar subtítulos automáticos a partir de videos.
Backend en Python y frontend con HTML, CSS y JavaScript.

Este proyecto fue probado en un **entorno completamente limpio**, instalando todo únicamente mediante terminal.

---

## Requisitos del sistema

- Sistema operativo: Windows 10 / 11
- Python: 3.11.x (probado con Python 3.11.9)
- Instalación por terminal (pip)
- FFmpeg instalado en el sistema
- Navegador web moderno

⚠️ Python 3.12+ NO es compatible actualmente debido a torch y whisper.

---

## Dependencias externas

### FFmpeg (OBLIGATORIO)

Este proyecto requiere FFmpeg instalado y agregado al PATH del sistema.

Verificar instalación:

```ffmpeg -version```

## Instalación y ejecución (TODO por terminal)

### 1. Crear entorno virtual
```python -m venv venv```

### 2. Activar entorno virtual (Windows)
```venv\Scripts\activate```

### 3. Instalar todas las dependencias del proyecto
```pip install -r requirements.txt```

### 4. Ejecutar la aplicación
```python app.py```

