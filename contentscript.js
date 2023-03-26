const imageCache = { }
let idx = 0
const messageQueue = []
const batchDelay = 500
const batchSize = 1
let batchTimerId = null

function addToQueue(message) {
    messageQueue.push(message)
    if (!batchTimerId) {
        batchTimerId = setTimeout(sendBatch, batchDelay);
    }
}

function sendBatch() {
    messageQueue.splice(0, batchSize).forEach(msg => chrome.runtime.sendMessage(msg))
    if (messageQueue.length > 0) {
        batchTimerId = setTimeout(sendBatch, batchDelay);
    } else {
        batchTimerId = null
    }
}

function onImageLoad(image) {
    if (image.width > 100 && image.height > 100) {
        imageCache[++idx] = image
        addToQueue({ source: image.currentSrc, idx: idx })
    }
}

function processImage(image) {
    if (image.complete && image.src !== '') {
        onImageLoad(image)
    } else {
        image.addEventListener('load', function() {
            onImageLoad(this)
        }, { once: true })
    }
}

function onLoad() {
  Array.from(document.images).forEach(image => {
      processImage(image)
  })
}

window.addEventListener("load", onLoad, false);

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    Array.from(mutation.addedNodes)
        .forEach((node) => {
          if (node.getElementsByTagName) {
            Array.prototype.slice.call(node.getElementsByTagName('img')).forEach(image => {
                processImage(image)
            })
          }
        })
  });
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
})

chrome.runtime.onMessage.addListener(
  function (result, sender, sendResponse) {
      const img = imageCache[result.idx];
      img.parentNode.querySelectorAll('source').forEach((src) => src.remove());
      img.src = result.data
  });