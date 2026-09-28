<template>
    <div
      v-if="el.visible"
      class="td-element"
      :style="wrapperStyle"
      @mousedown.stop="onMouseDown"
      @contextmenu.stop.prevent="emit('contextmenu', $event, el)"
    >
      <!-- Sprite -->
      <div v-if="el.type === 'sprite'" class="fill sprite-wrap">
        <img
          v-if="spritePath"
          ref="spriteImgRef"
          :src="currentImgSrc || spritePath"
          class="sprite-img-hidden"
          crossorigin="anonymous"
          draggable="false"
          @dragstart.prevent
          @load="drawTinted"
          @error="onImgError"
        />
        <canvas v-if="spritePath && !imgFailed" ref="canvasRef" class="sprite-canvas" />
        <div v-if="!spritePath || imgFailed" class="sprite-fallback">{{ el.text }}</div>
      </div>

      <!-- 3D Model Preview (Font 5) -->
      <div v-else-if="el.type === 'model' || el.font === 5" class="fill model-wrap" :style="modelWrapStyle">
        <div class="model-viewport">
          <img
            v-if="modelImgSrc && !modelFailed"
            ref="modelImgRef"
            :src="modelImgSrc"
            class="model-img-hidden"
            crossorigin="anonymous"
            draggable="false"
            @dragstart.prevent
            @load="processModelCanvas"
            @error="onModelError"
            :alt="`Model ${el.modelId}`"
          />
          <canvas
            v-if="modelImgSrc && !modelFailed"
            ref="modelCanvasRef"
            class="model-canvas"
            :style="modelImgStyle"
          />
          <div v-else-if="modelFailed" class="model-fallback">
            <span class="model-badge">#{{ el.modelId || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Box / Line -->
      <div v-else-if="el.type === 'box' || el.type === 'line'" class="fill text-el" :style="textWrapStyle">
        <div v-if="el.text && el.text !== '_'" class="text-content">
          <div v-if="wrappedLines && wrappedLines.length > 1" class="wrapped-text">
            <span v-for="(line, i) in wrappedLines" :key="i" class="wrapped-line" :style="textStyle">
              <span v-for="(tok, ti) in getLineTokens(line)" :key="ti" :style="{ color: tok.color }">{{ tok.text }}</span>
            </span>
          </div>
          <span v-else :style="textStyle">
            <span v-for="(tok, ti) in getLineTokens(el.text)" :key="ti" :style="{ color: tok.color }">{{ tok.text }}</span>
          </span>
        </div>
      </div>

      <!-- Label -->
      <div v-else class="fill text-el" :style="textWrapStyle">
        <div class="text-content">
          <div v-if="wrappedLines && wrappedLines.length > 1" class="wrapped-text">
            <span v-for="(line, i) in wrappedLines" :key="i" class="wrapped-line" :style="textStyle">
              <span v-for="(tok, ti) in getLineTokens(line)" :key="ti" :style="{ color: tok.color }">{{ tok.text }}</span>
            </span>
          </div>
          <span v-else :style="textStyle">
            <span v-for="(tok, ti) in getLineTokens(el.text || '_')" :key="ti" :style="{ color: tok.color }">{{ tok.text }}</span>
          </span>
        </div>
      </div>

    </div>
    <Teleport v-if="el.visible && selected" to="#selection-overlay">
      <div class="sel-outline-global" :style="[wrapperStyle, { border: `${0.5 * props.zoom}px dashed #0a246a` }]">
        <div class="name-label-global">{{ el.locked ? '🔒 ' : '' }}{{ el.name }}</div>
        <div
          v-if="!el.locked"
          class="resize-handle-global"
          @mousedown.stop="onResizeStart"
        />
      </div>
    </Teleport>
  </template>

  <script setup>
  import { computed, ref, watch, nextTick } from 'vue'
  import { rgbaToCSS, numToHex6, hexToRGBA } from '../../utils/colors'
  import { spriteImagePath, localSpriteImagePath, prinesideSpriteUrl } from '../../constants/sprites'
  import { FONTS } from '../../constants/fonts'
  import { getModelImageUrl, getModelFallbackUrls } from '../../constants/models'

  const props = defineProps({
    el: { type: Object, required: true },
    selected: { type: Boolean, default: false },
    zoom: { type: Number, default: 1 },
  })

  const emit = defineEmits(['mousedown', 'resize-start', 'contextmenu'])

  const imgFailed = ref(false)
  const currentImgSrc = ref(null)
  const fallbackIndex = ref(0)
  const spriteImgRef = ref(null)
  const canvasRef = ref(null)

  // 3D Model Preview state
  const modelFailed = ref(false)
  const modelFallbackIndex = ref(0)
  const currentModelSrc = ref(null)

  const modelCandidates = computed(() => {
    if (props.el.type !== 'model' && props.el.font !== 5) return []
    const id = props.el.modelId ?? 2880
    return getModelFallbackUrls(id)
  })

  const modelImgSrc = computed(() => {
    if (currentModelSrc.value) return currentModelSrc.value
    if (props.el.type !== 'model' && props.el.font !== 5) return null
    return getModelImageUrl(props.el.modelId ?? 2880)
  })

  function onModelError() {
    const list = modelCandidates.value
    modelFallbackIndex.value++
    if (modelFallbackIndex.value < list.length) {
      currentModelSrc.value = list[modelFallbackIndex.value]
    } else {
      modelFailed.value = true
    }
  }

  const modelImgRef = ref(null)
  const modelCanvasRef = ref(null)

  function processModelCanvas() {
    nextTick(() => {
      const img = modelImgRef.value
      const cv = modelCanvasRef.value
      if (!img || !cv || !img.complete || img.naturalWidth === 0) return

      try {
        cv.width = img.naturalWidth
        cv.height = img.naturalHeight
        const ctx = cv.getContext('2d')
        ctx.clearRect(0, 0, cv.width, cv.height)
        ctx.drawImage(img, 0, 0)

        // Remove solid white background from JPG renders (e.g. prineside renders)
        const imgData = ctx.getImageData(0, 0, cv.width, cv.height)
        const d = imgData.data
        let hasProcessed = false

        const col = props.el.color
        const hasCustomColor = col !== undefined && col !== 0xFFFFFFFF && col !== -1
        let tintR = 255, tintG = 255, tintB = 255, tintA = 255
        if (hasCustomColor) {
          const rgba = hexToRGBA(col)
          tintR = rgba.r
          tintG = rgba.g
          tintB = rgba.b
          tintA = rgba.a
        }

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i+1], b = d[i+2]
          // If pixel is near-white (solid white backdrop)
          if (r > 240 && g > 240 && b > 240) {
            d[i+3] = 0 // completely transparent
            hasProcessed = true
          } else {
            if (r > 220 && g > 220 && b > 220) {
              // soft antialiased edge
              const brightness = Math.max(r, g, b)
              const alphaFactor = (255 - brightness) / 35
              d[i+3] = Math.min(d[i+3], Math.round(d[i+3] * alphaFactor))
              hasProcessed = true
            }
            if (hasCustomColor) {
              // Tint non-transparent pixels with model color (e.g. SA-MP PlayerTextDrawColor)
              d[i] = Math.round((d[i] * tintR) / 255)
              d[i+1] = Math.round((d[i+1] * tintG) / 255)
              d[i+2] = Math.round((d[i+2] * tintB) / 255)
              d[i+3] = Math.round((d[i+3] * tintA) / 255)
              hasProcessed = true
            }
          }
        }
        if (hasProcessed) {
          ctx.putImageData(imgData, 0, 0)
        }
      } catch (err) {
        console.warn('processModelCanvas error:', err)
      }
    })
  }

  watch(() => props.el.modelId, (newId) => {
    modelFailed.value = false
    modelFallbackIndex.value = 0
    currentModelSrc.value = newId !== undefined ? getModelImageUrl(newId) : null
    nextTick(() => processModelCanvas())
  }, { immediate: true })

  const modelWrapStyle = computed(() => {
    const bg = props.el.bgColor ? rgbaToCSS(props.el.bgColor) : 'transparent'
    return {
      backgroundColor: bg,
      borderRadius: '2px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  })

  const modelImgStyle = computed(() => {
    const rotZ = props.el.rotZ || 0
    const zoom = props.el.zoom || 1.0
    const scaleX = (props.el.scaleX ?? 1) * zoom
    const scaleY = (props.el.scaleY ?? 1) * zoom
    return {
      maxWidth: '100%',
      maxHeight: '100%',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      transform: `scale(${scaleX}, ${scaleY}) rotate(${rotZ}deg)`,
      filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.6))',
    }
  })

  const spritePath = computed(() => {
    if (props.el.type !== 'sprite') return null
    if (props.el.spriteImg) return props.el.spriteImg
    const [lib, tex] = props.el.text.split(':')
    if (!lib || !tex) return null
    return spriteImagePath(lib, tex)
  })

  function getFallbackCandidates() {
    if (props.el.type !== 'sprite' || !props.el.text?.includes(':')) return []
    const [lib, tex] = props.el.text.split(':')
    const primary = spriteImagePath(lib, tex)
    const local = localSpriteImagePath(lib, tex)
    const prineside = prinesideSpriteUrl(lib, tex)
    const openMp = `https://assets.open.mp/assets/images/sprites/${lib}/${tex}.png`
    const openMpHud = `https://assets.open.mp/assets/images/sprites/hud/${tex}.png`
    return [...new Set([primary, local, openMp, openMpHud, prineside].filter(Boolean))]
  }

  function onImgError() {
    const candidates = getFallbackCandidates()
    fallbackIndex.value++
    if (fallbackIndex.value < candidates.length) {
      currentImgSrc.value = candidates[fallbackIndex.value]
    } else {
      imgFailed.value = true
    }
  }

  watch(spritePath, (newVal) => {
    imgFailed.value = false
    fallbackIndex.value = 0
    currentImgSrc.value = newVal
    nextTick(() => drawTinted())
  }, { immediate: true })

  watch(() => props.el.color, () => {
    drawTinted()
    processModelCanvas()
  })
  watch(() => props.el.w, () => drawTinted())
  watch(() => props.el.h, () => drawTinted())
  watch(() => props.el.scaleX, () => processModelCanvas())
  watch(() => props.el.scaleY, () => processModelCanvas())
  watch(() => props.el.rotZ, () => processModelCanvas())
  watch(() => props.el.zoom, () => processModelCanvas())


  function wrapText(text)
  {
    if (!text) return []
    // In SA-MP, textdraws ONLY break into new lines on explicit ~n~ or \n
    if (/(?:~n~|~n|\\n|\n)/i.test(text)) {
      return text.split(/(?:~n~|~n|\\n|\n)/i)
    }
    return [text]
  }

  function drawTinted()
  {
    nextTick(() => {
      const img = spriteImgRef.value
      const cv = canvasRef.value
      if (!img || !cv || !img.complete || img.naturalWidth === 0) return

      try {
        cv.width = img.naturalWidth
        cv.height = img.naturalHeight
        const ctx = cv.getContext('2d')
        ctx.clearRect(0, 0, cv.width, cv.height)

        const c = props.el.color >>> 0
        const { r, g, b, a } = hexToRGBA(c)

        if (a === 0) return

        ctx.globalAlpha = a / 255

        if (r === 255 && g === 255 && b === 255) {
          // white = no tint
          ctx.drawImage(img, 0, 0)
        } else {
          // draw tint color first
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect(0, 0, cv.width, cv.height)
          // multiply image on top — dark pixels stay dark, light pixels get tinted
          ctx.globalCompositeOperation = 'multiply'
          ctx.drawImage(img, 0, 0)
          // restore alpha from original image
          ctx.globalCompositeOperation = 'destination-in'
          ctx.drawImage(img, 0, 0)
          ctx.globalCompositeOperation = 'source-over'
        }

        ctx.globalAlpha = 1
      } catch (err) {
        console.warn('drawTinted error:', err)
      }
    })
  }

  
  // Standard GTA San Andreas TextDraw CFont scales (calibrated to GTA SA bitmap glyph metrics)
  const FONT_Y_SCALE = [8.8, 7.8, 8.6, 9.2, 9.0]
  const FONT_WIDTH_SCALE = [0.95, 0.88, 1.0, 1.02, 1.0]

  // Native SA-MP ~color~ and special char codes parser
  const SAMP_COLOR_TAGS = {
    r: '#E81123', // ~r~ Red
    g: '#33AA33', // ~g~ Green
    b: '#3366EE', // ~b~ Blue
    w: '#FFFFFF', // ~w~ White
    y: '#EEEE33', // ~y~ Yellow
    p: '#9933CC', // ~p~ Purple
    l: '#000000', // ~l~ Black
    s: null,      // ~s~ Default color
  }

  const SAMP_SPECIAL_CHARS = {
    u: '▲', // ~u~ Up
    d: '▼', // ~d~ Down
    '<': '◀', // ~<~ Left
    '>': '▶', // ~>~ Right
  }

  function parseSampTags(text, defaultColorHex) {
    if (!text) return [{ text: '', color: defaultColorHex }]
    if (!/~[a-zA-Z<>]+~/i.test(text)) {
      return [{ text, color: defaultColorHex }]
    }

    const tokens = []
    let currentColor = defaultColorHex
    const regex = /~([a-zA-Z<>]|k~~[a-zA-Z0-9_]+)~/gi
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          text: text.slice(lastIndex, match.index),
          color: currentColor,
        })
      }
      const tag = match[1].toLowerCase()
      if (tag in SAMP_COLOR_TAGS) {
        currentColor = SAMP_COLOR_TAGS[tag] || defaultColorHex
      } else if (tag in SAMP_SPECIAL_CHARS) {
        tokens.push({
          text: SAMP_SPECIAL_CHARS[tag],
          color: currentColor,
        })
      }
      lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
      tokens.push({
        text: text.slice(lastIndex),
        color: currentColor,
      })
    }

    return tokens
  }

  function getLineTokens(line) {
    const defaultColor = rgbaToCSS(props.el.color)
    return parseSampTags(line, defaultColor)
  }

  const wrappedLines = computed(() => {
    if (props.el.type !== 'label' && props.el.type !== 'box') return null
    const text = props.el.text || ''
    if (/(?:~n~|~n|\\n|\n)/i.test(text)) {
      return wrapText(text)
    }
    return null
  })

  function getFontSize(el) {
    const yScale = FONT_Y_SCALE[el.font] ?? 9.2
    return el.letterY * yScale * props.zoom
  }

  const wrapperStyle = computed(() => {
    const snap = (val) => Math.round(val * 4) / 4
    const w = props.el.w * props.zoom
    const h = props.el.h * props.zoom
    const isSprite = props.el.type === 'sprite'

    return {
      left: snap(props.el.x * props.zoom) + (w < 0 ? w : 0) + 'px',
      top: snap(props.el.y * props.zoom) + (h < 0 ? h : 0) + (isSprite ? -2 * props.zoom : 0) + 'px',
      width: Math.abs(w) + 'px',
      height: Math.abs(h) + 'px',
      cursor: props.el.locked ? 'default' : 'move',
      zIndex: (props.el.layer || 0) + 10,
      transform: props.el.type === 'label' ? `scale(${w < 0 ? -1 : 1}, ${h < 0 ? -1 : 1})` : 'none',
      transformOrigin: 'center center',
    }
  })

  const textWrapStyle = computed(() => ({
    background: props.el.useBox ? rgbaToCSS(props.el.boxColor) : 'transparent',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: props.el.align === 1 ? 'center' : props.el.align === 2 ? 'flex-end' : 'flex-start',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    boxSizing: 'border-box',
    padding: '0 2px',
  }))

  const textContainerStyle = computed(() => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: props.el.align === 1 ? 'center' : props.el.align === 2 ? 'flex-end' : 'flex-start',
    width: 'max-content',
    maxWidth: 'none',
  }))

  function getTextStyle() {
    const font = FONTS[props.el.font] || FONTS[0]
    const fs = getFontSize(props.el)

    const scaleX = (props.el.letterY > 0
      ? (props.el.letterX / props.el.letterY) * 3.75
      : 1) * (FONT_WIDTH_SCALE[props.el.font] ?? 1)

    const align = props.el.align ?? 0
    const origin = align === 1 ? 'center top' : align === 2 ? 'right top' : 'left top'

    return {
      display: 'inline-block',
      color: rgbaToCSS(props.el.color),
      fontSize: fs + 'px',
      fontFamily: `'${font.family}', sans-serif`,
      fontWeight: '400',
      fontStyle: 'normal',
      textTransform: props.el.font === 2 ? 'uppercase' : 'none',
      textShadow: buildTextShadow(props.el.outline, props.el.shadow, props.el.bgColor, props.zoom),
      whiteSpace: 'nowrap',
      lineHeight: '1.15',
      letterSpacing: 'normal',
      wordSpacing: 'normal',
      transformOrigin: origin,
      transform: `scaleX(${scaleX})`,
    }
  }

  const textStyle = computed(() => getTextStyle())

  function onMouseDown(e) {
    if (e.button !== 0) return
    if (props.el.locked) return
    emit('mousedown', e, props.el)
  }

  function onResizeStart(e) {
    if (e.button !== 0) return
    emit('resize-start', e, props.el)
  }

  function buildTextShadow(outline, shadow, bgColor, zoom) {
    const col = rgbaToCSS(bgColor ?? 0x000000FF)
    const parts = []
    if (outline > 0) {
      const o = outline * 1 * zoom
      parts.push(
        `-${o}px -${o}px 0 ${col}`,
        `${o}px -${o}px 0 ${col}`,
        `-${o}px ${o}px 0 ${col}`,
        `${o}px ${o}px 0 ${col}`,
        `-${o}px 0 0 ${col}`,
        `${o}px 0 0 ${col}`,
        `0 -${o}px 0 ${col}`,
        `0 ${o}px 0 ${col}`,
      )
    }
    if (shadow > 0) {
      const s = shadow * zoom
      parts.push(`${s}px ${s}px 0 ${col}`)
    }
    return parts.length ? parts.join(', ') : 'none'
  }

  </script>
  <style scoped>
  .td-element {
    position: absolute;
    pointer-events: all;
  }
  .fill {
    width: 100%;
    height: 100%;
  }
  .sprite-wrap {
    position: relative;
  }
  .sprite-img-hidden {
    display: none;
  }
  .sprite-canvas {
    width: 100%;
    height: 100%;
    image-rendering: smooth;
    pointer-events: none;
    user-select: none;
    display: block;
  }
  .sprite-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,212,255,0.08);
    border: 1px dashed rgba(0,212,255,0.4);
    font-family: 'Tahoma', sans-serif;
    font-size: 8px;
    color: #00d4ff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 3px;
    box-sizing: border-box;
  }
  .text-el {
    font-variant-ligatures: none;
    font-feature-settings: "liga" 0, "clig" 0;
    display: flex;
    align-items: flex-start;
    overflow: visible;
    padding: 0;
    box-sizing: border-box;
  }
  .progress-wrap {
    display: block;
  }
  .text-content {
    display: flex;
    flex-direction: column;
    width: max-content;
  }
  .wrapped-text {
    display: flex;
    flex-direction: column;
    width: max-content;
  }
  .wrapped-line {
    display: inline-block;
    line-height: 1.15;
    white-space: nowrap;
  }
  .model-wrap {
    position: relative;
    user-select: none;
  }
  .model-viewport {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .model-img {
    pointer-events: none;
    user-select: none;
    transition: transform 0.15s ease-out;
  }
  .model-img-hidden {
    display: none;
  }
  .model-canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
    display: block;
    image-rendering: smooth;
    transition: transform 0.15s ease-out;
  }
  .model-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 170, 0, 0.12);
    border: 1px dashed rgba(255, 170, 0, 0.5);
    box-sizing: border-box;
  }
  .model-badge {
    font-family: 'Tahoma', sans-serif;
    font-size: 8px;
    font-weight: 700;
    color: #ffaa00;
  }
  </style>