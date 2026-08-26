// ── Study screen ──────────────────────────────────────────────────────────────

const STUDY_TEMPLATES = {
    pickerItem:        document.getElementById('tpl-study-picker-item'),
    noChecklistsEmpty: document.getElementById('tpl-no-checklists-empty'),
}

let studyState = {
    checklistId:    null,
    bodyPartIdList: [],
    usedIds:        [],
    currentBpId:    null,
    coordinates:    {},
    correctTags:    {},
    answerTag:      {},
    hintText:       '',
    hintsRemaining: 3,
    scale:          1,
    fontSize:       16,
    difficulty:     1,
    answeredTags: {}
}

const DIFFICULTY = {
    EASY:      0,
    MEDIUM:    1,
    HARD:      2,
}

//Offsets passed to loadBodyPart() to step through the session
const DIRECTION = {
    NEXT:     1,
    PREVIOUS: -1,
}

const STUDY_TYPES = {
    ALL:      0,
    RANDOM:   1,
}

document.getElementById('study-picker-list').addEventListener('click', (e) => {
    //If there are no body parts to study it is empty and the only thing to be clicked is a navigate to library
    if (e.target.closest('[data-action="go-to-library"]')) {
        navigate('library')
        return
    }


    const target = getActionTarget(e.target, '.study-picker-item');

    if (!target) {
        return;
    }

    const { id } = target.data;
    const action = target.action;

    try {
        switch (action) {
            case 'all':
                loadStudySettings(id)
                break;
            case 'random':
                loadRandomBodyStudySession(id);
                break;
            default:
                console.error(`Unknown action "${action}" on checklist row ${id}`);
        }
    } catch (err) {
        console.error(err);
    }
})

// ── Study picker ──────────────────────────────────────────────────────────────

const loadStudyPicker = async () => {
    // If a checklist was pre-selected (e.g. from Home or Library), jump straight
    // to settings; otherwise show the picker.
    const picker = document.getElementById('study-picker')
    const active = document.getElementById('study-active')
    picker.classList.remove('hide')
    active.classList.add('hide')

    setTopbar('study')

    const checklists = await window.api.getChecklists()
    const pickerList = document.getElementById('study-picker-list')
    pickerList.replaceChildren()

    const keys = Object.keys(checklists)

    if (keys.length === 0) {
        const emptyState = cloneTemplate(STUDY_TEMPLATES.noChecklistsEmpty)
        pickerList.appendChild(emptyState)
        return
    }

    // If a checklist was already chosen (e.g. "Study this" from home), open settings
    if (window.AppState.currentChecklistId) {
        await openStudySettings(window.AppState.currentChecklistId, STUDY_TYPES.ALL)
        return
    }

    keys.forEach(id => {
        const checklist = checklists[id]
        const bodyParts = checklist['bodyParts'] || {}
        const bpKeys    = Object.keys(bodyParts)

        const item       = cloneTemplate(STUDY_TEMPLATES.pickerItem)
        const randomBtn  = item.querySelector('[data-action="random"]')
        const studyAllBtn = item.querySelector('[data-action="all"]')

        item.dataset.id = id
        item.querySelector('.js-name').textContent = checklist['name']
        item.querySelector('.js-meta').textContent = `${bpKeys.length} body part${bpKeys.length !== 1 ? 's' : ''}`

        randomBtn.disabled   = bpKeys.length === 0
        studyAllBtn.disabled = bpKeys.length === 0

        pickerList.appendChild(item)
    })
}

const getBodyPartIdList = async (checklistId) => {
    let bodyPartIdList = []

    try {
        const checklist = await window.api.getChecklistById(checklistId)
        const bodyParts = checklist['bodyParts'] || {}
        bodyPartIdList = Object.keys(bodyParts)
    } catch (err) {
        console.error(err)
    }

    return bodyPartIdList
}

const getRandomBodyPartId = async (checklistId) => {
    let randomId = null

    try {
        const bpKeys = await getBodyPartIdList(checklistId)
        randomId = bpKeys[Math.floor(Math.random() * bpKeys.length)]
    } catch (err) {
        console.error(err)
    }

    return randomId
}

const loadStudySettings = (checklistId) => {
    openStudySettings(checklistId, STUDY_TYPES.ALL);
}

const loadRandomBodyStudySession = (checklistId) => {
    openStudySettings(checklistId, STUDY_TYPES.RANDOM);
}

// ── Study settings modal ──────────────────────────────────────────────────────

const studySettingsModal = new bootstrap.Modal(document.getElementById('study-settings-modal'))
let _pendingBpIds = []

