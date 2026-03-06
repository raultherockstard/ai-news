/* ───────────────────────────────────────────
   CAROUSEL CREATOR — MAIN SCRIPT
─────────────────────────────────────────── */

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  slides: [],          // array of slide objects
  activeIdx: 0,        // currently-viewed slide index
  selectedElem: null,  // id of the selected overlay element
  zoom: 1,             // canvas zoom factor
  dragging: null,      // { id, startX, startY, origX, origY }
  resizing: null,      // { id, startX, startY, origW, origH }
};

let elemCounter = 0;

// Canvas size presets (display scale: full / 2)
const SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1080x1920': { w: 1080, h: 1920 },
  '1920x1080': { w: 1920, h: 1080 },
};
const DISPLAY_SCALE = 0.5; // render at half size for perf

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  addSlide();  // start with one blank slide
  bindControls();
  setTimeout(autoFitCanvasMobile, 50);
});

function bindControls() {
  document.getElementById('addSlideBtn').addEventListener('click', addSlide);
  document.getElementById('exportBtn').addEventListener('click', exportAll);
  document.getElementById('exportPNGBtn').addEventListener('click', exportCurrentPNG);
  document.getElementById('exportAllBtn').addEventListener('click', exportAll);
  document.getElementById('mediaInput').addEventListener('change', onMediaUpload);
  document.getElementById('bgColor').addEventListener('input', onBgColorChange);
  document.getElementById('gradientSelect').addEventListener('change', onGradientChange);
  document.getElementById('overlayOpacity').addEventListener('input', onOverlayOpacityChange);
  document.getElementById('canvasSize').addEventListener('change', onCanvasSizeChange);
  document.getElementById('slideTitle').addEventListener('input', onSlideTitleChange);
  document.getElementById('zoomInBtn').addEventListener('click', () => changeZoom(0.1));
  document.getElementById('zoomOutBtn').addEventListener('click', () => changeZoom(-0.1));

  // Element property controls
  document.getElementById('elemText').addEventListener('input', onElemTextChange);
  document.getElementById('fontSize').addEventListener('input', onFontSizeChange);
  document.getElementById('fontWeight').addEventListener('change', onFontWeightChange);
  document.getElementById('textColor').addEventListener('input', onTextColorChange);
  document.getElementById('shapeColor').addEventListener('input', onShapeColorChange);
  document.getElementById('shapeOpacity').addEventListener('input', onShapeOpacityChange);
  document.getElementById('elemX').addEventListener('input', onElemPosChange);
  document.getElementById('elemY').addEventListener('input', onElemPosChange);

  // Global mouseup / mousemove for drag
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Touch equivalents
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);

  // Auto-fit canvas on mobile when orientation changes
  window.addEventListener('resize', autoFitCanvasMobile);
}

// ── Slide management ──────────────────────────────────────────────────────────
function makeSlide(title) {
  return {
    id: Date.now() + Math.random(),
    title: title || `Slide ${state.slides.length + 1}`,
    mediaUrl: null,
    mediaType: null, // 'image' | 'video'
    bgColor: '#1a1a2e',
    gradient: 'dark-bottom',
    overlayOpacity: 50,
    canvasSize: '1080x1080',
    elements: [],
  };
}

function addSlide() {
  const slide = makeSlide();
  state.slides.push(slide);
  renderSlideList();
  selectSlide(state.slides.length - 1);
}

function selectSlide(idx) {
  state.activeIdx = idx;
  state.selectedElem = null;
  renderSlideList();
  renderCanvas();
  syncDesignPanel();
  hideElemProps();
}

function deleteSlide() {
  if (state.slides.length === 1) return alert('You need at least one slide.');
  state.slides.splice(state.activeIdx, 1);
  state.activeIdx = Math.max(0, state.activeIdx - 1);
  renderSlideList();
  renderCanvas();
  syncDesignPanel();
}

