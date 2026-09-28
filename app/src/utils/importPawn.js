const FONT_NAME_MAP = {
  'TEXT_DRAW_FONT_0': 0, 'TEXT_DRAW_FONT_1': 1,
  'TEXT_DRAW_FONT_2': 2, 'TEXT_DRAW_FONT_3': 3,
  'TEXT_DRAW_FONT_SPRITE_DRAW': 4, 'TEXT_DRAW_FONT_MODEL_PREVIEW': 5,
}

const ALIGN_NAME_MAP = {
  'TEXT_DRAW_ALIGN_LEFT': 0, 'TEXT_DRAW_ALIGN_CENTER': 1,
  'TEXT_DRAW_ALIGN_CENTRE': 1, 'TEXT_DRAW_ALIGN_RIGHT': 2,
}

const KNOWN_SPRITE_LIBS = [
  'ld_beat', 'ld_bum', 'ld_card', 'ld_cell', 'ld_chat', 'ld_cntr', 'ld_dead', 'ld_driv',
  'ld_dual', 'ld_frst', 'ld_game', 'ld_gdge', 'ld_grav', 'ld_gun', 'ld_gunl', 'ld_hmnu',
  'ld_hud', 'ld_icon', 'ld_lock', 'ld_madn', 'ld_map', 'ld_news',
  'ld_none', 'ld_otb', 'ld_plan', 'ld_poke', 'ld_pool', 'ld_race',
  'ld_rast', 'ld_rdio', 'ld_roul', 'ld_ruft', 'ld_rxlt', 'ld_safe', 'ld_shot', 'ld_shrp', 'ld_sign',
  'ld_slot', 'ld_spac', 'ld_spas', 'ld_tatt', 'ld_txd',
  'hud', 'radar', 'sampcac', 'samp', 'timecyc',
]


function parseColor(raw) {
  const n = parseInt(raw)
  if (!isNaN(n)) return n >>> 0
  return 0xFFFFFFFF
}

function parseFont(raw) {
  const t = raw.trim()
  if (t in FONT_NAME_MAP) return FONT_NAME_MAP[t]
  return parseInt(t) || 0
}

function parseAlign(raw) {
  const t = raw.trim()
  if (t in ALIGN_NAME_MAP) return ALIGN_NAME_MAP[t]
  const n = parseInt(t)
  return isNaN(n) ? 0 : n - 1
}

function parseBool(raw) {
  const t = raw.trim().toLowerCase()
  return t === '1' || t === 'true'
}

function extractArgs(line) {
  const m = line.match(/\(([\s\S]*)\)/)
  if (!m) return []
  const str = m[1]
  const args = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === '"' && str[i - 1] !== '\\') {
      inQuote = !inQuote
      current += ch
    } else if (ch === ',' && !inQuote) {
      args.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) args.push(current.trim())
  return args
}

function extractLastArgs(line, count) {
  const args = extractArgs(line)
  return args.slice(args.length - count)
}

function isSpriteName(text) {
  if (!text || !text.includes(':')) return false
  const [lib] = text.split(':')
  const libL = lib.toLowerCase()
  return libL.startsWith('ld_') || KNOWN_SPRITE_LIBS.includes(libL)
}

function detectType(el) {
  if (el.font === 5 || el.modelId !== undefined || /^preview_model$/i.test(el.text?.trim() || '')) return 'model'
  if (el.font === 4 || isSpriteName(el.text)) return 'sprite'
  if (el.useBox && el.text === '_') return 'box'
  return 'label'
}

