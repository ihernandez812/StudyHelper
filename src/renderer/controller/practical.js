// ── Practical screen ──────────────────────────────────────────────────────────

import {registerScreen, navigate} from "./router.js";
import {drawNewImage, drawNewText, drawNewQuestionMark,
    checkCoordinatesExist, getClickCoordinates, clearCanvas} from "../HTMLUtils/canvasUtils.js"
import {cloneTemplate, createImageUrl, mustGetElementById} from "../HTMLUtils/domUtils.js"
import {createDisplayControls} from "../HTMLUtils/displayControls.js"
import {PAGES} from "./state.js";


registerScreen(PAGES.PRACTICAL, {
    sidebar: PAGES.PRACTICAL,
    load: () => loadPracticalSetup(),
    teardown: () => {
        stopPracticalTimer()
        clearPractical()
    },
    topbar: { title: 'Practical' },
})


const TEMPLATES = {
    checklistOption:   mustGetElementById('tpl-practical-checklist-option'),
    noChecklistsEmpty: mustGetElementById('tpl-no-checklists-empty'),
    displayControls:   mustGetElementById('tpl-display-controls'),
}

const practicalState = {
    selectedChecklistIds: [],
    bodyPartQueue:        [],
    currentStationIdx:    0,
    currentCoordinates:   {},
    timerInterval:        null,
    timeRemaining:        0,
    scale:                1,
    fontSize:             16,
}

// View only, never saved. Goes into practicalState, not the station's
// bodyPart: the click check reads practicalState, and the bodyPart is
// saved as part of the practical.
const practicalDisplayMount = mustGetElementById('practical-display-controls')
practicalDisplayMount.appendChild(cloneTemplate(TEMPLATES.displayControls))

const practicalDisplayControls = createDisplayControls(practicalDisplayMount, {
    onChange: ({ scale, fontSize }) => {
        practicalState.scale    = scale
        practicalState.fontSize = fontSize
        redrawPracticalStation().catch(error => console.error(error))
    },
})

mustGetElementById('practical-checklist-select').addEventListener('change', async (e) => {
    const checkbox= e.target;

    if ((checkbox instanceof HTMLInputElement) && checkbox.type === 'checkbox') {
        const id = checkbox.value;

        if (checkbox.checked) {
            practicalState.selectedChecklistIds.push(id)
        } else {
            practicalState.selectedChecklistIds = practicalState.selectedChecklistIds.filter(x => x !== id)
        }

        await updatePracticalSummary();
    }
})

mustGetElementById('practical-checklist-select').addEventListener('click', async (e) => {
    const element = e.target;

    if ((element instanceof HTMLInputElement) && element.closest('[data-action="go-to-library"]')) {
        navigate(PAGES.LIBRARY)
    }
})


//Called on entry to the practical screen and again on exit, so a running
//countdown can't outlive the screen and force a navigation from elsewhere.
const stopPracticalTimer = () => {
    if (practicalState.timerInterval) {
        clearInterval(practicalState.timerInterval)
        practicalState.timerInterval = null
    }
}

// A practical is running from Start until it's saved or the screen is left
const isPracticalActive = () => {
    return practicalState.bodyPartQueue.length !== 0
}