function duplicateSlide() {
  const src = state.slides[state.activeIdx];
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = Date.now() + Math.random();
  copy.title = src.title + ' (copy)';
  // re-assign element ids
  copy.elements.forEach(el => { el.id = 'el_' + (++elemCounter); });
  state.slides.splice(state.activeIdx + 1, 0, copy);
  renderSlideList();
  selectSlide(state.activeIdx + 1);
}

function moveSlideUp() {
  if (state.activeIdx === 0) return;
  const tmp = state.slides[state.activeIdx];
  state.slides[state.activeIdx] = state.slides[state.activeIdx - 1];
  state.slides[state.activeIdx - 1] = tmp;
  selectSlide(state.activeIdx - 1);
}

function moveSlideDown() {
  if (state.activeIdx === state.slides.length - 1) return;
  const tmp = state.slides[state.activeIdx];
  state.slides[state.activeIdx] = state.slides[state.activeIdx + 1];
  state.slides[state.activeIdx + 1] = tmp;
  selectSlide(state.activeIdx + 1);
}

// ── Render slide list (left panel) ───────────────────────────────────────────
function renderSlideList() {
  const list = document.getElementById('slideList');
  list.innerHTML = '';
  state.slides.forEach((slide, idx) => {
    const li = document.createElement('li');
    const thumb = document.createElement('div');
    thumb.className = 'slide-thumb' + (idx === state.activeIdx ? ' active' : '');
    thumb.onclick = () => selectSlide(idx);

    if (slide.mediaUrl && slide.mediaType === 'image') {
      const img = document.createElement('img');
      img.src = slide.mediaUrl;
      img.className = 'slide-thumb-img';
      thumb.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'slide-thumb-canvas';
      ph.style.background = slide.bgColor;
      ph.textContent = slide.mediaType === 'video' ? '▶ Video' : '';
      thumb.appendChild(ph);
    }

    const label = document.createElement('div');
    label.className = 'slide-thumb-label';
    label.textContent = `${idx + 1}. ${slide.title}`;
    thumb.appendChild(label);

    li.appendChild(thumb);
    list.appendChild(li);
  });
}

// ── Render canvas (center panel) ─────────────────────────────────────────────
function renderCanvas() {
  const slide = currentSlide();
  const frame = document.getElementById('canvasFrame');
  const mediaDiv = document.getElementById('canvasMedia');
  const gradDiv = document.getElementById('canvasGradient');
  const overlay = document.getElementById('canvasOverlay');
  const badge = document.getElementById('slideNumberBadge');

  // Canvas dimensions
  const size = SIZES[slide.canvasSize] || SIZES['1080x1080'];
  const dispW = size.w * DISPLAY_SCALE * state.zoom;
  const dispH = size.h * DISPLAY_SCALE * state.zoom;
  frame.style.width = dispW + 'px';
  frame.style.height = dispH + 'px';
  frame.style.background = slide.bgColor;

  // Media
  mediaDiv.innerHTML = '';
  if (slide.mediaUrl) {
    if (slide.mediaType === 'image') {
      const img = document.createElement('img');
      img.src = slide.mediaUrl;
      mediaDiv.appendChild(img);
    } else if (slide.mediaType === 'video') {
      const vid = document.createElement('video');
      vid.src = slide.mediaUrl;
      vid.autoplay = true;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      mediaDiv.appendChild(vid);
    }
  } else {
    const ph = document.createElement('div');
    ph.className = 'upload-placeholder';
    ph.innerHTML = `
      <button class="upload-btn" onclick="document.getElementById('mediaInput').click()">
        📷 Upload Image or Video
      </button>
      <p class="upload-hint">Supports JPG, PNG, GIF, MP4, MOV</p>
    `;
    mediaDiv.appendChild(ph);
  }

  // Gradient
  gradDiv.className = 'canvas-gradient ' + (slide.gradient === 'none' ? '' : slide.gradient);
  gradDiv.style.opacity = slide.overlayOpacity / 100;

  // Slide badge
  badge.textContent = `${state.activeIdx + 1} / ${state.slides.length}`;

  // Overlay elements
  overlay.innerHTML = '';
  slide.elements.forEach(el => renderElement(el));
}

