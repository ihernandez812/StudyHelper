
import { registerScreen, navigate } from "./router.js";
import {drawNewImage, drawNewText, drawNewQuestionMark,
    checkCoordinatesExist, getClickCoordinates, redrawSync,
    enableDragOntoCanvas, animateFrames, shakeOffset, SHAKE_DURATION} from "../HTMLUtils/canvasUtils.js"
import {cloneTemplate, getActionTarget, mustGetElementById, createImageUrl, compareNames} from "../HTMLUtils/domUtils.js"
import {PAGES} from "../enums/pages.js"
import {createSessionNav} from "../HTMLUtils/sessionNav.js"
import {createDisplayControls} from "../HTMLUtils/displayControls.js"
import {matchesQuery, paginate, createPager} from "../HTMLUtils/pagination.js"
import {PAGE_SIZE} from "../enums/pageSize.js"
import {TAG_COLORS} from "../enums/tagColors.js"
import {DIFFICULTY} from "../enums/difficulty.js"
import {createSearchCombobox} from "../HTMLUtils/searchCombobox.js"

// ── Study screen ──────────────────────────────────────────────────────────────


// study.js
registerScreen(PAGES.STUDY, {
    sidebar: PAGES.STUDY,
    load: () => loadStudyPicker(),
    teardown: () => {
        clearStudySession();
        clearSelection()
    },
    topbar: { title: 'Study' },
})
const TEMPLATES = {
    pickerItem:        mustGetElementById('tpl-study-picker-item'),
    noChecklistsEmpty: mustGetElementById('tpl-no-checklists-empty'),
    bodyPartListItem:  mustGetElementById('tpl-study-browse-item'),
    selectionChip:     mustGetElementById('tpl-selection-chip'),
    settingsGroup:     mustGetElementById('tpl-study-settings-group'),
    searchCombobox:    mustGetElementById('tpl-search-combobox'),
    displayControls:   mustGetElementById('tpl-display-controls'),
    pager:             mustGetElementById('tpl-pager'),
}

const studyState = {
    bodyParts : [],
    currentBpId:    null,
    coordinates:    {},
    correctTags:    {},
    answerTag:      {},
    hintText:       '',
    hintsRemaining: 3,
    scale:          1,
    fontSize:       16,
    difficulty:     1,
    answeredTags: {},
    dropTarget:     null, // '?' under a dragged chip, drawn highlighted
    wrongDrop:      null, // { key, offsetX } while a wrong drop is shaking
}

const bodyPartSelection = new Map()

// Checklists with more body parts than this get a filter box when expanded
const BROWSE_FILTER_MIN = 10

// Checkboxes Select all acts on: enabled, and not hidden by the filter
const SELECTABLE_CHECKBOX = 'li:not(.hide) .js-checkbox:not(:disabled)'

mustGetElementById('study-picker-list').addEventListener('click', async (e) => {
    //If there are no body parts to study if it is empty and the only thing to be clicked is a navigate to library
    if (e.target.closest('[data-action="go-to-library"]')) {
        navigate(PAGES.LIBRARY)
        return
    }


    const target = getActionTarget(e.target, '.study-picker-item');

    if (!target) {
        return;
    }

    const { id } = target.data;
    const action = target.action;
    const element = target.element;

    try {
        switch (action) {
            case 'all':
                if (await confirmDiscardSelection()) {
                    await loadStudySettings(id)
                }

                break;
            case 'random':
                if (await confirmDiscardSelection()) {
                    await loadRandomBodyStudySession(id);
                }

                break;
            case 'toggle-browse':
                await toggleChecklistRow(id, element);
                break;
            default:
                console.error(`Unknown action "${action}" on checklist row ${id}`);
        }
    } catch (err) {
        console.error(err);
    }
})