const openStudySettings = async (checklistId, studyType) => {
    let bodyPartIdList = [];

    switch (studyType) {
        case STUDY_TYPES.ALL:
            bodyPartIdList = await getBodyPartIdList(checklistId);
            break;
        case STUDY_TYPES.RANDOM:
            let randomBodyPartId = await getRandomBodyPartId(checklistId);

            if (randomBodyPartId) {
                bodyPartIdList.push(randomBodyPartId)
            }

            break;
        default:
            console.error('Unknown study type for study session')
    }

    window.AppState.currentChecklistId = checklistId;
    _pendingBpIds = shuffle(bodyPartIdList)
    studySettingsModal.show()
}

document.getElementById('study-settings-save-btn').addEventListener('click', () => {
    studyState.difficulty     = parseInt(document.getElementById('study-difficulty').value)
    studyState.hintsRemaining = studyState.difficulty === DIFFICULTY.EASY ? 3 : 0;
    studySettingsModal.hide()
    beginStudySession(_pendingBpIds)
})

// ── Active study session ──────────────────────────────────────────────────────

const beginStudySession = (bpIds) => {
    studyState.bodyPartIdList = bpIds
    studyState.usedIds        = []
    studyState.checklistId    = window.AppState.currentChecklistId
    studyState.correctTags    = {}
    studyState.hintText       = ''
    studyState.answeredTags   = {}
    studyState.currentBpId    = null

    document.getElementById('study-picker').classList.add('hide')
    document.getElementById('study-active').classList.remove('hide')

    // Show "next" button only if more than one body part
    const bodyPartBtnGroup = document.getElementById('body-part-btn-group')
    bodyPartBtnGroup.classList.toggle('hide', bpIds.length <= 1)

    loadNextBodyPart().catch(err => {
        console.error(err)
    })
}

const loadNextBodyPart = () => loadBodyPart(DIRECTION.NEXT)

const loadPrevBodyPart = () => loadBodyPart(DIRECTION.PREVIOUS)

const loadBodyPart = async (offset) => {
    let bodyPartIdList = studyState.bodyPartIdList
    let nextBodyPartIndex = 0

    //If this is the first time in the study app then we don't have a current,
    //and we need to just set it to the first one
    if (studyState.currentBpId) {
        //Switching body parts need to updat the persisted answers
        let currentBpId = studyState.currentBpId
        studyState.answeredTags[currentBpId] = studyState.correctTags

        let currentBodyPartIndex = bodyPartIdList.indexOf(currentBpId)

        if (currentBodyPartIndex === -1) {
            return
        }

        nextBodyPartIndex = currentBodyPartIndex + offset

        if (nextBodyPartIndex >= bodyPartIdList.length) {
            return
        }

    }

    studyState.currentBpId  = bodyPartIdList[nextBodyPartIndex]
    studyState.correctTags  = {}
    studyState.hintText     = ''
    studyState.answerTag    = {}

    // Update progress
    const done  = nextBodyPartIndex + 1
    const total = studyState.bodyPartIdList.length
    document.getElementById('study-progress-label').textContent = `Body part ${done} of ${total}`
    const pct = (done / total) * 100
    document.getElementById('study-progress-bar').style.width = `${pct}%`

    let nextBtn = document.getElementById('study-next-btn')
    let prevBtn = document.getElementById('study-prev-btn')

    prevBtn.classList.toggle('disabled', done <= 1)
    nextBtn.classList.toggle('disabled', done >= bodyPartIdList.length)


    const bp  = await window.api.getBodyPartById(studyState.currentBpId, studyState.checklistId)
    studyState.scale    = bp['scale'] || 1
    studyState.fontSize = bp['fontSize'] || 16
    studyState.coordinates = bp['coordinates'] || {}

    let currentBpId = studyState.currentBpId
     studyState.correctTags = studyState.answeredTags[currentBpId] || {}

    document.getElementById('study-body-part-name').textContent = bp['name']
    document.getElementById('study-tags-progress').textContent =
        `0 / ${Object.keys(studyState.coordinates).length} tags labeled`

    const image  = document.getElementById('study-image')
    const canvas = document.getElementById('study-canvas')
    image.src    = bp['image']

    image.onload = async () => {
        await drawNewImage(canvas, image, 0, 0, studyState.scale)
        drawAllQuestionMarks()
    }


    if (image.complete) {
        image.onload()
    }

    // Word bank
    setupWordBank()
    // Hints
    updateHintButton()
}

const drawAllQuestionMarks = () => {
    const canvas = document.getElementById('study-canvas')

    for (const id in studyState.coordinates) {
        const isCorrect = !!studyState.correctTags[id]

        if (isCorrect) {
            drawNewText(canvas, studyState.coordinates[id]['name'], studyState.coordinates[id], studyState.scale, studyState.fontSize)
        } else {
            drawNewQuestionMark(canvas, studyState.coordinates[id], studyState.scale, studyState.fontSize)
        }
    }
}