function renderElement(el) {
  const overlay = document.getElementById('canvasOverlay');
  const scale = DISPLAY_SCALE * state.zoom;
  const div = document.createElement('div');
  div.className = 'overlay-elem' + (el.id === state.selectedElem ? ' selected' : '');
  div.dataset.id = el.id;
  div.style.left = (el.x * scale) + 'px';
  div.style.top = (el.y * scale) + 'px';
  if (el.w) div.style.width = (el.w * scale) + 'px';
  if (el.h) div.style.height = (el.h * scale) + 'px';

  div.onclick = (e) => { e.stopPropagation(); selectElem(el.id); };
  div.addEventListener('mousedown', (e) => startDrag(e, el.id));
  div.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    startDrag({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => {} }, el.id);
  }, { passive: false });

  switch (el.type) {
    case 'text':
    case 'heading':
    case 'subtitle': {
      const span = document.createElement('div');
      span.className = 'elem-text';
      span.textContent = el.text;
      span.style.fontSize = (el.fontSize * scale) + 'px';
      span.style.fontWeight = el.fontWeight || '700';
      span.style.color = el.color || '#ffffff';
      span.style.textAlign = el.align || 'left';
      div.appendChild(span);
      break;
    }
    case 'icon': {
      const span = document.createElement('div');
      span.className = 'elem-icon';
      span.style.fontSize = (el.fontSize * scale) + 'px';
      span.textContent = el.text;
      div.appendChild(span);
      break;
    }
    case 'rectangle': {
      div.className += ' elem-shape-rect';
      div.style.background = hexToRgba(el.color || '#ffffff', (el.opacity || 80) / 100);
      break;
    }
    case 'circle': {
      div.className += ' elem-shape-circle';
      div.style.background = hexToRgba(el.color || '#ffffff', (el.opacity || 80) / 100);
      break;
    }
    case 'divider': {
      div.className += ' elem-divider';
      div.style.background = el.color || '#ffffff';
      div.style.width = (el.w * scale) + 'px';
      break;
    }
    case 'badge': {
      div.className += ' elem-badge';
      div.textContent = el.text;
      break;
    }
  }

  // Resize handle
  const rh = document.createElement('div');
  rh.className = 'resize-handle';
  rh.addEventListener('mousedown', (e) => { e.stopPropagation(); startResize(e, el.id); });
  rh.addEventListener('touchstart', (e) => {
    e.stopPropagation(); e.preventDefault();
    const t = e.touches[0];
    startResize({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => {} }, el.id);
  }, { passive: false });
  div.appendChild(rh);

  overlay.appendChild(div);
}

// Deselect on canvas click
document.addEventListener('click', (e) => {
  if (e.target.closest('.canvas-overlay') || e.target.closest('.overlay-elem')) return;
  if (e.target.closest('.canvas-frame')) {
    state.selectedElem = null;
    renderCanvas();
    hideElemProps();
  }
});

// ── Add elements ──────────────────────────────────────────────────────────────
function addText() {
  addElem({ type: 'text', text: 'Your text here', fontSize: 28, fontWeight: '700', color: '#ffffff', x: 60, y: 200, align: 'left' });
}
function addHeading() {
  addElem({ type: 'heading', text: 'Slide Heading', fontSize: 52, fontWeight: '900', color: '#ffffff', x: 60, y: 120, align: 'left' });
}
function addSubtitle() {
  addElem({ type: 'subtitle', text: 'Supporting subtitle text', fontSize: 22, fontWeight: '400', color: '#cccccc', x: 60, y: 260, align: 'left' });
}
function addIcon(char) {
  addElem({ type: 'icon', text: char, fontSize: 60, x: 100, y: 100 });
}
function addShape(type) {
  addElem({ type, color: '#ffffff', opacity: 20, x: 200, y: 200, w: 200, h: type === 'circle' ? 200 : 80 });
}
function addDivider() {
  addElem({ type: 'divider', color: '#ffffff', x: 60, y: 300, w: 400, h: 3 });
}
function addBadge() {
  addElem({ type: 'badge', text: 'NEW', x: 60, y: 60, w: 80, h: 28 });
}