mustGetElementById('study-picker-list').addEventListener('change', (e) => {
    const row = e.target.closest('.study-picker-item')

    if (!row) {
        return
    }

    if (e.target.matches('.js-select-all')) {
        row.querySelectorAll(SELECTABLE_CHECKBOX).forEach(checkbox => {
            setSelected(getBrowseItem(checkbox), e.target.checked)
        })
    } else if (e.target.matches('.js-checkbox')) {
        setSelected(getBrowseItem(e.target), e.target.checked)
    }

    onSelectionChanged()
})

mustGetElementById('study-picker-list').addEventListener('input', (e) => {
    if (!e.target.matches('.js-browse-filter')) {
        return
    }

    filterBrowseRows(e.target.closest('.study-picker-item'), e.target.value)
})

const filterBrowseRows = (row, query) => {
    const itemList = row.querySelectorAll('.js-browse-list li')
    let shownCount = 0

    itemList.forEach(item => {
        const isMatch = matchesQuery(item.dataset.bodyPartName, query)
        item.classList.toggle('hide', !isMatch)

        if (isMatch) {
            shownCount++
        }
    })

    row.querySelector('.js-browse-empty').classList.toggle('hide', shownCount > 0)
    row.querySelector('.js-select-all-label').textContent = query.trim() ? 'Select all shown' : 'Select all'
    updateSelectAll(row)
}

// Turns a checkbox's browse row back into a selection entry
const getBrowseItem = (checkbox) => {
    const { checklistId, bodyPartId, bodyPartName, checklistName } = checkbox.closest('li').dataset
    return { checklistId, bodyPartId, bodyPartName, checklistName }
}

// Re-ticks each expanded row's checkboxes from the selection, and refreshes
// every row's "N selected" count (collapsed rows too)
const syncPickerRows = () => {
    document.querySelectorAll('#study-picker-list .study-picker-item').forEach(row => {
        row.querySelectorAll('.js-checkbox').forEach(checkbox => {
            const { checklistId, bodyPartId } = checkbox.closest('li').dataset
            checkbox.checked = bodyPartSelection.has(createSelectionKey(checklistId, bodyPartId))
        })

        updateSelectAll(row)
        updatePickerMeta(row)
    })
}

// "40 body parts" or "40 body parts · 3 selected"
const updatePickerMeta = (row) => {
    const bodyPartCount = Number(row.dataset.bodyPartCount)
    const selectedCount = [...bodyPartSelection.values()]
        .filter(item => item.checklistId === row.dataset.id).length

    let metaText = `${bodyPartCount} body part${bodyPartCount !== 1 ? 's' : ''}`

    if (selectedCount > 0) {
        metaText += ` · ${selectedCount} selected`
    }

    row.querySelector('.js-meta').textContent = metaText
}

const confirmDiscardSelection = async () => {
    if (bodyPartSelection.size === 0) {
        return true
    }

    const count  = bodyPartSelection.size
    const result = await window.api.dialogQuestion(
        `You have ${count} body part${count !== 1 ? 's' : ''} selected.\nStarting this session will clear them.`
    )

    return result.response === 0
}

const updateSelectAll = (row) => {
    const selectAll  = row.querySelector('.js-select-all')
    const selectable = row.querySelectorAll(SELECTABLE_CHECKBOX)
    const checked    = row.querySelectorAll(`${SELECTABLE_CHECKBOX}:checked`)

    selectAll.disabled      = selectable.length === 0
    selectAll.checked       = selectable.length > 0 && checked.length === selectable.length
    selectAll.indeterminate = checked.length > 0 && checked.length < selectable.length
}

// ── Study picker ──────────────────────────────────────────────────────────────

// page isn't reset on load: coming back from a session keeps your place,
// and paginate() clamps it if checklists were deleted in the meantime
const pickerState = {
    checklistList: [],   // [{ id, checklist }] in storage order
    page:          1,
}

const pickerPagerMount = mustGetElementById('study-picker-pager')
pickerPagerMount.appendChild(cloneTemplate(TEMPLATES.pager))

const pickerPager = createPager(pickerPagerMount, {
    onPageChange: (page) => {
        pickerState.page = page
        renderPickerPage()
    },
})

