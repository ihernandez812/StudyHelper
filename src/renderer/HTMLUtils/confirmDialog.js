import { mustGetElementById } from './domUtils.js'

// One shared modal for every Yes/No question in the app
const confirmModalElement = mustGetElementById('confirm-modal')
const confirmModal        = new bootstrap.Modal(confirmModalElement)
const confirmButton       = mustGetElementById('confirm-modal-confirm')

// Text fields that can take focus back when the dialog's trigger is gone
const TEXT_FIELD_SELECTOR = 'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled)'

// Questions waiting their turn, oldest first. Only one is ever on screen.
const pendingQuestionList = []

// The question on screen: { key, options, resolve, returnFocusElement }
let activeQuestion = null

// Same title and message means the same question
const questionKey = ({ title, message }) => {
    return `${title}\n${message}`
}

const isQuestionQueued = (key) => {
    return activeQuestion?.key === key || pendingQuestionList.some(question => question.key === key)
}

// First text field of the modal still open underneath, if there is one
const findFallbackFocus = () => {
    const openModal = document.querySelector('.modal.show')

    if (!openModal) {
        return null
    }

    return openModal.querySelector(TEXT_FIELD_SELECTOR)
}

const restoreFocus = (returnFocusElement) => {
    const target = returnFocusElement?.isConnected ? returnFocusElement : findFallbackFocus()

    if (target) {
        target.focus()
    }
}

const settle = (answer) => {
    if (activeQuestion) {
        activeQuestion.resolve(answer)
    }
}

const showNextQuestion = () => {
    if (activeQuestion || pendingQuestionList.length === 0) {
        return
    }

    activeQuestion = pendingQuestionList.shift()

    const { title, message, confirmLabel, cancelLabel, danger } = activeQuestion.options

    mustGetElementById('confirm-modal-title').textContent   = title
    mustGetElementById('confirm-modal-message').textContent = message
    mustGetElementById('confirm-modal-cancel').textContent  = cancelLabel

    confirmButton.textContent = confirmLabel
    confirmButton.classList.toggle('btn-danger', danger)
    confirmButton.classList.toggle('btn-primary', !danger)

    // Taken when shown, not when queued, so a waiting question returns to what's focused now
    activeQuestion.returnFocusElement = document.activeElement
    confirmModal.show()
}

// Resolves true on confirm; Cancel, X, Escape and a backdrop click resolve false.
// A question already showing or waiting is ignored and resolves false.
const confirmDialog = ({ title, message, confirmLabel = 'Yes', cancelLabel = 'No', danger = false }) => {
    const key = questionKey({ title, message })

    if (isQuestionQueued(key)) {
        return Promise.resolve(false)
    }

    return new Promise((resolve) => {
        pendingQuestionList.push({
            key,
            options: { title, message, confirmLabel, cancelLabel, danger },
            resolve,
            returnFocusElement: null,
        })
        showNextQuestion()
    })
}

confirmButton.addEventListener('click', () => {
    settle(true)
    confirmModal.hide()
})

confirmModalElement.addEventListener('hidden.bs.modal', () => {
    // A no-op after Confirm: a promise only takes its first answer
    settle(false)

    // Bootstrap clears modal-open on any hide, even with a modal still open underneath
    if (document.querySelector('.modal.show')) {
        document.body.classList.add('modal-open')
    }

    // Focus first, so the next question records the right element
    restoreFocus(activeQuestion.returnFocusElement)
    activeQuestion = null
    showNextQuestion()
})

// Opened over another modal (categories): lift its backdrop above that modal
confirmModalElement.addEventListener('show.bs.modal', () => {
    requestAnimationFrame(() => {
        const backdropList = document.querySelectorAll('.modal-backdrop')

        if (backdropList.length > 1) {
            backdropList[backdropList.length - 1].classList.add('confirm-modal-backdrop')
        }
    })
})

export {
    confirmDialog,
}