const setupWordBank = () => {
    const wordbank = document.getElementById('study-wordbank')
    const wrap     = document.getElementById('study-wordbank-wrap')
    wordbank.replaceChildren()

    const useWordBank = studyState.difficulty < DIFFICULTY.HARD
    wrap.style.display = useWordBank ? 'block' : 'none'

    if (!useWordBank) {
        return
    }

    for (const id in studyState.coordinates) {
        const span = document.createElement('span')
        span.classList.add('word-chip')
        span.dataset.tagId = id
        span.textContent = studyState.coordinates[id]['name']
        wordbank.appendChild(span)
    }
}

const updateWordBank = () => {
    document.querySelectorAll('#study-wordbank .word-chip').forEach(chip => {
        if (studyState.correctTags[chip.dataset.tagId]) {
            chip.classList.add('used')
        }
    })
}

const updateHintButton = () => {
    const studyHintProgress     = document.getElementById('study-tags-hint')
    const studyHintBtn = document.getElementById('study-hint-btn')
    const useHints = studyState.difficulty === DIFFICULTY.EASY
    studyHintBtn.disabled  = !useHints || studyState.hintsRemaining <= 0
    studyHintProgress.textContent = useHints
        ? `${studyState.hintsRemaining} hints left`
        : 'No hints available'
}

document.getElementById('study-hint-btn').addEventListener('click', () => {
    const answer  = Object.values(studyState.answerTag)[0]

    if (!answer) {
        return
    }

    studyState.hintText = answer.substring(0, studyState.hintText.length + 1)
    studyState.hintsRemaining--
    updateHintButton()
    window.api.popup(`Hint: word starts with "${studyState.hintText}"`)
        .catch(err => console.error(err))
})

// Click on canvas to answer a tag
document.getElementById('study-canvas').addEventListener('click', (e) => {
    const canvas  = document.getElementById('study-canvas')
    const coords  = getClickCoordinates(e, studyState.scale)
    const key     = checkCoordinatesExist(canvas, coords.x, coords.y, studyState.coordinates, studyState.scale, studyState.fontSize,false)

    if (key && !studyState.correctTags[key]) {
        openStudyAnswerModal(key)
    }
})

const studyAnswerModal = new bootstrap.Modal(document.getElementById('study-answer-modal'))

const openStudyAnswerModal = async (tagId) => {
    const tag       = studyState.coordinates[tagId]
    const categoryId = tag['category']
    let prompt      = 'What is this?'

    if (categoryId && categoryId !== 'null') {
        const category = await window.api.getCategoryById(categoryId)
        if (category) {
            prompt = `What is this ${category}?`
        }
    }

    studyState.answerTag = { [tagId]: tag['name'] }
    studyState.hintText  = ''
    document.getElementById('study-answer-modal-label').textContent = prompt
    document.getElementById('study-answer-input').value = ''
    studyAnswerModal.show()
}

document.getElementById('study-answer-submit-btn').addEventListener('click', async () => {
    const input   = document.getElementById('study-answer-input')
    const txt     = input.value.trim()

    if (!txt) {
        return
    }

    const [tagId, answer] = Object.entries(studyState.answerTag)[0]

    if (txt.toLowerCase() === answer.toLowerCase()) {
        studyAnswerModal.hide()
        studyState.correctTags[tagId] = answer
        updateTagsProgress()
        updateWordBank()
        const canvas = document.getElementById('study-canvas')
        clearCanvas(canvas)
        const image  = document.getElementById('study-image')
        await drawNewImage(canvas, image, 0, 0, studyState.scale)
        drawAllQuestionMarks()
        await window.api.popup('Correct!')
    } else {
        await window.api.popup('Not quite — try again.')
    }
})

const updateTagsProgress = () => {
    const total   = Object.keys(studyState.coordinates).length
    const correct = Object.keys(studyState.correctTags).length
    document.getElementById('study-tags-progress').textContent = `${correct} / ${total} tags labeled`
}

document.getElementById('study-next-btn').addEventListener('click', () => {
    loadNextBodyPart().catch(err => {
        console.error(err)
    })
})

document.getElementById('study-prev-btn').addEventListener('click', () => {
    loadPrevBodyPart().catch(err => {
        console.error(err)
    })
})

document.getElementById('study-end-btn').addEventListener('click', async () => {
    try {
        const result = await window.api.dialogQuestion("Are you sure you want to end the current study session?")

        if (result.response === 0) {
            window.AppState.currentChecklistId = null
            await loadStudyPicker()
        }
    } catch (err) {
        console.error(err)
    }
})