const loadStudyPicker = async () => {
    const picker = document.getElementById('study-picker')
    const active = document.getElementById('study-active')
    picker.classList.remove('hide')
    active.classList.add('hide')

    const checklists = await window.api.getChecklists()
    const keys       = Object.keys(checklists)

    studySearch.reset()
    studySearch.setEntryList(buildSearchEntryList(checklists))
    document.getElementById('study-search').classList.toggle('hide', keys.length === 0)

    pickerState.checklistList = keys.map(id => ({ id, checklist: checklists[id] }))
    renderPickerPage()
}

// Re-rendering the page also closes any open browse panel
const renderPickerPage = () => {
    const pickerList = document.getElementById('study-picker-list')
    const { pageItemList, page, pageCount } = paginate(pickerState.checklistList, pickerState.page, PAGE_SIZE.LIST)

    pickerState.page = page
    pickerList.replaceChildren()
    pickerPager.render({ page, pageCount })

    if (pickerState.checklistList.length === 0) {
        pickerList.appendChild(cloneTemplate(TEMPLATES.noChecklistsEmpty))
        return
    }

    pageItemList.forEach(({ id, checklist }) => {
        pickerList.appendChild(createPickerItem(id, checklist))
    })
}

const createPickerItem = (id, checklist) => {
    const bodyParts = checklist['bodyParts'] || {}
    const bpKeys    = Object.keys(bodyParts)

    const item        = cloneTemplate(TEMPLATES.pickerItem)
    const randomBtn   = item.querySelector('[data-action="random"]')
    const studyAllBtn = item.querySelector('[data-action="all"]')

    item.dataset.id            = id
    item.dataset.bodyPartCount = bpKeys.length
    item.querySelector('.js-name').textContent = checklist['name']
    updatePickerMeta(item)

    const isStudyDisabled = !hasStudiableBodyPart(bodyParts);

    randomBtn.disabled   = isStudyDisabled
    studyAllBtn.disabled = isStudyDisabled

    return item
}

const hasStudiableBodyPart = (bodyPartsList) => {
    let isStudiable = false
    const bodyPartKeys = Object.keys(bodyPartsList)

    if (bodyPartKeys.length > 0) {
        for(let bodyPartKey of bodyPartKeys) {
            const bodyPart = bodyPartsList[bodyPartKey]
            const coordinatesMap = bodyPart['coordinates'] || {}
            const tagCount = Object.keys(coordinatesMap).length

            if (tagCount > 0) {
                isStudiable = true;
                break;
            }
        }
    }

    return isStudiable
}

const createBodyPartItemsFromChecklistId = async (checklistId) => {
    let bodyPartItemList = []

    try {
        const checklist = await window.api.getChecklistById(checklistId)
        const bodyParts = checklist['bodyParts'] || {}
        const bodyPartIdList = Object.keys(bodyParts)

        for (const bodyPartId of bodyPartIdList) {
            const bodyPart = bodyParts[bodyPartId]
            const coordinatesMap = bodyPart['coordinates'] || {}
            const tagCount = Object.keys(coordinatesMap).length

            if (tagCount > 0) {
                bodyPartItemList.push({
                    bodyPartId: bodyPartId,
                    checklistId: checklistId,
                    bodyPartName: bodyPart['name'],
                    checklistName: checklist['name']})
            }
        }
    } catch (err) {
        console.error(err)
    }

    return bodyPartItemList
}

const createRandomBodyPartItemsFromChecklistId = async (checklistId) => {
    let randomBodyPartItemList = []

    try {
        const bodyPartItemList = await createBodyPartItemsFromChecklistId(checklistId)
        let randomBodyPartItem = bodyPartItemList[Math.floor(Math.random() * bodyPartItemList.length)]

        if (randomBodyPartItem) {
            randomBodyPartItemList.push(randomBodyPartItem)
        }
    } catch (err) {
        console.error(err)
    }

    return randomBodyPartItemList
}

