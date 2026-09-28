import { ref } from 'vue'

export function useResize(els, selected, snapV, snapResize, clearSnapLines)
{
  const resizing = ref(false)
  const resizeId = ref(null)
  const resizeOrig = ref({})

  function start(pos, el)
  {
    resizing.value = true
    resizeId.value = el.id
    resizeOrig.value = { x: pos.x, y: pos.y, w: el.w, h: el.h }
  }

  function move(pos)
  {
    if (!resizing.value || !resizeId.value) return
    const o = resizeOrig.value

    const rawW = o.w + (pos.x - o.x)
    const rawH = o.h + (pos.y - o.y)

    const primary = els.value.find(e => e.id === resizeId.value)
    if (!primary) return

    const { w, h } = snapResize({ ...primary, w: rawW, h: rawH }, els.value)
    const dw = w - primary.w
    const dh = h - primary.h

    els.value = els.value.map(el => {
      if (!selected.value.has(el.id)) return el
      const newH = Math.max(1, el.h + dh)
      const newW = Math.max(1, el.w + dw)
      const updated = {
        ...el,
        w: newW,
        h: newH,
      }
      if (el.type === 'box') {
        updated.letterY = parseFloat((newH * 0.1154).toFixed(3))
      }
      if (el.align === 1) {
        updated.textSizeX = 0
        updated.textSizeY = newW
      } else if (el.align === 2) {
        updated.textSizeX = el.x
        updated.textSizeY = el.y + newH
      } else {
        updated.textSizeX = el.x + newW
        updated.textSizeY = el.y + newH
      }
      return updated
    })
  }

  function stop(commit)
  {
    if (!resizing.value) return
    resizing.value = false
    resizeId.value = null
    clearSnapLines()
    const r = (v) => Math.round(v * 10) / 10
    commit(els.value.map(el => {
      if (!selected.value.has(el.id)) return el
      return { ...el, w: r(el.w), h: r(el.h) }
    }))
  }

  return { resizing, resizeId, start, move, stop }
}