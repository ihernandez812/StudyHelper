// ── Practical review screen ───────────────────────────────────────────────────

import {registerScreen, navigate} from "./router.js";
import {drawNewImage, drawNewText, clearCanvas, TAG_COLORS} from "../HTMLUtils/canvasUtils.js"
import {mustGetElementById, createImageUrl} from "../HTMLUtils/domUtils.js"
import {createSessionNav} from "../HTMLUtils/sessionNav.js"
import {AppState, PAGES} from "./state.js";

registerScreen(PAGES.PRACTICAL_REVIEW, {
    sidebar: PAGES.RESULTS,
    load: () => loadPracticalReview(),
    topbar: {
        breadcrumb: () => [
            { label: 'Results', screen: PAGES.RESULTS },
            { label: AppState.currentPracticalDate || '' },
        ],
    },
})

const reviewState = {
    stations:     [],
    currentIndex: 0,
    showAnswers:  false,
}

const reviewNav = createSessionNav({
    label:       mustGetElementById('review-progress-label'),
    bar:         mustGetElementById('review-progress-bar'),
    prevBtn:     mustGetElementById('review-prev-btn'),
    nextBtn:     mustGetElementById('review-next-btn'),
    btnGroup:    mustGetElementById('review-btn-group'),
    formatLabel: (position, count) => `Station ${position} of ${count}`,
    onChange:    (index) => showStation(index),
})

const loadPracticalReview = async () => {
    const practical = await window.api.getPracticalById(AppState.currentPracticalId)
    reviewState.stations = practical['queue'] || []

    if (reviewState.stations.length === 0) {
        await window.api.popup('This practical has no stations to review.')
        navigate(PAGES.RESULTS)
        return
    }

    // Every practical opens on what was given
    reviewState.showAnswers = false
    mustGetElementById('review-show-answers').checked = false
    document.getElementById('review-total-score').textContent =
        `Overall: ${practical['numCorrect'] || 0} / ${practical['totalTags'] || 0} correct`

    await reviewNav.start(reviewState.stations.length)
}

const showStation = async (index) => {
    reviewState.currentIndex = index

    const { bodyPart, checklistName } = reviewState.stations[index]
    const tags    = Object.values(bodyPart['coordinates'] || {})
    const correct = tags.filter(tag => tag['isCorrect']).length

    document.getElementById('review-body-part-name').textContent      = bodyPart['name']
    document.getElementById('review-body-part-checklist').textContent = checklistName || ''
    document.getElementById('review-station-score').textContent      =
        `This station: ${correct} / ${tags.length} correct`

    document.getElementById('review-image').src = createImageUrl(bodyPart['image'])
    await drawStation()
}

const drawStation = async () => {
    const { bodyPart } = reviewState.stations[reviewState.currentIndex]
    const scale    = bodyPart['scale'] || 1
    const fontSize = bodyPart['fontSize'] || 16
    const canvas   = document.getElementById('review-canvas')
    const image    = document.getElementById('review-image')

    clearCanvas(canvas)
    await drawNewImage(canvas, image, 0, 0, scale)

    for (const tag of Object.values(bodyPart['coordinates'] || {})) {
        drawGradedTag(canvas, tag, scale, fontSize)
    }
}

// Colour says whether the tag was right; the text is either what was given or the answer
const drawGradedTag = (canvas, tag, scale, fontSize) => {
    const given = tag['given']

    if (reviewState.showAnswers) {
        drawNewText(canvas, tag['name'], tag, scale, fontSize,
            tag['isCorrect'] ? TAG_COLORS.CORRECT : TAG_COLORS.INCORRECT)
    } else if (given) {
        drawNewText(canvas, given, tag, scale, fontSize,
            tag['isCorrect'] ? TAG_COLORS.CORRECT : TAG_COLORS.INCORRECT)
    } else {
        drawNewText(canvas, 'No answer', tag, scale, fontSize, TAG_COLORS.UNANSWERED)
    }
}

mustGetElementById('review-show-answers').addEventListener('change', (e) => {
    reviewState.showAnswers = e.target.checked
    drawStation().catch(err => console.error(err))
})

mustGetElementById('review-exit-btn').addEventListener('click', () => {
    navigate(PAGES.RESULTS)
})