const loadStudySettings = async (checklistId) => {
    try {
        const bodyPartItemsList = await createBodyPartItemsFromChecklistId(checklistId)
        await openStudySettings(bodyPartItemsList);
    } catch (err) {
        console.error(err)
    }
}

const loadRandomBodyStudySession = async (checklistId) => {
    try {
        const bodyPartItemList = await createRandomBodyPartItemsFromChecklistId(checklistId)
        await openStudySettings(bodyPartItemList);
    } catch (err) {
        console.error(err)
    }
}

// ── Study settings modal ──────────────────────────────────────────────────────

const studySettingsModal = new bootstrap.Modal(mustGetElementById('study-settings-modal'))
let _pendingBodyPartList = []

// Most body part names listed in the settings modal before "and N more"
const SETTINGS_LIST_MAX = 8

const openStudySettings = async (items) => {
    // Render before shuffling so checklists keep the order they were picked in
    renderStudySettingsList(items)
    _pendingBodyPartList = shuffle(items)
    studySettingsModal.show()
}

const renderStudySettingsList = (items) => {
    const list = document.getElementById('study-settings-list')
    const more = document.getElementById('study-settings-more')

    // Group by checklist, keeping checklists in the order they first appear
    const groups = new Map()

    items.forEach(item => {
        if (!groups.has(item.checklistId)) {
            groups.set(item.checklistId, { checklistName: item.checklistName, bodyPartNames: [] })
        }

        groups.get(item.checklistId).bodyPartNames.push(item.bodyPartName)
    })

    const bodyPartCount  = items.length
    const checklistCount = groups.size
    document.getElementById('study-settings-summary').textContent =
        `${bodyPartCount} body part${bodyPartCount !== 1 ? 's' : ''} from ` +
        `${checklistCount} checklist${checklistCount !== 1 ? 's' : ''}`

    list.replaceChildren()
    let shown = 0

    for (const { checklistName, bodyPartNames } of groups.values()) {
        if (shown >= SETTINGS_LIST_MAX) {
            break
        }

        const names = [...bodyPartNames]
            .sort(compareNames)
            .slice(0, SETTINGS_LIST_MAX - shown)
        shown += names.length

        const group = cloneTemplate(TEMPLATES.settingsGroup)
        group.querySelector('.js-checklist-name').textContent = checklistName
        group.querySelector('.js-bp-names').textContent = names.join(', ')
        list.appendChild(group)
    }

    const hidden = bodyPartCount - shown
    more.textContent = `and ${hidden} more`
    more.classList.toggle('hide', hidden === 0)
}

mustGetElementById('study-settings-save-btn').addEventListener('click', () => {
    studyState.difficulty     = parseInt(document.getElementById('study-difficulty').value)
    studyState.hintsRemaining = studyState.difficulty === DIFFICULTY.EASY ? 3 : 0;
    studySettingsModal.hide()
    beginStudySession(_pendingBodyPartList)
})

// ── Active study session ──────────────────────────────────────────────────────

const studyNav = createSessionNav({
    label:       mustGetElementById('study-progress-label'),
    bar:         mustGetElementById('study-progress-bar'),
    prevBtn:     mustGetElementById('study-prev-btn'),
    nextBtn:     mustGetElementById('study-next-btn'),
    btnGroup:    mustGetElementById('body-part-btn-group'),
    formatLabel: (position, count) => `Body part ${position} of ${count}`,
    onChange:    (index, previousIndex) => showBodyPart(index, previousIndex),
})

// View only, never saved. Goes into studyState because the click and
// drag checks read scale and fontSize from there, so they keep matching
// the pills as drawn.
const studyDisplayMount = mustGetElementById('study-display-controls')
studyDisplayMount.appendChild(cloneTemplate(TEMPLATES.displayControls))

const studyDisplayControls = createDisplayControls(studyDisplayMount, {
    onChange: ({ scale, fontSize }) => {
        studyState.scale    = scale
        studyState.fontSize = fontSize
        redrawStudyAtScale().catch(error => console.error(error))
    },
})