const clearPractical = () => {
    practicalState.bodyPartQueue     = []
    practicalState.currentStationIdx = 0
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const loadPracticalSetup = async () => {
    document.getElementById('practical-setup').classList.remove('hide')
    document.getElementById('practical-active').classList.add('hide')

    stopPracticalTimer()

    const checklists = await window.api.getChecklists()
    const container  = document.getElementById('practical-checklist-select')
    container.replaceChildren()
    practicalState.selectedChecklistIds = []
    await updatePracticalSummary()

    const keys = Object.keys(checklists)

    if (keys.length === 0) {
        const emptyState = cloneTemplate(TEMPLATES.noChecklistsEmpty)
        container.appendChild(emptyState)
        return
    }

    keys.forEach(id => {
        const checklist = checklists[id]
        const bpCount   = Object.keys(checklist['bodyParts'] || {}).length

        const label    = cloneTemplate(TEMPLATES.checklistOption)
        const checkbox = label.querySelector('input')

        label.dataset.id = id
        label.querySelector('.js-name').textContent = checklist['name']
        label.querySelector('.js-meta').textContent = `${bpCount} body part${bpCount !== 1 ? 's' : ''}`

        checkbox.value    = id
        checkbox.disabled = bpCount === 0

        container.appendChild(label)
    })
}

const updatePracticalSummary = async () => {
    const startBtn   = document.getElementById('practical-start-btn')
    const summaryTxt = document.getElementById('practical-summary-text')
    const ids        = practicalState.selectedChecklistIds

    if (ids.length === 0) {
        summaryTxt.textContent = 'Select at least one checklist to begin.'
        startBtn.disabled = true
        return
    }

    const checklists  = await window.api.getChecklists()
    let totalBodyParts = 0
    ids.forEach(id => {
        totalBodyParts += Object.keys(checklists[id]['bodyParts'] || {}).length
    })

    summaryTxt.textContent =
        `${totalBodyParts} body part${totalBodyParts !== 1 ? 's' : ''} from ${ids.length} checklist${ids.length !== 1 ? 's' : ''}`
    startBtn.disabled = totalBodyParts === 0
}

mustGetElementById('practical-start-btn').addEventListener('click', async () => {
    try {
        await buildBodyPartQueue(),
        await startPractical()
    } catch (err) {
        console.error(err)
    }
})

const buildBodyPartQueue = async () => {
    const checklists = await window.api.getChecklists()
    const queue      = []

    practicalState.selectedChecklistIds.forEach(clId => {
        const bodyParts = checklists[clId]['bodyParts'] || {}
        Object.keys(bodyParts).forEach(bpId => {
            const bodyPart = bodyParts[bpId]
            queue.push({
                checklistId: clId,
                checklistName: checklists[clId]['name'],
                bodyPart: bodyPart
            })
        })
    })

    // Shuffle
    for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]]
    }

    practicalState.bodyPartQueue    = queue
    practicalState.currentStationIdx = 0
}

// ── Active test ───────────────────────────────────────────────────────────────

const startPractical = async () => {
    document.getElementById('practical-setup').classList.add('hide')
    document.getElementById('practical-active').classList.remove('hide')

    // Start timer if selected
    const timeLimitVal = document.querySelector('input[name="time-limit"]:checked').value
    const timeLimit    = parseInt(timeLimitVal)
    const timerEl      = document.getElementById('practical-timer')

    if (timeLimit > 0) {
        practicalState.timeRemaining = timeLimit
        timerEl.classList.remove('hide')
        updateTimerDisplay()
        practicalState.timerInterval = setInterval(() => {
            practicalState.timeRemaining--
            updateTimerDisplay()
            if (practicalState.timeRemaining <= 0) {
                clearInterval(practicalState.timerInterval)
                //setInterval callbacks can't be awaited, so tail the promise with a catch
                endPractical().catch(err => console.error(err))
            }
        }, 1000)
    } else {
        timerEl.classList.add('hide')
    }

    try {
        await loadCurrentStation()
    } catch (err) {
        console.error(err)
    }
}

const updateTimerDisplay = () => {
    const mins = Math.floor(practicalState.timeRemaining / 60).toString().padStart(2, '0')
    const secs = (practicalState.timeRemaining % 60).toString().padStart(2, '0')
    document.getElementById('practical-timer-display').textContent = `${mins}:${secs}`
}

const loadCurrentStation = async () => {
    const station    = practicalState.bodyPartQueue[practicalState.currentStationIdx]
    //const bp         = await window.api.getBodyPartById(station.bodyPartId, station.checklistId)
    const bp = station.bodyPart

    practicalState.scale        = bp['scale'] || 1
    practicalState.fontSize     = bp['fontSize'] || 16
    practicalState.currentCoordinates = bp['coordinates'] || {}
    practicalDisplayControls.reset(practicalState.scale, practicalState.fontSize)

    document.getElementById('practical-station-name').textContent =
        `${practicalState.currentStationIdx + 1} / ${practicalState.bodyPartQueue.length} — ${bp['name']}`

    const image  = document.getElementById('practical-image')
    image.src    = createImageUrl(bp['image'])

    try {
        await redrawPracticalStation()
    } catch (err) {
        console.error(err)
    }
}