function addElem(props) {
  const id = 'el_' + (++elemCounter);
  const el = Object.assign({ id }, props);
  currentSlide().elements.push(el);
  state.selectedElem = id;
  renderCanvas();
  renderSlideList();
  showElemProps(el);
}

// ── Select / deselect elements ────────────────────────────────────────────────
function selectElem(id) {
  state.selectedElem = id;
  renderCanvas();
  const el = currentSlide().elements.find(e => e.id === id);
  if (el) showElemProps(el);
}

function deleteSelected() {
  if (!state.selectedElem) return;
  const slide = currentSlide();
  slide.elements = slide.elements.filter(e => e.id !== state.selectedElem);
  state.selectedElem = null;
  renderCanvas();
  renderSlideList();
  hideElemProps();
}

// ── Drag ─────────────────────────────────────────────────────────────────────
function startDrag(e, id) {
  e.preventDefault();
  const el = currentSlide().elements.find(el => el.id === id);
  if (!el) return;
  state.dragging = { id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
}

function startResize(e, id) {
  e.preventDefault();
  const el = currentSlide().elements.find(el => el.id === id);
  if (!el) return;
  state.resizing = { id, startX: e.clientX, startY: e.clientY, origW: el.w || 100, origH: el.h || 40 };
}

function onMouseMove(e) {
  const scale = DISPLAY_SCALE * state.zoom;
  if (state.dragging) {
    const dx = (e.clientX - state.dragging.startX) / scale;
    const dy = (e.clientY - state.dragging.startY) / scale;
    const el = currentSlide().elements.find(el => el.id === state.dragging.id);
    if (el) {
      el.x = Math.round(state.dragging.origX + dx);
      el.y = Math.round(state.dragging.origY + dy);
      renderCanvas();
      syncElemPosition(el);
    }
  }
  if (state.resizing) {
    const dx = (e.clientX - state.resizing.startX) / scale;
    const dy = (e.clientY - state.resizing.startY) / scale;
    const el = currentSlide().elements.find(el => el.id === state.resizing.id);
    if (el) {
      el.w = Math.max(20, Math.round(state.resizing.origW + dx));
      el.h = Math.max(10, Math.round(state.resizing.origH + dy));
      renderCanvas();
    }
  }
}

function onMouseUp() {
  state.dragging = null;
  state.resizing = null;
}

// ── Element property panel ────────────────────────────────────────────────────
function showElemProps(el) {
  const panel = document.getElementById('elementPropsPanel');
  const textP = document.getElementById('textProps');
  const shapeP = document.getElementById('shapeProps');
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';

  const isText = ['text', 'heading', 'subtitle', 'icon', 'badge'].includes(el.type);
  const isShape = ['rectangle', 'circle', 'divider'].includes(el.type);

  textP.style.display = isText ? 'flex' : 'none';
  textP.style.flexDirection = 'column';
  textP.style.gap = '6px';
  shapeP.style.display = isShape ? 'flex' : 'none';
  shapeP.style.flexDirection = 'column';
  shapeP.style.gap = '6px';

  if (isText) {
    document.getElementById('elemText').value = el.text || '';
    document.getElementById('fontSize').value = el.fontSize || 24;
    document.getElementById('fontSizeVal').textContent = (el.fontSize || 24) + 'px';
    document.getElementById('fontWeight').value = el.fontWeight || '700';
    document.getElementById('textColor').value = el.color || '#ffffff';
  }
  if (isShape) {
    document.getElementById('shapeColor').value = el.color || '#ffffff';
    document.getElementById('shapeOpacity').value = el.opacity || 80;
    document.getElementById('shapeOpacityVal').textContent = (el.opacity || 80) + '%';
  }

  syncElemPosition(el);
}

function syncElemPosition(el) {
  document.getElementById('elemX').value = el.x;
  document.getElementById('elemY').value = el.y;
}

function hideElemProps() {
  document.getElementById('elementPropsPanel').style.display = 'none';
}

// ── Element property change handlers ─────────────────────────────────────────
function withSelected(fn) {
  if (!state.selectedElem) return;
  const el = currentSlide().elements.find(e => e.id === state.selectedElem);
  if (el) fn(el);
}

function onElemTextChange() {
  withSelected(el => { el.text = document.getElementById('elemText').value; renderCanvas(); renderSlideList(); });
}
function onFontSizeChange() {
  const v = parseInt(document.getElementById('fontSize').value);
  document.getElementById('fontSizeVal').textContent = v + 'px';
  withSelected(el => { el.fontSize = v; renderCanvas(); });
}
function onFontWeightChange() {
  withSelected(el => { el.fontWeight = document.getElementById('fontWeight').value; renderCanvas(); });
}
function onTextColorChange() {
  withSelected(el => { el.color = document.getElementById('textColor').value; renderCanvas(); });
}
function onShapeColorChange() {
  withSelected(el => { el.color = document.getElementById('shapeColor').value; renderCanvas(); });
}
function onShapeOpacityChange() {
  const v = parseInt(document.getElementById('shapeOpacity').value);
  document.getElementById('shapeOpacityVal').textContent = v + '%';
  withSelected(el => { el.opacity = v; renderCanvas(); });
}
function onElemPosChange() {
  withSelected(el => {
    el.x = parseInt(document.getElementById('elemX').value) || 0;
    el.y = parseInt(document.getElementById('elemY').value) || 0;
    renderCanvas();
  });
}
function setAlign(align) {
  withSelected(el => { el.align = align; renderCanvas(); });
}

// ── Design panel sync ─────────────────────────────────────────────────────────
function syncDesignPanel() {
  const slide = currentSlide();
  document.getElementById('bgColor').value = slide.bgColor;
  document.getElementById('gradientSelect').value = slide.gradient;
  document.getElementById('overlayOpacity').value = slide.overlayOpacity;
  document.getElementById('canvasSize').value = slide.canvasSize;
  document.getElementById('slideTitle').value = slide.title;
  document.getElementById('slideName').textContent = slide.title;
}

// ── Slide setting change handlers ─────────────────────────────────────────────
function onBgColorChange() {
  currentSlide().bgColor = document.getElementById('bgColor').value;
  renderCanvas(); renderSlideList();
}
function onGradientChange() {
  currentSlide().gradient = document.getElementById('gradientSelect').value;
  renderCanvas();
}
function onOverlayOpacityChange() {
  currentSlide().overlayOpacity = parseInt(document.getElementById('overlayOpacity').value);
  renderCanvas();
}
function onCanvasSizeChange() {
  currentSlide().canvasSize = document.getElementById('canvasSize').value;
  renderCanvas();
}
function onSlideTitleChange() {
  const v = document.getElementById('slideTitle').value;
  currentSlide().title = v;
  document.getElementById('slideName').textContent = v;
  renderSlideList();
}

// ── Media upload ──────────────────────────────────────────────────────────────
function onMediaUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const slide = currentSlide();
  slide.mediaUrl = url;
  slide.mediaType = file.type.startsWith('video') ? 'video' : 'image';
  renderCanvas();
  renderSlideList();
  e.target.value = '';
}