const beginStudySession = (items) => {
    studyState.bodyParts = items
    studyState.correctTags    = {}
    studyState.hintText       = ''
    studyState.answeredTags   = {}
    clearSelection()

    document.getElementById('study-picker').classList.add('hide')
    document.getElementById('study-active').classList.remove('hide')

    studyNav.start(items.length).catch(err => {
        console.error(err)
    })
}

const showBodyPart = async (index, previousIndex) => {
    // Keep what was answered on the body part being left, so coming back restores it
    if (previousIndex != null) {
        const previousItem = studyState.bodyParts[previousIndex]
        const previousKey  = createSelectionKey(previousItem.checklistId, previousItem.bodyPartId)
        studyState.answeredTags[previousKey] = studyState.correctTags
    }

    studyState.correctTags = {}
    studyState.hintText    = ''
    studyState.answerTag   = {}
    studyState.dropTarget  = null
    studyState.wrongDrop   = null

    const item     = studyState.bodyParts[index]
    const bodyPart = await window.api.getBodyPartById(item.bodyPartId)
    studyState.scale       = bodyPart['scale'] || 1
    studyState.fontSize    = bodyPart['fontSize'] || 16
    studyState.coordinates = bodyPart['coordinates'] || {}
    studyState.correctTags = studyState.answeredTags[createSelectionKey(item.checklistId, item.bodyPartId)] || {}
    studyDisplayControls.reset(studyState.scale, studyState.fontSize)

    document.getElementById('study-body-part-name').textContent      = bodyPart['name']
    document.getElementById('study-body-part-checklist').textContent = item.checklistName
    updateTagsProgress()

    const image  = document.getElementById('study-image')
    image.src = createImageUrl(bodyPart['image'])

    try {
        await redrawStudyAtScale()
    } catch (err) {
        console.error(err)
    }

    // Word bank, greying out words already used on this body part
    setupWordBank()
    updateWordBank()
    // Hints
    updateHintButton()
}

// "3 tags", or "No tags yet": shared by the search and the browse rows
const formatTagCount = (tagCount) => {
    if (tagCount === 0) {
        return 'No tags yet'
    }

    return `${tagCount} tag${tagCount !== 1 ? 's' : ''}`
}

const createSelectionKey = (checklistId, bodyPartId) => {
    return `${checklistId}:${bodyPartId}`
}

const setSelected = (item, isSelected) => {
    const key = createSelectionKey(item.checklistId, item.bodyPartId)

    if (isSelected) {
        bodyPartSelection.set(key, item)
    } else {
        bodyPartSelection.delete(key)
    }
}

const clearSelection = () => {
    bodyPartSelection.clear()
    onSelectionChanged()
}

// One place that refreshes everything that shows the selection
const onSelectionChanged = () => {
    syncPickerRows()
    renderSelectionTray()

    studySearch.refresh()
}

// ── Selection tray ────────────────────────────────────────────────────────────

const renderSelectionTray = () => {
    const tray  = document.getElementById('study-selection')
    const chips = document.getElementById('study-selection-chips')
    const items = [...bodyPartSelection.values()]

    chips.replaceChildren()
    tray.classList.toggle('hide', items.length === 0)

    if (items.length === 0) {
        return
    }

    const checklistCount = new Set(items.map(item => item.checklistId)).size
    document.getElementById('study-selection-count').textContent =
        `${items.length} selected from ${checklistCount} checklist${checklistCount !== 1 ? 's' : ''}`

    items.forEach(item => {
        const chip      = cloneTemplate(TEMPLATES.selectionChip)
        const removeBtn = chip.querySelector('[data-action="remove-selection"]')

        chip.dataset.checklistId = item.checklistId
        chip.dataset.bodyPartId  = item.bodyPartId
        chip.querySelector('.js-label').textContent = `${item.bodyPartName} · ${item.checklistName}`
        removeBtn.setAttribute('aria-label', `Remove ${item.bodyPartName}`)

        chips.appendChild(chip)
    })
}