export function importPawn(code) {
  const lines = code.split('\n').map(l => l.trim()).filter(Boolean)
  const elements = []
  let current = null

  for (const line of lines) {
    const isPlayer = /CreatePlayerTextDraw/i.test(line)
    const isGlobal = !isPlayer && /TextDrawCreate/i.test(line)

    if (isPlayer || isGlobal) {
      if (current) {
        current.type = detectType(current)
        elements.push(current)
      }

      const args = extractArgs(line)
      const coordsAndText = args.slice(args.length - 3)

      const rawX = parseFloat(coordsAndText[0])
      const x = rawX
      const y = parseFloat(coordsAndText[1])
      const rawText = coordsAndText[2].replace(/^"|"$/g, '')

      current = {
        id: Math.random().toString(36).slice(2, 9),
        isPlayer,
        name: `td${elements.length + 1}`,
        type: 'label',
        visible: true,
        locked: false,
        layer: elements.length,
        x, y,
        _rawX: rawX,
        w: 100, h: 20,
        text: rawText,
        color: 0xFFFFFFFF,
        boxColor: 0x000000AA,
        bgColor: 0x00000080,
        font: 0,
        align: 0,
        letterX: 0.2,
        letterY: 0.9,
        outline: 0,
        shadow: 0,
        useBox: false,
        proportional: false,
        selectable: false,
        _rawTextSizeX: 0,
        _rawTextSizeY: 0,
        _flipped: false,
      }
      continue
    }

    if (!current) continue

    if (/(?:TextDraw|PlayerTextDraw)Font/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.font = parseFont(raw)
    } else if (/(?:TextDraw|PlayerTextDraw)LetterSize/i.test(line)) {
      const [lx, ly] = extractLastArgs(line, 2)
      current.letterX = Math.abs(parseFloat(lx))
      current.letterY = parseFloat(ly)
      current._flipped = parseFloat(lx) < 0
    } else if (/(?:TextDraw|PlayerTextDraw)TextSize/i.test(line)) {
      const [tx, ty] = extractLastArgs(line, 2)
      current._rawTextSizeX = parseFloat(tx)
      current._rawTextSizeY = parseFloat(ty)
    } else if (/(?:TextDraw|PlayerTextDraw)Alignment/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.align = parseAlign(raw)
    } else if (/(?:TextDraw|PlayerTextDraw)Colou?r\b/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.color = parseColor(raw)
    } else if (/(?:TextDraw|PlayerTextDraw)UseBox/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.useBox = parseBool(raw)
    } else if (/(?:TextDraw|PlayerTextDraw)BoxColou?r/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.boxColor = parseColor(raw)
    } else if (/(?:TextDraw|PlayerTextDraw)SetOutline/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.outline = parseInt(raw) || 0
    } else if (/(?:TextDraw|PlayerTextDraw)SetShadow/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.shadow = parseInt(raw) || 0
    } else if (/(?:TextDraw|PlayerTextDraw)SetProportional/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.proportional = parseBool(raw)
    } else if (/(?:TextDraw|PlayerTextDraw)SetSelectable/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.selectable = parseBool(raw)
    } else if (/(?:TextDraw|PlayerTextDraw)SetString/i.test(line)) {
      const m = line.match(/,\s*"(.*)"\s*\)/)
      if (m) current.text = m[1]
    } else if (/(?:TextDraw|PlayerTextDraw)BackgroundColou?r/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.bgColor = parseColor(raw)
    } else if (/(?:TextDraw|PlayerTextDraw)SetPreviewModel/i.test(line)) {
      const [raw] = extractLastArgs(line, 1)
      current.modelId = parseInt(raw) || 0
      current.font = 5
      current.type = 'model'
    } else if (/(?:TextDraw|PlayerTextDraw)SetPreviewRot/i.test(line)) {
      const args = extractLastArgs(line, 4)
      if (args.length >= 4) {
        current.rotX = parseFloat(args[0]) || 0
        current.rotY = parseFloat(args[1]) || 0
        current.rotZ = parseFloat(args[2]) || 0
        current.zoom = parseFloat(args[3]) || 1.0
      }
    } else if (/(?:TextDraw|PlayerTextDraw)SetPreviewVehCol/i.test(line)) {
      const args = extractLastArgs(line, 2)
      if (args.length >= 2) {
        current.vehCol1 = parseInt(args[0])
        current.vehCol2 = parseInt(args[1])
      }
    }
  }

  if (current) {
    current.type = detectType(current)
    elements.push(current)
  }

  for (const el of elements) {
    const tx = el._rawTextSizeX
    const ty = el._rawTextSizeY
    const rawX = el._rawX
    const flipped = el._flipped
    delete el._rawTextSizeX
    delete el._rawTextSizeY
    delete el._rawX
    delete el._flipped

    if (el.type === 'sprite' || el.type === 'model' || el.font === 5) {
      if (el.type === 'sprite') el.text = el.text.toLowerCase()
      if (el.type === 'model') {
        el.font = 5
        if (el.modelId === undefined) el.modelId = 2880
      }
      const rawTx = tx !== undefined && tx !== 0 ? tx : 32
      const rawTy = ty !== undefined && ty !== 0 ? ty : 32
      el.w = Math.abs(rawTx)
      el.h = Math.abs(rawTy)
      if (rawTy < 0) {
        el.y = el.y + rawTy
        el.scaleY = -1
        el._flippedY = true
      }
      if (rawTx < 0) {
        el.x = el.x + rawTx
        el.scaleX = -1
        el._flippedX = true
      }
      el.textSizeX = el.w
      el.textSizeY = el.h
    } else {
      // Calculate height
      if (el.useBox && el.letterY > 0) {
        el.h = Math.round(el.letterY / 0.1154)
      } else if (ty > el.y) {
        el.h = Math.round(ty - el.y)
      } else {
        el.h = Math.max(10, Math.round(el.letterY * 10))
      }

      // Calculate width and canvas x based on alignment
      if (el.align === 1) { // Center
        const w = ty > 0 ? ty : (tx > 0 ? tx : Math.round(el.letterX * 21 * (el.text?.length || 5)))
        el.w = Math.max(10, Math.round(w))
        el.x = Math.round(rawX - (el.w / 2))
        el.textSizeX = tx
        el.textSizeY = ty
      } else if (el.align === 2) { // Right
        if (tx > 0 && rawX > tx) {
          el.w = Math.max(10, Math.round(rawX - tx))
          el.x = Math.round(tx)
        } else {
          el.w = Math.max(10, Math.round(el.letterX * 21 * (el.text?.length || 5)))
          el.x = Math.round(rawX - el.w)
        }
        el.textSizeX = tx
        el.textSizeY = ty
      } else { // Left
        if (tx > rawX) {
          el.w = Math.max(10, Math.round(tx - rawX + 5))
        } else if (tx > 0) {
          el.w = Math.max(10, Math.round(tx))
        } else {
          el.w = Math.max(10, Math.round(el.letterX * 21 * (el.text?.length || 5)))
        }
        el.x = Math.round(rawX)
        el.textSizeX = tx
        el.textSizeY = ty
      }
    }

    if (flipped && el.type === 'label') el.w = -Math.abs(el.w)
  }

  return elements
}