// Repaints the station at practicalState.scale, resizing the canvas to match
const redrawPracticalStation = async () => {
    const canvas = document.getElementById('practical-canvas')
    const image  = document.getElementById('practical-image')

    clearCanvas(canvas)
    await drawNewImage(canvas, image, 0, 0, practicalState.scale)
    drawPracticalQuestionMarks()
}

const drawPracticalQuestionMarks = () => {
    const canvas = document.getElementById('practical-canvas')

    for (const id in practicalState.currentCoordinates) {
        const station = practicalState.bodyPartQueue[practicalState.currentStationIdx]
        const tag = station.bodyPart.coordinates[id]
        let answer = null

        if (tag) {
            answer = tag['given']
        }

        if (answer) {
            drawNewText(canvas, answer, practicalState.currentCoordinates[id], practicalState.scale, practicalState.fontSize)
        } else {
            drawNewQuestionMark(canvas, practicalState.currentCoordinates[id], practicalState.scale, practicalState.fontSize)
        }
    }
}

// Click a tag to answer it
mustGetElementById('practical-canvas').addEventListener('click', async (e) => {
    const canvas = document.getElementById('practical-canvas')
    const coords = getClickCoordinates(e, practicalState.scale)
    const key    = checkCoordinatesExist(canvas, coords.x, coords.y, practicalState.currentCoordinates, practicalState.scale, practicalState.fontSize,
        tag => tag['given'] || '?')

    if (key) {
        try {
            await openPracticalTagModal(key);
        } catch (err) {
            console.error(err);
        }
    }
})

const practicalTagModal    = new bootstrap.Modal(mustGetElementById('practical-tag-modal'))
let _practicalCurrentTagId = null

const openPracticalTagModal = async (tagId) => {
    _practicalCurrentTagId = tagId
    const tag        = practicalState.currentCoordinates[tagId]
    const categoryId = tag['category']
    let prompt       = 'Enter tag'

    if (categoryId) {
        const category = await window.api.getCategoryById(categoryId)

        if (category?.name) {
            prompt = `What is this ${category.name}?`
        }
    }

    document.getElementById('practical-tag-prompt').textContent = prompt
    const station = practicalState.bodyPartQueue[practicalState.currentStationIdx]
    const bodyPartTag = station.bodyPart.coordinates[tagId]
    document.getElementById('practical-tag-input').value = bodyPartTag['given'] || ''
    practicalTagModal.show()
}

mustGetElementById('practical-tag-save-btn').addEventListener('click', async () => {
    const txt      = document.getElementById('practical-tag-input').value.trim()

    if (txt) {
        const station = practicalState.bodyPartQueue[practicalState.currentStationIdx]
        const tag = station.bodyPart.coordinates[_practicalCurrentTagId]

        if (tag) {
            tag['given'] = txt
        }
    }

    practicalTagModal.hide()

    try {
        await redrawPracticalStation()
    } catch (err) {
        console.error(err)
    }
})

mustGetElementById('practical-next-btn').addEventListener('click', async () => {
    practicalState.currentStationIdx++

    try {
        if (practicalState.currentStationIdx >= practicalState.bodyPartQueue.length) {
            const res = await window.api.dialogQuestion("End practical? Your results will be saved.")

            if (res.response === 0) {
                await endPractical()
            }
        } else {
            await loadCurrentStation()
        }
    } catch (err) {
        console.error(err)
    }
})

const endPractical = async () => {
    stopPracticalTimer()

    const queue = practicalState.bodyPartQueue

    queue.forEach((station) => {
        const bodyPart = station.bodyPart
        const coordinatesList = bodyPart.coordinates
        const coordinateIds = Object.keys(coordinatesList)

        for (const key of coordinateIds) {
            const coordinates = coordinatesList[key]
            const given = coordinates['given'] ? coordinates['given'].trim().toLowerCase() : ''
            const answer = coordinates['name'].trim().toLowerCase()
            let isCorrect = false

            if (given === answer) {
                isCorrect = true
            }

            coordinates['isCorrect'] = isCorrect
        }
    })

    // The main process records when it was taken and works out the totals
    const practical = {
        queue: queue,
    }

    try {
        await window.api.addPractical(practical)
        navigate(PAGES.RESULTS)
    } catch (err) {
        console.error(err)
        await window.api.popup('Could not save this practical.')
    }
}

export {
    isPracticalActive,
}
