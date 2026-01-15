// ============== VARIABLES GLOBALES ==============
let estilos = {
  texto: "#ffffff",
  borde: "#000000",
  fondoNormal: "rgba(225,225,225,0.9)",
  fondoClave: "rgba(255,215,0,0.9)",
};
let bloques = [];
let bloqueActivo = null;
let editando = false;
let currentVideoFile = null; // ← GUARDAR ARCHIVO ACTUAL
let backgroundAudio = null; // ← PARA EL AUDIO
let musicItems = [];

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("video");
const videoInput = document.getElementById("videoInput");
const videoList = document.getElementById("video-list");
const audioInput = document.getElementById("audioInput");
const volumeControl = document.getElementById("musicVolume");
const audioControls = document.getElementById("audioControls");
const musicList = document.getElementById("musicList");
let videosCache = new Map(); // CACHE DE SUBTÍTULOS POR VIDEO

// ============== SUBIR VIDEOS ==============
videoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  
  // Guardar archivo y URL actual
  currentVideoFile = file;
  currentVideoUrl = url;
  
  // 🔥 LIMPIAR SUBTÍTULOS DEL CANVAS (pero NO del cache)
  bloques = [];
  bloqueActivo = null;
  editando = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById("editor").innerHTML = "";
  
  // Cargar video
  video.src = url;
  video.load();
  
  // 🔥 SI YA TIENE SUBTÍTULOS EN CACHE, CARGARLOS
  if (videosCache.has(url)) {
    const cached = videosCache.get(url);
    bloques = cached.bloques;
    renderEditor();
    console.log("✅ Subtítulos cargados desde cache");
  }

  // Crear miniatura en asset library
  const tempVideo = document.createElement("video");
  tempVideo.src = url;
  tempVideo.preload = "metadata";

  tempVideo.onloadedmetadata = () => {
    const duration = formatTime(tempVideo.duration);

    const asset = document.createElement("div");
    asset.className = "mb-3 position-relative";
    asset.dataset.videoUrl = url; // Identificador único
    asset.innerHTML = `
      <div class="asset-card" style="border-radius: 8px; overflow: hidden; background: #000; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; position: relative; border: 3px solid transparent;">
        <span class="asset-duration" style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.8); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${duration}</span>
        ${videosCache.has(url) ? '<span style="position: absolute; top: 8px; right: 8px; background: rgba(99,102,241,0.9); padding: 2px 6px; border-radius: 4px; font-size: 10px;">✓ Sub</span>' : ''}
      </div>
      <div class="d-flex justify-content-between align-items-center mt-2">
        <div class="asset-name" style="font-size: 13px; color: #495057; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${file.name}</div>
        <button class="btn btn-sm btn-danger delete-video-btn" style="padding: 2px 8px; font-size: 11px; margin-left: 8px;" title="Eliminar video">🗑️</button>
      </div>
    `;

    const videoCard = asset.querySelector('.asset-card');
    videoCard.onclick = () => {
      // Cambiar video activo
      currentVideoFile = file;
      currentVideoUrl = url;
      video.src = url;
      video.load();
      video.play();
      
      // 🔥 CARGAR SUBTÍTULOS DE ESTE VIDEO DESDE CACHE
      if (videosCache.has(url)) {
        const cached = videosCache.get(url);
        bloques = cached.bloques;
        renderEditor();
        console.log("✅ Subtítulos cargados desde cache para este video");
      } else {
        // Si no tiene subtítulos, limpiar
        bloques = [];
        bloqueActivo = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById("editor").innerHTML = "";
      }
      
      // Actualizar borde activo
      document.querySelectorAll('.asset-card').forEach(card => {
        card.style.border = '3px solid transparent';
      });
      videoCard.style.border = '3px solid #6366f1';
    };

    // 🔥 BOTÓN ELIMINAR
    const deleteBtn = asset.querySelector('.delete-video-btn');
    deleteBtn.onclick = (e) => {
      e.stopPropagation(); // Evitar que active el click del video
      
      if (confirm(`¿Eliminar "${file.name}"?`)) {
        // Eliminar del cache
        if (videosCache.has(url)) {
          videosCache.delete(url);
          console.log(`🗑️ Video y subtítulos eliminados del cache. Total videos: ${videosCache.size}`);
        }
        
        // Si es el video actual, limpiar todo
        if (currentVideoUrl === url) {
          currentVideoFile = null;
          currentVideoUrl = null;
          bloques = [];
          bloqueActivo = null;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          document.getElementById("editor").innerHTML = "";
          video.src = "";
          video.load();
        }
        
        // Eliminar del DOM
        asset.remove();
        
        // Si no quedan videos, mostrar mensaje
        if (videoList.children.length === 0) {
          videoList.innerHTML = '<div class="text-muted text-center py-3" style="font-size: 13px;">No hay videos</div>';
        }
      }
    };

    // 🔥 QUITAR BORDE MORADO DE TODOS LOS VIDEOS ANTERIORES
    document.querySelectorAll('.asset-card').forEach(card => {
      card.style.border = '3px solid transparent';
    });
    
    // 🔥 PONER BORDE MORADO AL VIDEO RECIÉN SUBIDO
    videoCard.style.border = '3px solid #6366f1';

    // 🔥 AGREGAR A LA LISTA (no reemplazar)
    videoList.appendChild(asset);
  };

  // Limpiar input para poder subir el mismo archivo de nuevo
  videoInput.value = "";
});