mustGetElementById('study-selection-chips').addEventListener('click', (e) => {
    const target = getActionTarget(e.target, '.selection-chip')

    if (!target || target.action !== 'remove-selection') {
        return
    }

    const { checklistId, bodyPartId } = target.data
    bodyPartSelection.delete(createSelectionKey(checklistId, bodyPartId))
    onSelectionChanged()
})

mustGetElementById('study-selection-clear-btn').addEventListener('click', () => {
    clearSelection()
})

mustGetElementById('study-selection-study-btn').addEventListener('click', () => {
    openStudySettings([...bodyPartSelection.values()]).catch(err => {
        console.error(err)
    })
})

// ── Body part search ──────────────────────────────────────────────────────────

const isBodyPartSelected = (entry) => {
    return bodyPartSelection.has(createSelectionKey(entry.checklistId, entry.bodyPartId))
}

const studySearchMount = mustGetElementById('study-search')
studySearchMount.appendChild(cloneTemplate(TEMPLATES.searchCombobox))

const studySearch = createSearchCombobox(studySearchMount, {
    idPrefix:    'study-search',
    placeholder: 'Search body parts, like femur',
    label:       'Search body parts',
    emptyText:   'No body parts match that search',
    getName:     (entry) => entry.bodyPartName,
    getMeta:     (entry) => `${entry.checklistName} · ${formatTagCount(entry.tagCount)}`,
    isSelected:  isBodyPartSelected,
    isDisabled:  (entry) => entry.tagCount === 0,
    onToggle:    (entry) => {
        const { checklistId, bodyPartId, bodyPartName, checklistName } = entry
        setSelected({ checklistId, bodyPartId, bodyPartName, checklistName }, !isBodyPartSelected(entry))
        onSelectionChanged()
    },
})

// Every body part in every checklist, rebuilt each time the picker loads
const buildSearchEntryList = (checklists) => {
    const entryList = []

    for (const checklistId in checklists) {
        const checklist = checklists[checklistId]
        const bodyParts = checklist['bodyParts'] || {}

        for (const bodyPartId in bodyParts) {
            const bodyPart = bodyParts[bodyPartId]

            entryList.push({
                checklistId,
                bodyPartId,
                bodyPartName:  bodyPart['name'],
                checklistName: checklist['name'],
                tagCount:      Object.keys(bodyPart['coordinates'] || {}).length,
            })
        }
    }

    return entryList
}