// ── Zoom ─────────────────────────────────────────────────────────────────────
function changeZoom(delta) {
  state.zoom = Math.min(2, Math.max(0.3, state.zoom + delta));
  document.getElementById('zoomLevel').textContent = Math.round(state.zoom * 100) + '%';
  renderCanvas();
}

// ── Export ────────────────────────────────────────────────────────────────────
async function exportCurrentPNG() {
  showModal('Exporting slide...', 10);
  try {
    const canvas = await captureSlide(state.activeIdx);
    setProgress(100);
    download(canvas.toDataURL('image/png'), `slide-${state.activeIdx + 1}.png`);
  } catch(err) {
    alert('Export failed: ' + err.message);
  }
  hideModal();
}

async function exportAll() {
  if (typeof JSZip === 'undefined') {
    alert('JSZip not loaded yet. Please wait a moment and try again.');
    return;
  }
  showModal('Exporting all slides...', 0);
  const zip = new JSZip();
  const folder = zip.folder('carousel');

  for (let i = 0; i < state.slides.length; i++) {
    setProgress(Math.round((i / state.slides.length) * 85));
    document.getElementById('progressLabel').textContent = `Exporting slide ${i + 1} of ${state.slides.length}...`;
    try {
      const canvas = await captureSlide(i);
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      folder.file(`slide-${i + 1}-${sanitize(state.slides[i].title)}.png`, base64, { base64: true });
    } catch(err) {
      console.warn('Slide ' + (i+1) + ' failed:', err);
    }
  }

  setProgress(95);
  document.getElementById('progressLabel').textContent = 'Zipping files...';
  const blob = await zip.generateAsync({ type: 'blob' });
  setProgress(100);
  download(URL.createObjectURL(blob), 'carousel.zip');
  hideModal();
}

