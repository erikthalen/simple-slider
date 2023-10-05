const MOBILE_BREAKPOINT = 900

const lerp = (f0, f1, t) => (1 - t) * f0 + t * f1
const round = v => Math.round(v * 1) / 1
const clamp = (min, val, max) => Math.min(max, Math.max(min, val))

export default ({
  el,
  item = 'li',
  loop = false,
  autoplay = false,
  pausable = true,
  onChange = () => {},
  onUpdate = () => {},
  align,
  snap = false,
  lerp: lerpAmount = [0.1, 0.1],
}) => {
  const $el = typeof el === 'string' ? document.querySelector(el) : el
  const $items = [...$el.querySelectorAll(item)]

  if (!$items.length) return

  const { wrapper, children, copiesNeeded } = makeWrapper($el, $items, loop)

  $el.style.overflow = 'hidden'
  $el.style.touchAction = 'pan-y'

  const state = {
    running: false,
    progress: 0,
    transform: 0,
    current: 0,
    snapProgress: 0,
    targetProgress: 0,

    deltaX: 0,
    animatable: false,
    hovered: false,

    lastIndex: 0,
    currentIndex: 0,
    activeIndex: -1,

    items: $items,
    children,
    childrenWidths: getChildrenWidths($items),
    wrapWidth: getTotalWidth($items),
    clonesAmount: copiesNeeded,
  }

  const settings = { loop, autoplay, align, snap, pausable }

  wrapper.style.width = `${state.wrapWidth}px`

  const removeEventListeners = addEventListeners()

  raf()

  function increaseProgressBy(amount) {
    state.progress += amount || 0

    if (!settings.loop) {
      state.progress = clamp(
        0,
        state.progress,
        state.wrapWidth - window.innerWidth
      )
    }

    if (settings.snap) {
      const currentItemWidth =
        state.childrenWidths[state.currentIndex]?.width || 0
      state.snapProgress =
        Math.round(state.progress / currentItemWidth) * currentItemWidth
    } else {
      state.snapProgress = state.progress
    }
  }

  function updateCurrentIndex() {
    state.currentIndex = state.childrenWidths.findIndex(
      child => child.accumulatedWidth > state.targetProgress % state.wrapWidth
    )
  }

  function getItemAtPosition(at) {
    return state.childrenWidths.findIndex(
      child =>
        (state.targetProgress + at) % state.wrapWidth < child.accumulatedWidth
    )
  }

  function handleWheel(e) {
    if (e.deltaX !== 0) {
      increaseProgressBy(e.deltaX)
      move()
    }
  }

  function handleTouchStart(e) {
    state.animatable = true

    state.deltaX = e.clientX || (e.touches && e.touches[0].clientX) || 0
    $el.classList.add('dragging')
  }

  function handleTouchMove(e) {
    if (!state.animatable) return false

    const x = e.clientX || (e.touches && e.touches[0].clientX) || 0

    e.preventDefault()

    increaseProgressBy(state.deltaX - x)
    state.deltaX = x
    move()

    $el.classList.add('interacting')
  }

  function handleTouchEnd() {
    state.animatable = false
    $el.classList.remove('dragging')

    setTimeout(() => {
      $el.classList.remove('interacting')
    }, 10)
  }

  function move() {
    if (!state.running) raf()
  }

  function navigate(to) {
    const previousIndex =
      state.currentIndex === 0 ? $items.length - 1 : state.currentIndex - 1
    const nextIndex = (state.currentIndex + 1) % ($items.length - 1)

    if (to < 0) {
      increaseProgressBy(state.childrenWidths[previousIndex].width * -1)
    }
    if (to > 0) {
      increaseProgressBy(state.childrenWidths[nextIndex].width)
    }

    move()
  }

  function raf(time, once) {
    const initialPosition =
      settings.loop && settings.align === 'center'
        ? state.clonesAmount * state.wrapWidth +
          state.childrenWidths[0].width / 2 -
          window.innerWidth / 2
        : settings.loop
        ? state.wrapWidth * state.clonesAmount
        : 0

    state.transform = settings.loop
      ? -initialPosition - (state.targetProgress % state.wrapWidth)
      : -state.targetProgress

    state.current = state.targetProgress % state.wrapWidth
    
    wrapper.style.transform = `translateX(${state.transform}px)`

    if (
      !settings.autoplay &&
      round(state.targetProgress) === round(state.progress)
    ) {
      state.running = false
    } else {
      state.running = true
    }

    if (settings.autoplay && !state.hovered) {
      increaseProgressBy(settings.autoplay || 3)
    }

    const lerping =
      window.innerWidth < MOBILE_BREAKPOINT
        ? lerpAmount[0] || 0.1
        : lerpAmount[1] || 0.1

    state.targetProgress = lerp(
      state.targetProgress,
      state.snapProgress,
      lerping
    )

    state.lastIndex = state.activeIndex
    state.activeIndex = getItemAtPosition(
      settings.align === 'center'
        ? window.innerWidth / 4
        : window.innerWidth / 2
    )

    if (typeof onUpdate === 'function') {
      onUpdate(state, state.activeIndex)
    }

    updateCurrentIndex()

    if (
      state.lastIndex !== state.activeIndex &&
      typeof onChange === 'function'
    ) {
      onChange(state, state.activeIndex)
    }

    if (state.running && !once) {
      requestAnimationFrame(raf)
    }
  }

  function addEventListeners() {
    const signals = []

    function makeSignal() {
      const abortController = new AbortController()
      const signal = abortController.signal
      signals.push(signal)
      return { signal }
    }

    window.addEventListener(
      'resize',
      () => {
        state.wrapWidth = getTotalWidth($items)
        wrapper.style.width = `${state.wrapWidth}px`
        state.childrenWidths = getChildrenWidths($items)
        state.hovered = false
        state.animatable = true

        setTimeout(() => {
          raf(0, true)
        })
      },
      makeSignal()
    )
    wrapper.addEventListener('wheel', handleWheel, makeSignal())
    wrapper.addEventListener(
      'mouseenter',
      () => {
        if (settings.pausable) {
          state.hovered = true
          state.animatable = false
        }
      },
      makeSignal()
    )
    wrapper.addEventListener(
      'mouseleave',
      () => {
        state.hovered = false
      },
      makeSignal()
    )
    wrapper.addEventListener('pointerdown', handleTouchStart, makeSignal())
    window.addEventListener('pointermove', handleTouchMove, makeSignal())
    window.addEventListener('pointerup', handleTouchEnd, makeSignal())

    document.body.addEventListener('mouseleave', handleTouchEnd, makeSignal())

    return () => {
      signals.forEach(signal => {
        if (signal && typeof signal.abort === 'function') {
          signal.abort()
        }
      })
    }
  }

  return {
    navigate,
    destroy: removeEventListeners,
  }
}