// Format seconds → mm:ss
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ============== GENERAR SUBTÍTULOS ==============
async function generar() {
  if (!currentVideoFile) {
    alert("Por favor selecciona un video primero");
    return;
  }

  // VERIFICAR SI YA EXISTE EN CACHE
  if (videosCache.has(currentVideoUrl)) {
    alert("Este video ya tiene subtítulos generados. Usa los existentes o sube un video nuevo.");
    return;
  }

  const formData = new FormData();
  formData.append("video", currentVideoFile);

  const res = await fetch("/transcribir", {
    method: "POST",
    body: formData,
  });

   const data = await res.json();
  bloques = data.bloques;

  // 🔥 GUARDAR EN CACHE
  videosCache.set(currentVideoUrl, {
    file: currentVideoFile,
    bloques: bloques,
    url: currentVideoUrl
  });

  console.log(`✅ Subtítulos guardados en cache. Total videos: ${videosCache.size}`);

  // 🔥 ACTUALIZAR BADGE EN LA MINIATURA
  const assetCard = document.querySelector(`[data-video-url="${currentVideoUrl}"] .asset-card`);
  if (assetCard && !assetCard.querySelector('span[style*="top"]')) {
    assetCard.innerHTML += '<span style="position: absolute; top: 8px; right: 8px; background: rgba(99,102,241,0.9); padding: 2px 6px; border-radius: 4px; font-size: 10px;">✓ Sub</span>';
  }

  renderEditor();

  // Cambiar a panel de subtítulos
  document.querySelectorAll(".sidebar-left .nav-link").forEach((b) => b.classList.remove("active"));
  document.querySelector('[data-panel="script"]').classList.add("active");
  document.getElementById("video-panel").classList.add("d-none");
  document.getElementById("subtitles-panel").classList.remove("d-none");
  document.getElementById("stylesSubtitles-panel").classList.add("d-none");
  document.getElementById("music-panel").classList.add("d-none");
}

// ============== EDITOR DE SUBTÍTULOS ==============
function renderEditor() {
  const editor = document.getElementById("editor");
  editor.innerHTML = "";

  bloques.forEach((b, i) => {
    editor.innerHTML += `
      <textarea class="form-control mb-2"
          style="min-height: 60px;"
          onfocus="seleccionarBloque(${i})"
          oninput="editarBloque(${i}, this.value)">${b.words.map((w) => w.word).join(" ")}</textarea>
    `;
  });
}

function editarBloque(i, texto) {
  editando = true;

  const palabras = texto.trim().split(/\s+/);
  bloques[i].words = palabras.map((p) => ({
    word: p,
    animStart: null,
  }));

  bloqueActivo = bloques[i];
}

function seleccionarBloque(i) {
  bloqueActivo = bloques[i];
  editando = true;

  bloqueActivo.words.forEach((w) => (w.animStart = null));
  video.currentTime = bloques[i].start;
}

// ============== ESTILOS ==============
function cambiarEstilo(tipo, valor) {
  estilos[tipo] = valor;
  if (bloqueActivo) {
    requestAnimationFrame(() => dibujarBloque(bloqueActivo.words));
  }
}

function cambiarFondoNormal(hex) {
  estilos.fondoNormal = hexToRGBA(hex, 0.9);
  if (bloqueActivo) dibujarBloque(bloqueActivo.words);
}

function cambiarFondoClave(hex) {
  estilos.fondoClave = hexToRGBA(hex, 0.9);
  if (bloqueActivo) dibujarBloque(bloqueActivo.words);
}

function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ============== ANIMACIÓN ==============
function popScale(t) {
  if (t < 0.5) {
    return 0.85 + (t / 0.5) * 0.25; // 0.85 → 1.10
  } else {
    return 1.1 - ((t - 0.5) / 0.5) * 0.1; // 1.10 → 1.0
  }
}

function loopAnimacion() {
  if (bloqueActivo) {
    dibujarBloque(bloqueActivo.words);
  }
  requestAnimationFrame(loopAnimacion);
}

