// Zoom and font size controls for a body part canvas, shared by the editor
// and the session screens (study, practical, practical review).

import {mustQuerySelector} from "./domUtils.js"

const SCALE_STEP = 0.05
const SCALE_MIN  = 0.1
const SCALE_MAX  = 2.0

const DEFAULT_SCALE     = 1
const DEFAULT_FONT_SIZE = 16

const FONT_SIZE_OPTIONS = [14, 16, 18, 20, 22, 24, 28, 36]

// Two decimals, so repeated steps don't drift (0.1 + 0.05 + ...)
const roundScale = (scale) => Math.round(scale * 100) / 100

const formatScaleLabel = (scale) => `Scale: ${scale.toFixed(2)}×`

const addFontSizeOption = (select, fontSize) => {
    const option = document.createElement('option')
    option.value       = fontSize
    option.textContent = fontSize
    select.appendChild(option)
}

// Wires up the controls inside `container`, found by class:
//   .js-font-size    <select>, filled from FONT_SIZE_OPTIONS
//   .js-scale-down   zoom out button
//   .js-scale-up     zoom in button
//   .js-scale-label  shows the current scale
// onChange({ scale, fontSize }) fires when the user changes either one;
// reset() sets both without firing it. Nothing here is saved, the caller
// decides what to do with the values.
const createDisplayControls = (container, { onChange }) => {
    const fontSelect = mustQuerySelector(container, '.js-font-size')
    const scaleDown  = mustQuerySelector(container, '.js-scale-down')
    const scaleUp    = mustQuerySelector(container, '.js-scale-up')
    const scaleLabel = mustQuerySelector(container, '.js-scale-label')

    let scale    = DEFAULT_SCALE
    let fontSize = DEFAULT_FONT_SIZE

    fontSelect.replaceChildren()

    for (const option of FONT_SIZE_OPTIONS) {
        addFontSizeOption(fontSelect, option)
    }

    const render = () => {
        scaleLabel.textContent = formatScaleLabel(scale)
        scaleDown.disabled     = scale <= SCALE_MIN
        scaleUp.disabled       = scale >= SCALE_MAX

        // Body parts saved before the option list changed can hold a size
        // that isn't in it; add it so the select doesn't show blank
        if (!FONT_SIZE_OPTIONS.includes(fontSize) && !fontSelect.querySelector(`option[value="${fontSize}"]`)) {
            addFontSizeOption(fontSelect, fontSize)
        }

        fontSelect.value = fontSize
    }

    const notifyChange = () => {
        render()
        onChange({ scale, fontSize })
    }

    const stepScale = (direction) => {
        const newScale = roundScale(Math.min(Math.max(scale + direction * SCALE_STEP, SCALE_MIN), SCALE_MAX))

        if (newScale === scale) {
            return
        }

        scale = newScale
        notifyChange()
    }

    scaleDown.addEventListener('click', () => stepScale(-1))
    scaleUp.addEventListener('click', () => stepScale(1))

    fontSelect.addEventListener('change', () => {
        fontSize = Number(fontSelect.value)
        notifyChange()
    })

    const reset = (newScale = DEFAULT_SCALE, newFontSize = DEFAULT_FONT_SIZE) => {
        scale    = Number(newScale)
        fontSize = Number(newFontSize)
        render()
    }

    const getScale    = () => scale
    const getFontSize = () => fontSize

    render()

    return { reset, getScale, getFontSize }
}

export {
    createDisplayControls,
    formatScaleLabel,
    SCALE_STEP,
    SCALE_MIN,
    SCALE_MAX,
    DEFAULT_SCALE,
    DEFAULT_FONT_SIZE,
    FONT_SIZE_OPTIONS,
}