/********************************************************' */

function getChildrenWidths(items) {
  let accumulatedWidth = 0
  return items.map(item => {
    accumulatedWidth += item.clientWidth
    return {
      accumulatedWidth,
      width: item.clientWidth,
    }
  })
}

function getTotalWidth(items) {
  return items.reduce((acc, item) => (acc += item.clientWidth), 0)
}

function makeClones(el, items, copiesNeeded) {
  let clonedItems = items

  const clones = () =>
    [...el.cloneNode(true).children].map(child => {
      child.classList.add('clone')
      return child
    })

  for (let i = 0; i < copiesNeeded; i++) {
    clonedItems = [...clones(), ...clonedItems, ...clones()]
  }

  return clonedItems
}

function makeWrapper(el, items, loop) {
  const wrapper = document.createElement('div')
  wrapper.classList.add('drag-scroll-wrapper')
  wrapper.style.display = 'flex'

  const copiesNeeded = Math.ceil(window.innerWidth / getTotalWidth(items))

  items.forEach((item, idx) => (item.dataset.index = idx))

  const children = !loop ? items : makeClones(el, items, copiesNeeded)

  children.forEach(el => {
    el.style.flexShrink = 0
    wrapper.append(el)
  })

  el.append(wrapper)

  return { wrapper, children, copiesNeeded }
}
