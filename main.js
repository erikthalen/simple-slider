import './style.css'
import dragScroll from './drag-scroll'

hljs.highlightAll()

dragScroll({
  el: document.querySelector('.default'),
})

dragScroll({
  el: document.querySelector('.looped'),
  loop: true,
})

dragScroll({
  el: document.querySelector('.autoplay'),
  loop: true,
  autoplay: true,
})

dragScroll({
  el: document.querySelector('.speed'),
  loop: true,
  autoplay: 5,
})

dragScroll({
  el: document.querySelector('.no-pause'),
  loop: true,
  autoplay: true,
  pausable: false,
})

dragScroll({
  el: document.querySelector('.snap'),
  loop: true,
  autoplay: 5,
  pausable: false,
  snap: true,
})

dragScroll({
  el: document.querySelector('.center'),
  loop: true,
  autoplay: 5,
  pausable: false,
  snap: true,
  align: 'center',
})

dragScroll({
  el: document.querySelector('.callback'),
  loop: true,
  autoplay: true,
  onUpdate: state => {
    const output = document.querySelector('output')

    output.textContent = state.current
  },
})
