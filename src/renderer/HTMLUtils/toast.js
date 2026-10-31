import { TOAST_TYPE } from '../enums/toastType.js'
import { mustGetElementById } from './domUtils.js'

const TOAST_ICON = {
    [TOAST_TYPE.INFO]:    'fa-circle-info',
    [TOAST_TYPE.SUCCESS]: 'fa-circle-check',
    [TOAST_TYPE.WARN]:    'fa-triangle-exclamation',
    [TOAST_TYPE.FAIL]:    'fa-circle-xmark',
}

// Failures stay up longer so they aren't missed
const TOAST_DURATION_MS = {
    [TOAST_TYPE.INFO]:    3000,
    [TOAST_TYPE.SUCCESS]: 2500,
    [TOAST_TYPE.WARN]:    4500,
    [TOAST_TYPE.FAIL]:    6000,
}

const toastStack    = mustGetElementById('toast-stack')
const toastTemplate = mustGetElementById('tpl-toast')

const removeToast = (toast) => {
    if (toast.classList.contains('app-toast-leaving')) {
        return
    }

    toast.classList.add('app-toast-leaving')
    toast.addEventListener('animationend', () => toast.remove(), { once: true })
}

const buildToast = (type, message) => {
    const toast = toastTemplate.content.cloneNode(true).firstElementChild

    toast.classList.add(`app-toast-${type}`)
    toast.setAttribute('role', type === TOAST_TYPE.FAIL ? 'alert' : 'status')
    toast.querySelector('.js-toast-icon').classList.add(TOAST_ICON[type])
    // textContent so tag and body part names can't inject markup
    toast.querySelector('.js-toast-message').textContent = message
    toast.querySelector('.js-toast-close').addEventListener('click', () => removeToast(toast))

    toastStack.appendChild(toast)
    return toast
}

const showToast = (type, message) => {
    const toast = buildToast(type, message)

    setTimeout(() => removeToast(toast), TOAST_DURATION_MS[type])
}

// Stays up until close() — used for the update download
const showProgressToast = (message) => {
    const toast        = buildToast(TOAST_TYPE.INFO, message)
    const messageText  = toast.querySelector('.js-toast-message')
    const progressBar  = toast.querySelector('.js-toast-progress')
    const progressFill = toast.querySelector('.js-toast-progress-fill')

    progressBar.hidden = false

    const update = (percent, nextMessage = message) => {
        messageText.textContent  = nextMessage
        progressFill.style.width = `${percent}%`
    }

    const close = () => {
        removeToast(toast)
    }

    return { update, close }
}

export {
    showToast,
    showProgressToast,
}