async function captureSlide(idx) {
  // Temporarily switch to that slide, capture, switch back
  const prev = state.activeIdx;
  state.activeIdx = idx;
  state.selectedElem = null;
  renderCanvas();
  await wait(120); // let images render

  const frame = document.getElementById('canvasFrame');
  const canvas = await html2canvas(frame, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    scale: 2,
  });

  state.activeIdx = prev;
  state.selectedElem = null;
  renderCanvas();
  return canvas;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function currentSlide() { return state.slides[state.activeIdx]; }

function download(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

function sanitize(str) {
  return (str || 'slide').replace(/[^a-z0-9_\-]/gi, '_').toLowerCase().slice(0, 30);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function showModal(title, progress) {
  document.getElementById('exportModal').style.display = 'flex';
  document.querySelector('.modal-title').textContent = title;
  setProgress(progress);
}
function hideModal() {
  document.getElementById('exportModal').style.display = 'none';
}
function setProgress(pct) {
  document.getElementById('progressFill').style.width = pct + '%';
}

// ── Mobile tab switching ───────────────────────────────────────────────────────
function switchTab(tab) {
  const panels = {
    slides: document.getElementById('slideListPanel'),
    canvas: document.getElementById('canvasPanelEl'),
    design: document.getElementById('designPanelEl'),
  };
  const tabs = {
    slides: document.getElementById('tabSlides'),
    canvas: document.getElementById('tabCanvas'),
    design: document.getElementById('tabDesign'),
  };
  Object.values(panels).forEach(p => p && p.classList.remove('mobile-active'));
  Object.values(tabs).forEach(t => t && t.classList.remove('active'));
  if (panels[tab]) panels[tab].classList.add('mobile-active');
  if (tabs[tab]) tabs[tab].classList.add('active');
  if (tab === 'canvas') autoFitCanvasMobile();
}

// ── Auto-fit canvas to mobile viewport ───────────────────────────────────────
function autoFitCanvasMobile() {
  if (window.innerWidth > 768) return;
  const slide = currentSlide();
  if (!slide) return;
  const size = SIZES[slide.canvasSize] || SIZES['1080x1080'];
  const baseW = size.w * DISPLAY_SCALE;
  const available = window.innerWidth - 24;
  state.zoom = Math.max(0.2, Math.min(available / baseW, 1));
  document.getElementById('zoomLevel').textContent = Math.round(state.zoom * 100) + '%';
  renderCanvas();
}

// ── Touch drag/resize ─────────────────────────────────────────────────────────
function onTouchMove(e) {
  if (!state.dragging && !state.resizing) return;
  e.preventDefault();
  const t = e.touches[0];
  onMouseMove({ clientX: t.clientX, clientY: t.clientY });
}

function onTouchEnd() {
  onMouseUp();
}
