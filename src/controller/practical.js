// ── Practical screen ──────────────────────────────────────────────────────────

const PRACTICAL_TEMPLATES = {
    checklistOption:   document.getElementById('tpl-practical-checklist-option'),
    noChecklistsEmpty: document.getElementById('tpl-no-checklists-empty'),
}

let practicalState = {
    selectedChecklistIds: [],
    bodyPartQueue:        [],
    currentStationIdx:    0,
    currentCoordinates:   {},
    timerInterval:        null,
    timeRemaining:        0,
    scale:                1,
    fontSize:             16,
}

//Called on entry to the practical screen and again on exit, so a running
//countdown can't outlive the screen and force a navigation from elsewhere.
const stopPracticalTimer = () => {
    if (practicalState.timerInterval) {
        clearInterval(practicalState.timerInterval)
        practicalState.timerInterval = null
    }
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
        const emptyState = cloneTemplate(PRACTICAL_TEMPLATES.noChecklistsEmpty)
        emptyState.querySelector('[data-action="go-to-library"]')
            .addEventListener('click', () => navigate('library'))
        container.appendChild(emptyState)
        return
    }

    keys.forEach(id => {
        const checklist = checklists[id]
        const bpCount   = Object.keys(checklist['bodyParts'] || {}).length

        const label    = cloneTemplate(PRACTICAL_TEMPLATES.checklistOption)
        const checkbox = label.querySelector('input')

        label.dataset.id = id
        label.querySelector('.js-name').textContent = checklist['name']
        label.querySelector('.js-meta').textContent = `${bpCount} body part${bpCount !== 1 ? 's' : ''}`

        checkbox.value    = id
        checkbox.disabled = bpCount === 0

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                practicalState.selectedChecklistIds.push(id)
            } else {
                practicalState.selectedChecklistIds = practicalState.selectedChecklistIds.filter(x => x !== id)
            }

            updatePracticalSummary()
        })

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

document.getElementById('practical-start-btn').addEventListener('click', async () => {
    await buildBodyPartQueue()
    startPractical()
})

const buildBodyPartQueue = async () => {
    const checklists = await window.api.getChecklists()
    const queue      = []

    practicalState.selectedChecklistIds.forEach(clId => {
        const bodyParts = checklists[clId]['bodyParts'] || {}
        Object.keys(bodyParts).forEach(bpId => {
            let bodyPart = bodyParts[bpId]
            queue.push({
                checklistId: clId,
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

const startPractical = () => {
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

    loadCurrentStation()
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

    document.getElementById('practical-station-name').textContent =
        `${practicalState.currentStationIdx + 1} / ${practicalState.bodyPartQueue.length} — ${bp['name']}`

    const image  = document.getElementById('practical-image')
    const canvas = document.getElementById('practical-canvas')
    image.src    = bp['image']

    image.onload = async () => {
        await drawNewImage(canvas, image, 0, 0, practicalState.scale)
        drawPracticalQuestionMarks()
    }

    if (image.complete) {
        image.onload()
    }
}

const drawPracticalQuestionMarks = () => {
    const canvas = document.getElementById('practical-canvas')

    for (const id in practicalState.currentCoordinates) {
        let station = practicalState.bodyPartQueue[practicalState.currentStationIdx]
        let tag = station.bodyPart.coordinates[id]
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
document.getElementById('practical-canvas').addEventListener('click', (e) => {
    const canvas = document.getElementById('practical-canvas')
    const coords = getClickCoordinates(e, practicalState.scale)
    const key    = checkCoordinatesExist(canvas, coords.x, coords.y, practicalState.currentCoordinates, practicalState.scale, practicalState.fontSize, false)

    if (key) {
        openPracticalTagModal(key)
    }
})

const practicalTagModal    = new bootstrap.Modal(document.getElementById('practical-tag-modal'))
let _practicalCurrentTagId = null

const openPracticalTagModal = async (tagId) => {
    _practicalCurrentTagId = tagId
    const tag        = practicalState.currentCoordinates[tagId]
    const categoryId = tag['category']
    let prompt       = 'Enter tag'

    if (categoryId && categoryId !== 'null') {
        const category = await window.api.getCategoryById(categoryId)
        if (category) prompt = `What is this ${category}?`
    }

    document.getElementById('practical-tag-prompt').textContent = prompt
    let station = practicalState.bodyPartQueue[practicalState.currentStationIdx]
    let bodyPartTag = station.bodyPart.coordinates[tagId]
    document.getElementById('practical-tag-input').value = bodyPartTag['given'] || ''
    practicalTagModal.show()
}

document.getElementById('practical-tag-save-btn').addEventListener('click', async () => {
    const txt      = document.getElementById('practical-tag-input').value.trim()

    if (txt) {
        let station = practicalState.bodyPartQueue[practicalState.currentStationIdx]
        let tag = station.bodyPart.coordinates[_practicalCurrentTagId]

        if (tag) {
            tag['given'] = txt
        }
    }

    practicalTagModal.hide()
    const canvas = document.getElementById('practical-canvas')
    clearCanvas(canvas)
    const image = document.getElementById('practical-image')

    try {
        await drawNewImage(canvas, image, 0, 0, practicalState.scale)
        drawPracticalQuestionMarks()
    } catch (err) {
        console.error(err)
    }
})

document.getElementById('practical-next-btn').addEventListener('click', async () => {
    practicalState.currentStationIdx++

    if (practicalState.currentStationIdx >= practicalState.bodyPartQueue.length) {
        try {
            const res = await window.api.dialogQuestion("End practical? Your results will be saved.")

            if (res.response === 0) {
                await endPractical()
            }
        } catch (err) {
            console.error(err)
        }
    } else {
        loadCurrentStation()
    }
})

const endPractical = async () => {
    stopPracticalTimer()

    let numCorrect = 0
    let totalTags = 0
    let queue = practicalState.bodyPartQueue

    queue.forEach((station, idx) => {
        let bodyPart = station.bodyPart
        let coordinates = bodyPart.coordinates
        let coordinateIds = Object.keys(coordinates)

        for (const key of coordinateIds) {
            let coord = coordinates[key]
            let given = coord['given'] ? coord['given'].toLowerCase() : ''
            let answer = coord['name'].toLowerCase()
            let isCorrect = false

            if (given === answer) {
                isCorrect = true
                numCorrect++
            }

            coord['isCorrect'] = isCorrect
            totalTags++
        }
    })

    const practical   = {
        date:    new Date().toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        }),
// "June 24, 2026 at 2:34 PM"
        queue:   practicalState.bodyPartQueue,
        totalTags:   totalTags,
        numCorrect: numCorrect,
    }

    let id = crypto.randomUUID()

    try {
        await window.api.addPractical(id, practical)
        navigate('results')
    } catch (err) {
        console.error(err)
        await window.api.popup('Could not save this practical.')
    }
}


