import { numToHex8 } from './colors.js'

function calcTextSize(el) {
  if (el.type === 'sprite' || el.type === 'model' || el.font === 4 || el.font === 5) {
    return { tx: el.w, ty: el.h }
  }
  if (el.textSizeX > 0 || el.textSizeY > 0) {
    return { tx: el.textSizeX, ty: el.textSizeY }
  }

  const rightY = el.y + el.h

  // SA-MP TextDrawTextSize rules:
  // Alignment 1 (Center in SA-MP): X and Y are swapped; tx = 0.0 (or rightY), ty = width
  if (el.align === 1) {
    return { tx: 0.0, ty: el.w }
  }
  // Alignment 2 (Right in SA-MP): tx is the left-most corner of the box
  if (el.align === 2) {
    return { tx: el.x, ty: rightY }
  }
  // Alignment 0 (Left in SA-MP): tx is the right-most corner of the box (with 5.0 unit SA-MP left box offset)
  return { tx: el.x + el.w - 5.0, ty: rightY }
}

function scaleEl(el) {
  return {
    ...el,
    x: el.x,
    y: el.y,
    w: el.w,
    h: el.h,
    textSizeX: el.textSizeX,
    textSizeY: el.textSizeY,
  }
}

export function exportPawn(els, prefix) {
  const sorted = [...els].sort((a, b) => (a.layer || 0) - (b.layer || 0))
  const globals = sorted.filter(e => !e.isPlayer)
  const players = sorted.filter(e => e.isPlayer)

  const now = new Date()
  const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const lines = [`// TextDraw Designer sa-mp | ${date}, ${time}`, '']

  if (globals.length) {
    lines.push(`new Text:${prefix}_global[${globals.length}];`)
  }
  if (players.length) {
    lines.push(`new PlayerText:${prefix}_player[MAX_PLAYERS][${players.length}];`)
  }
  lines.push('')

  // Global Textdraws Creation stock
  if (globals.length) {
    lines.push(`stock ${prefix}_CreateGlobals() \n{`)
    globals.forEach((el, i) => {
      el = scaleEl(el)
      const ref = `${prefix}_global[${i}]`
      const txt = (el.text || '_').replace(/"/g, '\\"')
      const col = numToHex8(el.color)
      const box = numToHex8(el.boxColor)
      const bg  = numToHex8(el.bgColor ?? 0x00000080)

      lines.push(`    // ${el.name} (${el.type})`)

      if (el.type === 'sprite') {
        const expX = el.scaleX === -1 || el._flippedX ? el.x + el.w : el.x
        const expY = el.scaleY === -1 || el._flippedY ? el.y + el.h : el.y
        const expW = el.scaleX === -1 || el._flippedX ? -el.w : el.w
        const expH = el.scaleY === -1 || el._flippedY ? -el.h : el.h
        lines.push(`    ${ref} = TextDrawCreate(${expX.toFixed(1)}, ${expY.toFixed(1)}, "${txt}");`)
        lines.push(`    TextDrawFont(${ref}, 4);`)
        lines.push(`    TextDrawTextSize(${ref}, ${expW.toFixed(1)}, ${expH.toFixed(1)});`)
        lines.push(`    TextDrawColor(${ref}, ${col});`)
        if (el.selectable) lines.push(`    TextDrawSetSelectable(${ref}, 1);`)
      } else if (el.type === 'model' || el.font === 5) {
        const expX = el.scaleX === -1 || el._flippedX ? el.x + el.w : el.x
        const expY = el.scaleY === -1 || el._flippedY ? el.y + el.h : el.y
        const expW = el.scaleX === -1 || el._flippedX ? -el.w : el.w
        const expH = el.scaleY === -1 || el._flippedY ? -el.h : el.h
        lines.push(`    ${ref} = TextDrawCreate(${expX.toFixed(1)}, ${expY.toFixed(1)}, "Preview_Model");`)
        lines.push(`    TextDrawFont(${ref}, 5);`)
        lines.push(`    TextDrawTextSize(${ref}, ${expW.toFixed(1)}, ${expH.toFixed(1)});`)
        lines.push(`    TextDrawColor(${ref}, ${col});`)
        lines.push(`    TextDrawBackgroundColor(${ref}, ${bg});`)
        lines.push(`    TextDrawSetPreviewModel(${ref}, ${el.modelId ?? 2880});`)
        lines.push(`    TextDrawSetPreviewRot(${ref}, ${(el.rotX || 0).toFixed(1)}, ${(el.rotY || 0).toFixed(1)}, ${(el.rotZ || 0).toFixed(1)}, ${(el.zoom || 1.0).toFixed(2)});`)
        if (el.vehCol1 !== undefined && el.vehCol1 !== -1) {
          lines.push(`    TextDrawSetPreviewVehCol(${ref}, ${el.vehCol1}, ${el.vehCol2 !== undefined ? el.vehCol2 : -1});`)
        }
        if (el.selectable) lines.push(`    TextDrawSetSelectable(${ref}, 1);`)
      } else {
        // SA-MP TextDraw alignment anchor in TextDrawCreate:
        // Left (0): left X
        // Center (1): center X = x + w / 2
        // Right (2): right X = x + w
        let createX = el.x
        if (el.align === 1) createX = el.x + (el.w / 2)
        else if (el.align === 2) createX = el.x + el.w

        lines.push(`    ${ref} = TextDrawCreate(${createX.toFixed(1)}, ${el.y.toFixed(1)}, "${txt}");`)
        lines.push(`    TextDrawFont(${ref}, ${el.font});`)

        let exportLY = el.letterY
        if (el.type === 'box') {
          exportLY = Math.abs(el.h) * 0.1154
        } else if (el.h < 0) {
          exportLY = -Math.abs(el.letterY)
        }

        const isLabel = el.type === 'label'
        const exportLX = isLabel && el.w < 0 ? -Math.abs(el.letterX) : el.letterX
        lines.push(`    TextDrawLetterSize(${ref}, ${exportLX.toFixed(3)}, ${exportLY.toFixed(3)});`)
        lines.push(`    TextDrawColor(${ref}, ${col});`)
        lines.push(`    TextDrawAlignment(${ref}, ${el.align + 1});`)

        if (el.useBox) {
          lines.push(`    TextDrawUseBox(${ref}, 1);`)
          lines.push(`    TextDrawBoxColor(${ref}, ${box});`)
        }
        if (el.useBox || el.selectable || el.textSizeX > 0 || el.textSizeY > 0) {
          const { tx, ty } = calcTextSize(el)
          lines.push(`    TextDrawTextSize(${ref}, ${tx.toFixed(1)}, ${ty.toFixed(1)});`)
        }
        if (el.outline > 0) lines.push(`    TextDrawSetOutline(${ref}, ${el.outline});`)
        if (el.shadow > 0)  lines.push(`    TextDrawSetShadow(${ref}, ${el.shadow});`)
        lines.push(`    TextDrawBackgroundColor(${ref}, ${bg});`)
        if (el.proportional) lines.push(`    TextDrawSetProportional(${ref}, 1);`)
        if (el.selectable)   lines.push(`    TextDrawSetSelectable(${ref}, 1);`)
      }
      lines.push('')
    })
    lines.push(`    return 1;`)
    lines.push(`}\n`)
  }

  // Player Textdraws Creation stock
  if (players.length) {
    lines.push(`stock ${prefix}_CreatePlayer(playerid) \n{`)
    players.forEach((el, i) => {
      el = scaleEl(el)
      const ref = `${prefix}_player[playerid][${i}]`
      const txt = (el.text || '_').replace(/"/g, '\\"')
      const col = numToHex8(el.color)
      const box = numToHex8(el.boxColor)
      const bg  = numToHex8(el.bgColor ?? 0x00000080)

      lines.push(`    // ${el.name} (${el.type})`)

      if (el.type === 'sprite') {
        const expX = el.scaleX === -1 || el._flippedX ? el.x + el.w : el.x
        const expY = el.scaleY === -1 || el._flippedY ? el.y + el.h : el.y
        const expW = el.scaleX === -1 || el._flippedX ? -el.w : el.w
        const expH = el.scaleY === -1 || el._flippedY ? -el.h : el.h
        lines.push(`    ${ref} = CreatePlayerTextDraw(playerid, ${expX.toFixed(1)}, ${expY.toFixed(1)}, "${txt}");`)
        lines.push(`    PlayerTextDrawFont(playerid, ${ref}, 4);`)
        lines.push(`    PlayerTextDrawTextSize(playerid, ${ref}, ${expW.toFixed(1)}, ${expH.toFixed(1)});`)
        lines.push(`    PlayerTextDrawColor(playerid, ${ref}, ${col});`)
        if (el.selectable) lines.push(`    PlayerTextDrawSetSelectable(playerid, ${ref}, 1);`)
      } else if (el.type === 'model' || el.font === 5) {
        const expX = el.scaleX === -1 || el._flippedX ? el.x + el.w : el.x
        const expY = el.scaleY === -1 || el._flippedY ? el.y + el.h : el.y
        const expW = el.scaleX === -1 || el._flippedX ? -el.w : el.w
        const expH = el.scaleY === -1 || el._flippedY ? -el.h : el.h
        lines.push(`    ${ref} = CreatePlayerTextDraw(playerid, ${expX.toFixed(1)}, ${expY.toFixed(1)}, "Preview_Model");`)
        lines.push(`    PlayerTextDrawFont(playerid, ${ref}, 5);`)
        lines.push(`    PlayerTextDrawTextSize(playerid, ${ref}, ${expW.toFixed(1)}, ${expH.toFixed(1)});`)
        lines.push(`    PlayerTextDrawColor(playerid, ${ref}, ${col});`)
        lines.push(`    PlayerTextDrawBackgroundColor(playerid, ${ref}, ${bg});`)
        lines.push(`    PlayerTextDrawSetPreviewModel(playerid, ${ref}, ${el.modelId ?? 2880});`)
        lines.push(`    PlayerTextDrawSetPreviewRot(playerid, ${ref}, ${(el.rotX || 0).toFixed(1)}, ${(el.rotY || 0).toFixed(1)}, ${(el.rotZ || 0).toFixed(1)}, ${(el.zoom || 1.0).toFixed(2)});`)
        if (el.vehCol1 !== undefined && el.vehCol1 !== -1) {
          lines.push(`    PlayerTextDrawSetPreviewVehCol(playerid, ${ref}, ${el.vehCol1}, ${el.vehCol2 !== undefined ? el.vehCol2 : -1});`)
        }
        if (el.selectable) lines.push(`    PlayerTextDrawSetSelectable(playerid, ${ref}, 1);`)
      } else {
        let createX = el.x
        if (el.align === 1) createX = el.x + (el.w / 2)
        else if (el.align === 2) createX = el.x + el.w

        lines.push(`    ${ref} = CreatePlayerTextDraw(playerid, ${createX.toFixed(1)}, ${el.y.toFixed(1)}, "${txt}");`)
        lines.push(`    PlayerTextDrawFont(playerid, ${ref}, ${el.font});`)

        let exportLY = el.letterY
        if (el.type === 'box') {
          exportLY = Math.abs(el.h) * 0.1154
        } else if (el.h < 0) {
          exportLY = -Math.abs(el.letterY)
        }

        const isLabel = el.type === 'label' || el.type === 'button'
        const exportLX = isLabel && el.w < 0 ? -Math.abs(el.letterX) : el.letterX
        lines.push(`    PlayerTextDrawLetterSize(playerid, ${ref}, ${exportLX.toFixed(3)}, ${exportLY.toFixed(3)});`)
        lines.push(`    PlayerTextDrawColor(playerid, ${ref}, ${col});`)
        lines.push(`    PlayerTextDrawAlignment(playerid, ${ref}, ${el.align + 1});`)

        if (el.useBox) {
          lines.push(`    PlayerTextDrawUseBox(playerid, ${ref}, 1);`)
          lines.push(`    PlayerTextDrawBoxColor(playerid, ${ref}, ${box});`)
        }
        if (el.useBox || el.selectable || el.textSizeX > 0 || el.textSizeY > 0) {
          const { tx, ty } = calcTextSize(el)
          lines.push(`    PlayerTextDrawTextSize(playerid, ${ref}, ${tx.toFixed(1)}, ${ty.toFixed(1)});`)
        }
        if (el.outline > 0)  lines.push(`    PlayerTextDrawSetOutline(playerid, ${ref}, ${el.outline});`)
        if (el.shadow > 0)   lines.push(`    PlayerTextDrawSetShadow(playerid, ${ref}, ${el.shadow});`)
        lines.push(`    PlayerTextDrawBackgroundColor(playerid, ${ref}, ${bg});`)
        if (el.proportional) lines.push(`    PlayerTextDrawSetProportional(playerid, ${ref}, 1);`)
        if (el.selectable)   lines.push(`    PlayerTextDrawSetSelectable(playerid, ${ref}, 1);`)
      }
      lines.push('')
    })
    lines.push(`    return 1;`)
    lines.push(`}\n`)
  }

  // Combined convenience Create stock
  if (globals.length && players.length) {
    lines.push(`stock ${prefix}_Create(playerid) \n{`)
    lines.push(`    ${prefix}_CreateGlobals();`)
    lines.push(`    ${prefix}_CreatePlayer(playerid);`)
    lines.push(`    return 1;`)
    lines.push(`}\n`)
  } else if (!globals.length && players.length) {
    lines.push(`stock ${prefix}_Create(playerid) \n{`)
    lines.push(`    return ${prefix}_CreatePlayer(playerid);`)
    lines.push(`}\n`)
  } else if (globals.length && !players.length) {
    lines.push(`stock ${prefix}_Create() \n{`)
    lines.push(`    return ${prefix}_CreateGlobals();`)
    lines.push(`}\n`)
  }

  // Show stock helper
  lines.push(`stock ${prefix}_Show(playerid) \n{`)
  if (globals.length) {
    lines.push(`    for (new i = 0; i < ${globals.length}; i++) {`)
    lines.push(`        TextDrawShowForPlayer(playerid, ${prefix}_global[i]);`)
    lines.push(`    }`)
  }
  if (players.length) {
    lines.push(`    for (new i = 0; i < ${players.length}; i++) {`)
    lines.push(`        PlayerTextDrawShow(playerid, ${prefix}_player[playerid][i]);`)
    lines.push(`    }`)
  }
  lines.push(`    return 1;`)
  lines.push(`}\n`)

  // Hide stock helper
  lines.push(`stock ${prefix}_Hide(playerid) \n{`)
  if (globals.length) {
    lines.push(`    for (new i = 0; i < ${globals.length}; i++) {`)
    lines.push(`        TextDrawHideForPlayer(playerid, ${prefix}_global[i]);`)
    lines.push(`    }`)
  }
  if (players.length) {
    lines.push(`    for (new i = 0; i < ${players.length}; i++) {`)
    lines.push(`        PlayerTextDrawHide(playerid, ${prefix}_player[playerid][i]);`)
    lines.push(`    }`)
  }
  lines.push(`    return 1;`)
  lines.push(`}\n`)

  // Destroy stock helper
  if (globals.length) {
    lines.push(`stock ${prefix}_DestroyGlobals() \n{`)
    lines.push(`    for (new i = 0; i < ${globals.length}; i++) {`)
    lines.push(`        TextDrawDestroy(${prefix}_global[i]);`)
    lines.push(`        ${prefix}_global[i] = Text:INVALID_TEXT_DRAW;`)
    lines.push(`    }`)
    lines.push(`    return 1;`)
    lines.push(`}\n`)
  }
  if (players.length) {
    lines.push(`stock ${prefix}_DestroyPlayer(playerid) \n{`)
    lines.push(`    for (new i = 0; i < ${players.length}; i++) {`)
    lines.push(`        PlayerTextDrawDestroy(playerid, ${prefix}_player[playerid][i]);`)
    lines.push(`        ${prefix}_player[playerid][i] = PlayerText:INVALID_TEXT_DRAW;`)
    lines.push(`    }`)
    lines.push(`    return 1;`)
    lines.push(`}\n`)
  }

  return lines.join('\n')
}