// Canvas defaults so existing calls work; redrawSync passes it in
const drawAllQuestionMarks = (canvas = document.getElementById('study-canvas')) => {
    const { scale, fontSize, wrongDrop, dropTarget } = studyState

    for (const id in studyState.coordinates) {
        const coordinates = studyState.coordinates[id]

        if (studyState.correctTags[id]) {
            drawNewText(canvas, coordinates['name'], coordinates, scale, fontSize)
        } else if (wrongDrop?.key === id) {
            const shifted = { x: parseFloat(coordinates['x']) + wrongDrop.offsetX, y: coordinates['y'] }
            drawNewText(canvas, '?', shifted, scale, fontSize, TAG_COLORS.INCORRECT)
        } else if (dropTarget === id) {
            drawNewText(canvas, '?', coordinates, scale, fontSize, TAG_COLORS.DROP_TARGET)
        } else {
            drawNewQuestionMark(canvas, coordinates, scale, fontSize)
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

    // Shuffled so the order doesn't give away where each word goes
    for (const id of shuffle(Object.keys(studyState.coordinates))) {
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

mustGetElementById('study-hint-btn').addEventListener('click', () => {
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

// Label drawn for each tag, so hit areas match the pills on screen
const studyLabel = (tag, id) => studyState.correctTags[id] ? tag['name'] : '?'

// Unanswered tag under an image-space point, or null
const hitUnansweredTag = (point) => {
    const canvas = document.getElementById('study-canvas')
    const key    = checkCoordinatesExist(canvas, point.x, point.y, studyState.coordinates,
        studyState.scale, studyState.fontSize, studyLabel)

    return key && !studyState.correctTags[key] ? key : null
}

// Click on canvas to answer a tag
mustGetElementById('study-canvas').addEventListener('click', async (e) => {
    const key = hitUnansweredTag(getClickCoordinates(e, studyState.scale))

    if (key) {
        try {
            await openStudyAnswerModal(key)
        } catch (err) {
            console.error(err)
        }
    }
})

const studyAnswerModal = new bootstrap.Modal(mustGetElementById('study-answer-modal'))

const openStudyAnswerModal = async (tagId) => {
    const tag       = studyState.coordinates[tagId]
    const categoryId = tag['category']
    let prompt      = 'What is this?'

    if (categoryId) {
        const category = await window.api.getCategoryById(categoryId)

        if (category?.name) {
            prompt = `What is this ${category.name}?`
        }
    }

    studyState.answerTag = { [tagId]: tag['name'] }
    studyState.hintText  = ''
    document.getElementById('study-answer-modal-label').textContent = prompt
    document.getElementById('study-answer-input').value = ''
    studyAnswerModal.show()
}

const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }

    return arr
}

// Checks text against the tag's name and, if it's right, records it and
// redraws. Returns whether it was right; feedback is up to the caller.
const submitAnswer = (tagId, text) => {
    const answer = studyState.coordinates[tagId]['name']

    if (text.trim().toLowerCase() !== answer.toLowerCase()) {
        return false
    }

    studyState.correctTags[tagId] = answer
    updateTagsProgress()
    updateWordBank()
    redrawStudy()

    return true
}

const redrawStudy = () => {
    const canvas = document.getElementById('study-canvas')
    const image  = document.getElementById('study-image')
    redrawSync(canvas, image, drawAllQuestionMarks, studyState.scale)
}

// Repaints at studyState.scale, resizing the canvas to match. redrawSync
// skips the resize, so anything that changes the scale goes through here.
const redrawStudyAtScale = async () => {
    const canvas = document.getElementById('study-canvas')
    const image  = document.getElementById('study-image')

    await drawNewImage(canvas, image, 0, 0, studyState.scale)
    drawAllQuestionMarks(canvas)
}

mustGetElementById('study-answer-submit-btn').addEventListener('click', async () => {
    const txt = document.getElementById('study-answer-input').value.trim()

    if (!txt) {
        return
    }

    const tagId = Object.keys(studyState.answerTag)[0]

    if (submitAnswer(tagId, txt)) {
        studyAnswerModal.hide()
        await window.api.popup('Correct!')
    } else {
        await window.api.popup('Not quite — try again.')
    }
})

// Flashes the '?' red and shakes it. A newer wrong drop or a body part
// change replaces studyState.wrongDrop, which stops this one.
const shakeWrongDrop = async (key) => {
    const shake = { key, offsetX: 0 }
    studyState.wrongDrop = shake

    await animateFrames(SHAKE_DURATION, (progress) => {
        if (studyState.wrongDrop !== shake) {
            return false
        }

        shake.offsetX = shakeOffset(progress, studyState.scale)
        redrawStudy()
    })

    if (studyState.wrongDrop === shake) {
        studyState.wrongDrop = null
        redrawStudy()
    }
}

// Drag a word bank chip onto a '?' to answer it
enableDragOntoCanvas(mustGetElementById('study-wordbank'), mustGetElementById('study-canvas'), {
    selector:      '.word-chip:not(.used)',
    getScale:      () => studyState.scale,
    hitTest:       hitUnansweredTag,
    onHoverChange: (key) => {
        studyState.dropTarget = key
        redrawStudy()
    },
    onDrop: (chip, key) => {
        if (!submitAnswer(key, chip.textContent)) {
            shakeWrongDrop(key).catch(err => console.error(err))
        }
    },
})

const updateTagsProgress = () => {
    const total   = Object.keys(studyState.coordinates).length
    const correct = Object.keys(studyState.correctTags).length
    document.getElementById('study-tags-progress').textContent = `${correct} / ${total} tags labeled`
}

const isStudySessionActive = () => {
    return studyState.bodyParts.length !== 0;
}

const clearStudySession = () => {
    studyState.bodyParts = [];
}

const toggleChecklistRow = async (id, row) => {
    const toggle = row.querySelector('.study-picker-toggle')
    const isExpanded = toggle.getAttribute('aria-expanded');

    if (isExpanded === 'true') {
        collapseChecklistRow(row, toggle);
    } else {
        collapseOpenChecklistRow()
        await expandChecklistRow(id, row, toggle)
    }
}

// The selection lives in bodyPartSelection, so closing a row loses nothing
const collapseOpenChecklistRow = () => {
    const openToggle = document.querySelector('#study-picker-list .study-picker-toggle[aria-expanded="true"]')

    if (openToggle) {
        collapseChecklistRow(openToggle.closest('.study-picker-item'), openToggle)
    }
}

const collapseChecklistRow = (row, toggle) => {
    toggle.setAttribute('aria-expanded', 'false')
    row.querySelector('.js-browse-list').replaceChildren()
    row.querySelector('.js-browse').classList.add('hide')

}

const expandChecklistRow = async (id, row, toggle) => {

    const bodyPartList = row.querySelector('ul.js-browse-list');
    const bodyPartContainer = row.querySelector('.js-browse');
    const checklist = await window.api.getChecklistById(id)

    if (checklist) {
        bodyPartList.replaceChildren()
        const bodyPartMap = checklist.bodyParts || {};

        // Alphabetical. Kept as an array: an object would put its number-like
        // ids back in numeric order no matter how the entries were sorted
        const sortedBodyPartEntryList = Object.entries(bodyPartMap)
            .sort(([, first], [, second]) => compareNames(first['name'], second['name']))

        for (const [bodyPartId, bodyPart] of sortedBodyPartEntryList) {
            const coordinatesMap = bodyPart['coordinates'] || {}
            const tagKeyList  = Object.keys(coordinatesMap);
            const  bodyPartBrowseItem = cloneTemplate(TEMPLATES.bodyPartListItem);

            bodyPartBrowseItem.dataset.checklistId   = id
            bodyPartBrowseItem.dataset.bodyPartId    = bodyPartId
            bodyPartBrowseItem.dataset.bodyPartName  = bodyPart['name']
            bodyPartBrowseItem.dataset.checklistName = checklist['name']
            bodyPartBrowseItem.querySelector('.js-bp-name').textContent = bodyPart['name']

            const checkbox    = bodyPartBrowseItem.querySelector('.js-checkbox')
            checkbox.disabled = tagKeyList.length === 0
            checkbox.checked  = bodyPartSelection.has(createSelectionKey(id, bodyPartId))

            bodyPartBrowseItem.querySelector('.js-tag-count').textContent = formatTagCount(tagKeyList.length)
            bodyPartList.appendChild(bodyPartBrowseItem);
        }

        const filter = row.querySelector('.js-browse-filter')
        filter.value = ''
        filter.classList.toggle('hide', Object.keys(bodyPartMap).length <= BROWSE_FILTER_MIN)
        filterBrowseRows(row, '')   // also runs updateSelectAll

        bodyPartContainer.classList.remove('hide');
        toggle.setAttribute('aria-expanded', 'true');
    }
}

mustGetElementById('study-end-btn').addEventListener('click', async () => {
    try {
        const result = await window.api.dialogQuestion("Are you sure you want to end the current study session?")

        if (result.response === 0) {
            clearStudySession()
            await loadStudyPicker()
        }
    } catch (err) {
        console.error(err)
    }
})


export {
    isStudySessionActive,
}
