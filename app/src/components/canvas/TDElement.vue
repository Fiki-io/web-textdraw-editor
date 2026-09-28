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
        <div :style="fontOffsetStyle">
          <div v-if="wrappedLines && wrappedLines.length > 1" class="wrapped-text">
            <span v-for="(line, i) in wrappedLines" :key="i" :style="textStyle" class="wrapped-line">{{ line }}</span>
          </div>
          <span v-else :style="textStyle">{{ el.text === '_' ? '' : el.text }}</span>
        </div>
      </div>

      <!-- Label -->
      <div v-else class="fill text-el" :style="textWrapStyle">
        <div :style="fontOffsetStyle">
          <div v-if="wrappedLines && wrappedLines.length > 1" class="wrapped-text">
            <span v-for="(line, i) in wrappedLines" :key="i" :style="textStyle" class="wrapped-line">{{ line }}</span>
          </div>
          <span v-else-if="textRuns" :style="textStyle">
            <span v-for="(run, i) in textRuns" :key="i" :style="getTextStyle(run.isNumeric)">{{ run.text }}</span>
          </span>
          <span v-else :style="textStyle">{{ el.text || '_' }}</span>
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


  function measureTextWidth(text, fontFamily, fontSize)
  {
    const cv = document.createElement('canvas')
    const ctx = cv.getContext('2d')
    ctx.font = `400 ${fontSize}px '${fontFamily}'`
    return ctx.measureText(text).width
  }

  function wrapText(text, fontFamily, fontSize, maxWidth)
  {
    const words = text.split(' ')
    const lines = []

    for (const word of words) {
      if (lines.length === 0) {
        lines.push(word)
        continue
      }
      const last = lines[lines.length - 1]
      const test = last + ' ' + word
      const w = measureTextWidth(test, fontFamily, fontSize)
      if (w > maxWidth) {
        lines.push(word)
      } else {
        lines[lines.length - 1] = test
      }
    }
    return lines
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

  
  const FONT_Y_SCALE = [8.85, 8.74, 8.75, 9.38, 9.0]
  const FONT_X_SCALE = [0.996, 0.9, 0.954, 1.0, 1.0]
  const FONT_BASELINE = [-0.057, -0.08, 0.2, 0.14, 0]

  const FONT_WRAP_TOLERANCE = [0.96, 0.96, 1.15, 1.15, 0.96]


  const FONT_NUMBER_OFFSET_X = [
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
  ]

  const FONT_NUMBER_OFFSET_Y = [
    [0.15, 0.15, 0.15],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
  ]

  const FONT_NUMBER_OFFSET_W = [
    [1.18, 1.18, 1.18],
    [1.12, 1.12, 1.12],
    [1.10, 1.10, 1.10],
    [0.95, 0.95, 0.95],
    [1.0, 1.0, 1.0],
  ]

  const FONT_NUMBER_OFFSET_H = [
    [1.18, 1.18, 1.18],
    [1.38, 1.38, 1.38],
    [1.10, 1.10, 1.10],
    [1.12, 1.12, 1.12],
    [1.0, 1.0, 1.0],
  ]

  const FONT_NUMBER_LETTER_SPACING = [
    [0.07, 0.07, 0.07],
    [0.0, 0.0, 0.0],
    [-0.13, -0.13, -0.13],
    [null, null, null],
    [null, null, null],
  ]

  const FONT_NUMBER_WORD_SPACING = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]

  const FONT_NUMBER_BOX_OFFSET_X = [
    [-0.07, -0.2, -0.3],
    [0.0, -0.09, -0.145],
    [-0.05, -0.13, -0.2],
    [0.0, 0.05, 0.15],
    [0.0, 0.0, 0.0],
  ]

  const FONT_NUMBER_BOX_OFFSET_Y = [
    [-0.15, -0.15, -0.15],
    [-0.1, -0.1, -0.1],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
  ]

  const NUMERIC_ONLY_RE = /^[\d\s.,:\-+%$/]+$/
  const HAS_NUMERIC_RE = /[\d.,:\-+%$/]/
  const HAS_ALPHA_RE = /[^\d\s.,:\-+%$/]/

  function isNumericText(text) { return NUMERIC_ONLY_RE.test(text) }
  function isMixedText(text) { return HAS_NUMERIC_RE.test(text) && HAS_ALPHA_RE.test(text) }

  function splitTextRuns(text) {
    const runs = []
    let current = ''
    let currentIsNumeric = /[\d.,:\-+%$/\s]/.test(text[0] ?? '')
    for (const ch of text) {
      const chIsNumeric = /[\d.,:\-+%$/\s]/.test(ch)
      if (chIsNumeric !== currentIsNumeric) {
        if (current) runs.push({ text: current, isNumeric: currentIsNumeric })
        current = ch
        currentIsNumeric = chIsNumeric
      } else {
        current += ch
      }
    }
    if (current) runs.push({ text: current, isNumeric: currentIsNumeric })
    return runs
  }

  function getNumericOffsets(fontIndex, align, text) {
    const numeric = isNumericText(text)
    const mixed = !numeric && isMixedText(text)
    if (!numeric && !mixed) return { x: 0, y: 0, w: 1, h: 1, letterSpacing: null, wordSpacing: null, boxX: 0, boxY: 0 }
    return {
      x: mixed ? 0 : (FONT_NUMBER_OFFSET_X[fontIndex]?.[align] ?? 0.0),
      y: mixed ? 0 : (FONT_NUMBER_OFFSET_Y[fontIndex]?.[align] ?? 0.0),
      w: FONT_NUMBER_OFFSET_W[fontIndex]?.[align] ?? 1.0,
      h: FONT_NUMBER_OFFSET_H[fontIndex]?.[align] ?? 1.0,
      letterSpacing: mixed ? null : (FONT_NUMBER_LETTER_SPACING[fontIndex]?.[align] ?? null),
      wordSpacing: mixed ? null : (FONT_NUMBER_WORD_SPACING[fontIndex]?.[align] ?? null),
      boxX: mixed ? 0 : (FONT_NUMBER_BOX_OFFSET_X[fontIndex]?.[align] ?? 0.0),
      boxY: mixed ? 0 : (FONT_NUMBER_BOX_OFFSET_Y[fontIndex]?.[align] ?? 0.0),
    }
  }

  const wrappedLines = computed(() => {
    if (props.el.type !== 'label' && props.el.type !== 'box') return null
    const font = FONTS[props.el.font] || FONTS[0]
    const yScale = FONT_Y_SCALE[props.el.font] ?? 9.0
    const xScale = FONT_X_SCALE[props.el.font] ?? 1.0
    const numericOffsets = getNumericOffsets(props.el.font, props.el.align ?? 0, props.el.text || '')
    const fs = Math.max(6, props.el.letterY * yScale * props.zoom * numericOffsets.h)
    const scaleX = (props.el.letterY > 0
      ? (props.el.letterX / props.el.letterY) * 3.75 * xScale
      : xScale) * (FONT_WIDTH_SCALE[props.el.font] ?? 1)
    const maxWidth = (props.el.w * props.zoom) / scaleX * (FONT_WRAP_TOLERANCE[props.el.font] ?? 0.96)
    return wrapText(props.el.text || '', font.family, fs, maxWidth)
  })

  const wrappedHeight = computed(() => {
    if (!wrappedLines.value || wrappedLines.value.length <= 1) return null
    const yScale = FONT_Y_SCALE[props.el.font] ?? 9.0
    const numericOffsets = getNumericOffsets(props.el.font, props.el.align ?? 0, props.el.text || '')
    const fs = Math.max(6, props.el.letterY * yScale * props.zoom * numericOffsets.h)
    const contentHeight = wrappedLines.value.length * fs * 1.3
    const elHeight = Math.max(Math.abs(props.el.h * props.zoom), 2)
    return Math.max(contentHeight, elHeight)
  })

    const FONT_OFFSET_X = [
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
  ]

  const FONT_OFFSET_Y = [
    [-0.13, -0.13, -0.13],
    [-0.2, -0.2, -0.2],
    [-0.3, -0.3, -0.3],
    [-0.3, -0.3, -0.3],
    [0.0, 0.0, 0.0],
  ]

  const FONT_LETTER_SPACING = [
    [-0.05, -0.05, -0.05],
    [0.02, 0.02, 0.02],
    [0.02, 0.02, 0.02],
    [-0.03, -0.03, -0.03],
    [0.0, 0.0, 0.0],
  ]

  const FONT_WORD_SPACING = [
    [0.1, 0.1, 0.1],
    [0.1, 0.1, 0.1],
    [0.1, 0.1, 0.1],
    [0.2, 0.2, 0.2],
    [0.0, 0.0, 0.0],
  ]

  const FONT_WIDTH_SCALE = [1.15, 1, 1, 1.04, 1]

  const BOX_OFFSET_X = [
    [0.0, -0.49, -0.98],
    [-0.015, -0.50, -0.995],
    [-0.015, -0.5, -0.99],
    [0.0, -0.505, -1.007],
    [0.0, 0.0, 0.0],
  ]

  const BOX_OFFSET_Y = [
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
  ]

  const BOX_OFFSET_W = [
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
  ]

  const BOX_OFFSET_H = [
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0],
  ]

  const BOX_FONT_OFFSET_X = -1.5
  const BOX_FONT_OFFSET_Y = -5
  const BOX_FONT_OFFSET_W = 3.3
  const BOX_FONT_OFFSET_H = 1.5

  const FONT_OFFSET_W = [0, 0, 0, 0, 0]

  function getFontSize(el) {
    const yScale = FONT_Y_SCALE[el.font] ?? 9.0
    const numericOffsets = getNumericOffsets(el.font, el.align ?? 0, el.text || '')
    return Math.max(6, el.letterY * yScale * props.zoom * numericOffsets.h)
  }

  const isText = computed(() =>
    props.el.type === 'label'
  )

  const wrapperStyle = computed(() => {
    const snap = (val) => Math.round(val * 4) / 4
    const w = props.el.w * props.zoom
    const h = props.el.h * props.zoom
    const isBox = props.el.type === 'box'
    const isSprite = props.el.type === 'sprite'
    const isText2 = props.el.type === 'label'
    const align = props.el.align ?? 0

    const fs = getFontSize(props.el)
    const numericOffsets = getNumericOffsets(props.el.font ?? 0, align, props.el.text || '')
    const numericOffsetW = isText2 ? (numericOffsets.w - 1) * fs : 0
    const boxOffsetX = isText2 ? (BOX_OFFSET_X[props.el.font ?? 0]?.[align] ?? 0) * Math.abs(w) + numericOffsets.boxX * fs : 0
    const boxOffsetY = isText2 ? (BOX_OFFSET_Y[props.el.font ?? 0]?.[align] ?? 0) * fs + numericOffsets.boxY * fs : 0
    const boxOffsetW = isText2 ? (BOX_OFFSET_W[props.el.font ?? 0]?.[align] ?? 0) * fs : 0
    const boxOffsetH = isText2 ? (BOX_OFFSET_H[props.el.font ?? 0]?.[align] ?? 0) * fs : 0
    const fontOffsetW = isText2 ? (FONT_OFFSET_W[props.el.font ?? 0] ?? 0) * fs : 0

    const absW = Math.abs(w)
    const absH = Math.abs(h)
    const boxFontOffsetX = isBox ? BOX_FONT_OFFSET_X * props.zoom : 0
    const boxFontOffsetY = isBox ? BOX_FONT_OFFSET_Y * props.zoom : 0

    return {
      left: snap(props.el.x * props.zoom) + (w < 0 ? w : 0) + boxOffsetX + boxFontOffsetX + 'px',
      top: snap(props.el.y * props.zoom) + (h < 0 ? h : 0) + (isSprite ? -3 * props.zoom : 0) + boxOffsetY + boxFontOffsetY + 'px',
      width: absW + fontOffsetW + boxOffsetW + numericOffsetW + (isBox ? BOX_FONT_OFFSET_W * props.zoom : 0) + 'px',
      height: absH + boxOffsetH + (isBox ? BOX_FONT_OFFSET_H * props.zoom : 0) + 'px',
      cursor: props.el.locked ? 'default' : 'move',
      zIndex: (props.el.layer || 0) + 10,
      transform: isText2 ? `scale(${w < 0 ? -1 : 1}, ${h < 0 ? -1 : 1})` : 'none',
      transformOrigin: 'center center',
      letterSpacing: (numericOffsets.letterSpacing ?? FONT_LETTER_SPACING[props.el.font ?? 0]?.[align] ?? 0) * fs + 'px',
      wordSpacing: (numericOffsets.wordSpacing ?? FONT_WORD_SPACING[props.el.font ?? 0]?.[align] ?? 0) * fs + 'px',
    }
  })

  const fontOffsetStyle = computed(() => {
    const align = props.el.align ?? 0
    const isText2 = props.el.type === 'label'
    const isBox = props.el.type === 'box'
    const baseFs = FONT_Y_SCALE[props.el.font ?? 0] ?? 9.0
    const xUnit = align === 0 ? baseFs * props.zoom : Math.abs(props.el.w) * props.zoom
    const numericOffsets = isText2 ? getNumericOffsets(props.el.font ?? 0, align, props.el.text || '') : null
    const fs = isText2 ? getFontSize(props.el) : 0
    const x = isText2
      ? (FONT_OFFSET_X[props.el.font ?? 0]?.[align] ?? 0) * xUnit + (numericOffsets.x ?? 0) * fs
      : 0
    const y = isText2
      ? (FONT_OFFSET_Y[props.el.font ?? 0]?.[align] ?? 0) * baseFs * props.zoom + (numericOffsets.y ?? 0) * fs
      : 0
    return { transform: `translate(${x}px, ${y}px)` }
  })


  const boxStyle = computed(() => ({
    width: '100%', height: '100%',
    background: rgbaToCSS(props.el.boxColor),
  }))

  const hitboxStyle = computed(() => ({
    width: '100%', height: '100%',
    background: rgbaToCSS(props.el.boxColor),
    border: `1px dashed ${numToHex6(props.el.color)}`,
    boxSizing: 'border-box',
  }))

  const progressWrapStyle = computed(() => ({
    background: rgbaToCSS(props.el.boxColor),
    border: `1px solid ${numToHex6(props.el.color)}`,
    boxSizing: 'border-box',
  }))

  const progressFillStyle = computed(() => ({
    width: `${Math.min(100, Math.max(0, parseFloat(props.el.text) || 50))}%`,
    height: '100%',
    background: numToHex6(props.el.color),
  }))

  const textWrapStyle = computed(() => ({
    background: props.el.useBox ? rgbaToCSS(props.el.boxColor) : 'transparent',
    justifyContent: props.el.align === 1 ? 'center' : props.el.align === 2 ? 'flex-end' : 'flex-start',
    ...(props.el.useBox && props.el.align === 2 ? {
      position: 'absolute',
      left: -(props.el.x * props.zoom) + 'px',
      width: (props.el.x + props.el.w + 3) * props.zoom + 'px',
    } : {}),
  }))


  const textRuns = computed(() => {
    const text = props.el.text || ''
    if (!isMixedText(text)) return null
    return splitTextRuns(text)
  })

  function getTextStyle(isNumeric = false) {
    const font = FONTS[props.el.font] || FONTS[0]
    const yScale = FONT_Y_SCALE[props.el.font] ?? 9.0
    const xScale = FONT_X_SCALE[props.el.font] ?? 1.0
    const align = props.el.align ?? 0
    const text = props.el.text || ''
    const numericOffsets = isNumeric
      ? getNumericOffsets(props.el.font, align, '0')
      : getNumericOffsets(props.el.font, align, text)
    const fs = Math.max(6, props.el.letterY * yScale * props.zoom * numericOffsets.h)
    const scaleX = (props.el.letterY > 0
      ? (props.el.letterX / props.el.letterY) * 3.75 * xScale
      : xScale) * (FONT_WIDTH_SCALE[props.el.font] ?? 1) * numericOffsets.w

    const alignOffset = align === 1
      ? `translateX(${((scaleX - 1) / 2) * -100}%)`
      : align === 2
      ? `translateX(${((scaleX - 1)) * -100}%)`
      : ''

    const style = {
      color: rgbaToCSS(props.el.color),
      fontSize: fs + 'px',
      fontFamily: `'${font.family}', sans-serif`,
      fontWeight: '400',
      fontStyle: 'normal',
      textTransform: props.el.font === 2 ? 'uppercase' : 'none',
      textShadow: buildTextShadow(props.el.outline, props.el.shadow, props.el.bgColor, props.zoom),
      whiteSpace: 'nowrap',
      lineHeight: '1',
      transformOrigin: 'left top',
      transform: `${alignOffset} scaleX(${scaleX})`,
    }

    if (isNumeric) {
      const ls = FONT_NUMBER_LETTER_SPACING[props.el.font]?.[align] ?? null
      const ws = FONT_NUMBER_WORD_SPACING[props.el.font]?.[align] ?? null
      if (ls !== null) style.letterSpacing = ls * fs + 'px'
      if (ws !== null) style.wordSpacing = ws * fs + 'px'
    }

    return style
  }

  const textStyle = computed(() => ({
    ...getTextStyle(false),
    display: wrappedLines.value?.length > 1 ? 'block' : 'inline-block',
  }))

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
    align-items: center;
    overflow: visible;
    padding: 0 2px;
    box-sizing: border-box;
  }
  .progress-wrap {
    display: block;
  }
  .wrapped-line {
    display: block;
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