// ============== SINCRONIZACIÓN VIDEO ==============
video.ontimeupdate = () => {
  if (editando) return;

  const t = video.currentTime;
  const encontrado = bloques.find((b) => t >= b.start && t <= b.end);

  if (encontrado && bloqueActivo !== encontrado) {
    bloqueActivo = encontrado;
    bloqueActivo.words.forEach((w) => (w.animStart = null));
  } else if (!encontrado && bloqueActivo !== null) {
    // 🔥 NO HAY BLOQUE ACTIVO → LIMPIAR CANVAS
    bloqueActivo = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

video.onplay = () => (editando = false);

// ============== DIBUJO EN CANVAS ==============
function dibujarBloque(words) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const margenX = 80;
  const maxWidth = canvas.width - margenX * 2;
  let x = margenX;
  let y = canvas.height * 0.75;

  const clave = words.reduce((a, b) =>
    b.word.length > a.word.length ? b : a
  );

  const now = performance.now();

  words.forEach((w) => {
    const grande = w === clave;

    if (!w.animStart) w.animStart = now;

    const animDuration = 120;
    const elapsed = now - w.animStart;
    const progress = Math.min(elapsed / animDuration, 1);
    const scale = popScale(progress);

    const baseSize = grande ? 80 : 60;
    const size = baseSize;

    ctx.font = `bold ${size}px Arial`;
    const wText = ctx.measureText(w.word).width;

    if (x + wText > maxWidth) {
      x = margenX;
      y += size + 30;
    }

    ctx.save();

    ctx.translate(x + wText / 2, y - size / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + wText / 2), -(y - size / 2));

    const fondo = grande ? estilos.fondoClave : estilos.fondoNormal;

    ctx.fillStyle = fondo;
    ctx.fillRect(x - 12, y - size, wText + 24, size + 24);

    ctx.lineWidth = 3;
    ctx.strokeStyle = estilos.borde;
    ctx.strokeText(w.word, x, y);

    ctx.fillStyle = estilos.texto;
    ctx.fillText(w.word, x, y);

    ctx.restore();

    x += wText + 25;
  });
}

// ============== NAVEGACIÓN UI ==============
document.querySelectorAll(".sidebar-left .nav-link").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-left .nav-link").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const panel = btn.dataset.panel;
    document.querySelectorAll(".panel-content").forEach((p) => p.classList.add("d-none"));

    if (panel === "video") {
      document.getElementById("video-panel").classList.remove("d-none");
    } else if (panel === "texto") {
      document.getElementById("stylesSubtitles-panel").classList.remove("d-none");
    } else if (panel === "audio") {
      document.getElementById("music-panel").classList.remove("d-none");
    } else if (panel === "script") {
      document.getElementById("subtitles-panel").classList.remove("d-none");
    }
  });
});

// ============== AUDIO DE FONDO ==============
// Upload music
audioInput.addEventListener("change", () => {
  const file = audioInput.files[0];
  if (!file) return;

  const audio = new Audio(URL.createObjectURL(file));
  audio.loop = true;
  audio.volume = volumeControl.value || 0.3;

  const item = document.createElement("div");
  item.className = "music-item";

  item.innerHTML = `
    <span class="music-name">${file.name}</span>
    <button class="music-delete">🗑</button>
  `;

  // Select music
  item.addEventListener("click", (e) => {
    if (e.target.classList.contains("music-delete")) return;
    activateMusic(item, audio);
  });

  // Delete music
  item.querySelector(".music-delete").addEventListener("click", () => {
    if (backgroundAudio === audio) {
      audio.pause();
      backgroundAudio = null;
    }

    musicItems = musicItems.filter(m => m.audio !== audio);
    item.remove();

    if (musicItems.length) {
      const last = musicItems[musicItems.length - 1];
      activateMusic(last.element, last.audio);
    }
  });

  musicList.appendChild(item);
  musicItems.push({ element: item, audio });

  activateMusic(item, audio);

  audioControls.classList.remove("d-none");
  audioInput.value = "";
});

// Activate selected music
function activateMusic(element, audio) {
  musicItems.forEach(m => {
    m.element.classList.remove("active");
    m.audio.pause();
  });

  element.classList.add("active");
  backgroundAudio = audio;

  if (!video.paused) {
    audio.currentTime = video.currentTime % audio.duration;
    audio.play();
  }
}

// Sync video events
video.addEventListener("play", () => {
  if (backgroundAudio) backgroundAudio.play();
});

video.addEventListener("pause", () => {
  if (backgroundAudio) backgroundAudio.pause();
});

video.addEventListener("seeked", () => {
  if (backgroundAudio && backgroundAudio.duration) {
    backgroundAudio.currentTime =
      video.currentTime % backgroundAudio.duration;
  }
});

video.addEventListener("ended", () => {
  if (backgroundAudio) {
    backgroundAudio.pause();
    backgroundAudio.currentTime = 0;
  }
});

// Volume
volumeControl.addEventListener("input", (e) => {
  if (backgroundAudio) {
    backgroundAudio.volume = e.target.value;
  }
});

// Iniciar loop de animación
requestAnimationFrame(loopAnimacion);