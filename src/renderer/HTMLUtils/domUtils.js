
//Clones a <template> and hands back its root element.
//
//Appending a DocumentFragment moves its children out and leaves the fragment
//empty, so the root has to be pulled off the clone before it goes anywhere.
//Returning the element instead of the fragment means callers can keep filling
//it in after they have appended it.
const cloneTemplate = (template) => {
    return template.content.cloneNode(true).firstElementChild
}

// domUtils.js
const getActionTarget = (element, rowSelector) => {
    const actionElement = element?.closest('[data-action]')

    if (!actionElement) {
        return null
    }

    const parentElement = actionElement.closest(rowSelector)

    if (!parentElement) {
        return null
    }

    return {
        action: actionElement.dataset.action,
        data: parentElement.dataset,
        element: parentElement,
    }
}

const mustGetElementById = (id) => {
    const element = document.getElementById(id)

    if (!element) {
        throw new Error(`Missing required element #${id}`)
    }

    return element
}

const mustQuerySelector = (container, selector) => {
    const element = container.querySelector(selector)

    if (!element) {
        throw new Error(`Missing required element ${selector}`)
    }

    return element
}

// domUtils.js
const createImageUrl = (key) => `media://images/${key}`

// Sorts names the way people read numbers: "Rib 2" before "Rib 11"
const compareNames = (first, second) => {
    return first.localeCompare(second, undefined, { numeric: true })
}

// "June 24, 2026 at 2:34 PM"
const formatPracticalDate = (takenAt) => {
    return new Date(takenAt).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
    })
}

export {
    cloneTemplate,
    getActionTarget,
    mustGetElementById,
    mustQuerySelector,
    createImageUrl,
    formatPracticalDate,
    compareNames,
}