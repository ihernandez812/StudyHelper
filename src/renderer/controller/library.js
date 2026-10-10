// ── Library screen ────────────────────────────────────────────────────────────

import {navigate, refreshTopbar, registerScreen, refreshCurrentScreen} from "./router.js";
import {checkCoordinatesExist, getClickCoordinates, redrawEverything, drawBodyPartWithTags,
    enableCanvasDrag, getPillSize, redrawSync, drawTags} from "../HTMLUtils/canvasUtils.js"
import {cloneTemplate, createImageUrl, getActionTarget, mustGetElementById, compareNames} from "../HTMLUtils/domUtils.js"
import {AppState} from "./state.js"
import {PAGES} from "../enums/pages.js"
import {createDisplayControls, DEFAULT_SCALE, DEFAULT_FONT_SIZE} from "../HTMLUtils/displayControls.js"
import {matchesQuery, paginate, createPager, formatMatchCount} from "../HTMLUtils/pagination.js"
import {PAGE_SIZE} from "../enums/pageSize.js"
import {BODY_PART_SORT} from "../enums/bodyPartSort.js"
import {createSearchCombobox} from "../HTMLUtils/searchCombobox.js"
import {COMBOBOX_MODE} from "../enums/comboboxMode.js"

const TEMPLATES = {
    checklistRow:    mustGetElementById('tpl-checklist-row'),
    bodyPartCard:    mustGetElementById('tpl-body-part-card'),
    bodyPartAddCard: mustGetElementById('tpl-body-part-add-card'),
    tagListItem:     mustGetElementById('tpl-tag-list-item'),
    searchCombobox:  mustGetElementById('tpl-search-combobox'),
    noTagsEmpty:     mustGetElementById('tpl-no-tags-empty'),
    categoryItem:    mustGetElementById('tpl-category-item'),
    categoryAddItem: mustGetElementById('tpl-category-add-item'),
    pager:           mustGetElementById('tpl-pager'),
}

// library.js
registerScreen(PAGES.LIBRARY, {
    sidebar: PAGES.LIBRARY,
    load: () => loadLibraryScreen(),
    topbar: {
        title: 'Library',
        actions: () => [
            { label: 'Categories',    icon: 'fa-tags', className: 'btn-ghost',   onClick: openCategoriesModal },
            { label: 'New checklist', icon: 'fa-plus', className: 'btn-primary', onClick: openNewChecklistModal },
        ],
    },
})

// library.js, after the 'library' one
registerScreen(PAGES.CHECKLIST_DETAIL, {
    sidebar: PAGES.LIBRARY,
    load: () => loadChecklistDetail(),
    topbar: {
        breadcrumb: () => [
            { label: 'Library', screen: 'library' },
            { label: AppState.currentChecklistName || '' },
        ],
        actions: () => [
            { label: 'Add body part', icon: 'fa-plus',      className: 'btn-primary',   onClick: () => openBodyPartEditor(null) },
        ],
    },
})

registerScreen(PAGES.BODYPART_EDITOR, {
    sidebar: PAGES.LIBRARY,
    load: () => initBodyPartEditor(),
    topbar: {
        breadcrumb: () => [
            { label: 'Library', screen: 'library' },
            { label: AppState.currentChecklistName || '', screen: 'checklist-detail' },
            { label: AppState.currentBodyPartName || 'New body part' },
        ],
    },
})

mustGetElementById('library-checklist-list').addEventListener('click', async (e) => {
    const target = getActionTarget(e.target, '.checklist-row');

    if (!target) {
        return;
    }

    const { id, name } = target.data;
    const action = target.action;


    try {
        switch (action) {
            case 'open':
                openChecklistDetail(id, name);
                break;
            case 'edit':
                openEditChecklistModal(id, name);
                break
            case 'delete':
                await deleteChecklist(id);
                break;
            default:
                console.error(`Unknown action "${target.action}" on checklist row ${id}`);
        }
    } catch (err) {
        console.error(err)
    }
})

mustGetElementById('body-part-grid').addEventListener('click', async (e) => {
    const target = getActionTarget(e.target, '.body-part-card')

    if (!target) {
        return;
    }

    const { id } = target.data;
    const action = target.action;

    try {
        switch (action) {
            case 'edit':
                openBodyPartEditor(id)
                break;
            case 'delete':
                await  deleteBodyPart(id);
                break;
            case 'add':
                openBodyPartEditor(null)
                break;
            default:
                console.error(`Unknown action "${action}" on body part card ${id}`);
        }
    } catch (err) {
        console.error(err)
    }
})

mustGetElementById('editor-tag-list').addEventListener('click', async (e) => {
    const target = getActionTarget(e.target, '.tag-list-item');

    if (!target) {
        return;
    }

    const { id, name } = target.data;
    const action = target.action;

    try {
        switch (action) {
            case 'edit':
                await openEditTagModal(id)
                break;
            case 'delete':
                await  deleteTag(id, name);
                break;
            default:
                console.error(`Unknown action "${action}" on tag list item ${id}`);
        }
    } catch (err) {
        console.error(err)
    }
})

mustGetElementById('category-list').addEventListener('click', async (e) => {
    const target = getActionTarget(e.target, '.category-item');

    if (!target) {
        return;
    }

    const { id, name } = target.data;
    const action = target.action;

    try {
        switch (action) {
            case 'add':
                await addCategory(name);
                break;
            case 'rename':
                startCategoryRename(id);
                break;
            case 'delete':
                await deleteCategory(id, name);
                break;
            default:
                console.error(`Unknown action "${action}" on category item ${id}`);
        }
    } catch (err) {
        console.error(err)
    }
})



// Kept across visits, so Back from a checklist returns to the same search and page
const libraryListState = {
    checklistList: [],   // [{ id, name, bodyPartCount }]
    query:         '',
    page:          1,
}

const libraryPagerMount = mustGetElementById('library-pager')
libraryPagerMount.appendChild(cloneTemplate(TEMPLATES.pager))

const libraryPager = createPager(libraryPagerMount, {
    onPageChange: (page) => {
        libraryListState.page = page
        renderLibraryPage()
    },
})

// Searching starts over from page 1
mustGetElementById('library-search-input').addEventListener('input', (e) => {
    libraryListState.query = e.target.value
    libraryListState.page  = 1
    renderLibraryPage()
})

const loadLibraryScreen = async () => {
    const checklists = await window.api.getChecklists()

    libraryListState.checklistList = Object.keys(checklists).map(id => ({
        id,
        name:          checklists[id]['name'],
        bodyPartCount: Object.keys(checklists[id]['bodyParts'] || {}).length,
    }))

    document.getElementById('library-search-input').value = libraryListState.query
    renderLibraryPage()
}

const renderLibraryPage = () => {
    const { checklistList, query } = libraryListState
    const matchList = checklistList.filter(checklist => matchesQuery(checklist.name, query))
    const { pageItemList, page, pageCount } = paginate(matchList, libraryListState.page, PAGE_SIZE.LIST)

    libraryListState.page = page

    const rowList = pageItemList.map(checklist =>
        createLibraryRow(checklist.id, checklist.name, checklist.bodyPartCount))

    document.getElementById('library-checklist-list').replaceChildren(...rowList)
    libraryPager.render({ page, pageCount })

    const hasChecklists = checklistList.length > 0

    document.getElementById('library-toolbar').classList.toggle('hide', !hasChecklists)
    document.getElementById('library-empty').classList.toggle('hide', hasChecklists)
    document.getElementById('library-no-matches').classList.toggle('hide', !hasChecklists || matchList.length > 0)
    document.getElementById('library-count').textContent =
        formatMatchCount(matchList.length, checklistList.length, 'checklist')
}

const createLibraryRow = (id, name, partCount) => {
    const row = cloneTemplate(TEMPLATES.checklistRow)

    row.dataset.id   = id
    row.dataset.name = name
    row.querySelector('.js-name').textContent = name
    row.querySelector('.js-meta').textContent = `${partCount} body part${partCount !== 1 ? 's' : ''}`
    return row
}

const openChecklistDetail = (id, name) => {
    AppState.currentChecklistId   = id
    AppState.currentChecklistName = name
    navigate(PAGES.CHECKLIST_DETAIL)
}

// ── Checklist modal (add/edit) ────────────────────────────────────────────────

let _editingChecklistId = null
const checklistModal = new bootstrap.Modal(mustGetElementById('checklist-modal'))

const openNewChecklistModal = () => {
    _editingChecklistId = null
    document.getElementById('checklist-modal-label').textContent = 'New checklist'
    document.getElementById('checklist-name-input').value = ''
    checklistModal.show()
}

const openEditChecklistModal = (id, name) => {
    _editingChecklistId = id
    document.getElementById('checklist-modal-label').textContent = 'Rename checklist'
    document.getElementById('checklist-name-input').value = name
    checklistModal.show()
}

mustGetElementById('checklist-save-btn').addEventListener('click', async () => {
    const name = document.getElementById('checklist-name-input').value.trim()

    if (!name) {
        return
    }

    await window.api.addOrEditChecklistById(_editingChecklistId, { name })

    checklistModal.hide()
    await loadLibraryScreen()
})

const deleteChecklist = async (id) => {
    const result = await window.api.dialogQuestion('Delete this checklist and all its body parts?')

    if (result.response === 0) {
        await window.api.deleteChecklistById(id)
        await refreshCurrentScreen()
    }
}

// ── Checklist detail screen ───────────────────────────────────────────────────
const compareByName = (first, second) => compareNames(first.name, second.name)

// Ties on tag count fall back to name, so the order never jumps around
const BODY_PART_COMPARATORS = {
    [BODY_PART_SORT.NAME]:        compareByName,
    [BODY_PART_SORT.MOST_TAGS]:   (first, second) => second.tagCount - first.tagCount || compareByName(first, second),
    [BODY_PART_SORT.FEWEST_TAGS]: (first, second) => first.tagCount - second.tagCount || compareByName(first, second),
}

// The Add card takes one slot on every page, so each page is still a full grid
const BODY_PARTS_PER_PAGE = PAGE_SIZE.GRID - 1

// Search, sort and page survive a trip to the editor and back, and reset
// when a different checklist is opened
const bodyPartGridState = {
    checklistId:  null,
    bodyPartList: [],   // [{ id, name, tagCount, tagNameList }]
    query:        '',
    sort:         BODY_PART_SORT.NAME,
    page:         1,
}

const bodyPartPagerMount = mustGetElementById('body-part-pager')
bodyPartPagerMount.appendChild(cloneTemplate(TEMPLATES.pager))

const bodyPartPager = createPager(bodyPartPagerMount, {
    onPageChange: (page) => {
        bodyPartGridState.page = page
        renderBodyPartPage()
    },
})

mustGetElementById('body-part-search-input').addEventListener('input', (e) => {
    bodyPartGridState.query = e.target.value
    bodyPartGridState.page  = 1
    renderBodyPartPage()
})

mustGetElementById('body-part-sort').addEventListener('change', (e) => {
    bodyPartGridState.sort = e.target.value
    bodyPartGridState.page = 1
    renderBodyPartPage()
})

const loadChecklistDetail = async () => {
    const id        = AppState.currentChecklistId
    const checklist = await window.api.getChecklistById(id)

    if (!checklist) {
        return
    }

    if (bodyPartGridState.checklistId !== id) {
        bodyPartGridState.checklistId = id
        bodyPartGridState.query       = ''
        bodyPartGridState.sort        = BODY_PART_SORT.NAME
        bodyPartGridState.page        = 1
    }

    const bodyParts = checklist['bodyParts'] || {}

    bodyPartGridState.bodyPartList = Object.keys(bodyParts).map(bodyPartId => {
        const bodyPart       = bodyParts[bodyPartId]
        const coordinatesMap = bodyPart['coordinates'] || {}

        return {
            id:          bodyPartId,
            name:        bodyPart['name'],
            tagCount:    Object.keys(coordinatesMap).length,
            tagNameList: Object.values(coordinatesMap).map(tag => tag['name']),
        }
    })

    document.getElementById('body-part-search-input').value = bodyPartGridState.query
    document.getElementById('body-part-sort').value         = bodyPartGridState.sort
    renderBodyPartPage()
}

// Matches the body part's own name or any of its tags ("deltoid" finds the arm)
const matchesBodyPart = (bodyPart, query) => {
    return matchesQuery(bodyPart.name, query) ||
        bodyPart.tagNameList.some(tagName => matchesQuery(tagName, query))
}

const renderBodyPartPage = () => {
    const { bodyPartList, query, sort } = bodyPartGridState
    const matchList = bodyPartList
        .filter(bodyPart => matchesBodyPart(bodyPart, query))
        .sort(BODY_PART_COMPARATORS[sort])
    const { pageItemList, page, pageCount } = paginate(matchList, bodyPartGridState.page, BODY_PARTS_PER_PAGE)

    bodyPartGridState.page = page

    const cardList = pageItemList.map(bodyPart =>
        createBodyPartCard(bodyPart.id, bodyPart.name, bodyPart.tagCount))

    document.getElementById('body-part-grid').replaceChildren(cloneTemplate(TEMPLATES.bodyPartAddCard), ...cardList)
    bodyPartPager.render({ page, pageCount })

    const hasBodyParts = bodyPartList.length > 0

    document.getElementById('body-part-toolbar').classList.toggle('hide', !hasBodyParts)
    document.getElementById('body-part-empty').classList.toggle('hide', hasBodyParts)
    document.getElementById('body-part-no-matches').classList.toggle('hide', !hasBodyParts || matchList.length > 0)
    document.getElementById('body-part-count').textContent =
        formatMatchCount(matchList.length, bodyPartList.length, 'body part')
}

const createBodyPartCard = (id, name, tagCount) => {
    const card = cloneTemplate(TEMPLATES.bodyPartCard)

    card.dataset.id   = id
    card.dataset.name = name
    card.querySelector('.js-name').textContent = name
    card.querySelector('.js-meta').textContent = `${tagCount} tag${tagCount !== 1 ? 's' : ''}`

    return card
}

const deleteBodyPart = async (id) => {
    const result = await window.api.dialogQuestion('Delete this body part?')

    if (result.response === 0) {
        await window.api.removeBodyPart(id)
        await refreshCurrentScreen()
    }
}

// ── Body part editor ──────────────────────────────────────────────────────────
let editorState = {
    coordinatesMap: {},
    resizeScale:    DEFAULT_SCALE,
    fontSize:       DEFAULT_FONT_SIZE,
    currentTagId:   null,
    isEdit:         false,
    // Set only when the user drops a new image. img.src is display-only and
    // normalizes what you assign to it, so it can't be read back as state.
    pendingImageDataUrl: null,
}

const openBodyPartEditor = (bodyPartId) => {
    AppState.currentBodyPartId   = bodyPartId
    AppState.currentBodyPartName = bodyPartId ? null : null // set after load
    navigate(PAGES.BODYPART_EDITOR)
}

const initBodyPartEditor = async () => {
    // Reset state
    editorState = { coordinatesMap: {}, resizeScale: DEFAULT_SCALE, fontSize: DEFAULT_FONT_SIZE, currentTagId: null, isEdit: false, pendingImageDataUrl: null }
    editorDisplayControls.reset(editorState.resizeScale, editorState.fontSize)
    renderTagList()

    const bpId        = AppState.currentBodyPartId
    const nameInput   = document.getElementById('editor-name')
    const image       = document.getElementById('editor-image')
    const canvas      = document.getElementById('editor-canvas')
    const dropHint    = document.getElementById('editor-drop-hint')

    nameInput.value = ''
    image.style.display = 'none'
    canvas.style.display = 'none'
    dropHint.style.display = 'flex'

    if (bpId) {
        editorState.isEdit = true
        const bp = await window.api.getBodyPartById(bpId)
        nameInput.value             = bp['name']
        editorState.coordinatesMap  = bp['coordinates'] || {}
        editorState.resizeScale     = bp['scale'] || DEFAULT_SCALE
        editorState.fontSize        = bp['fontSize'] || DEFAULT_FONT_SIZE
        AppState.currentBodyPartName = bp['name']
        editorDisplayControls.reset(editorState.resizeScale, editorState.fontSize)

        image.style.display = 'none'
        dropHint.style.display = 'none'
        canvas.style.display = 'block'

        image.src = createImageUrl(bp['image'])

        try {
            await drawBodyPartWithTags(canvas, image, editorState.coordinatesMap, editorState.fontSize, editorState.resizeScale)
        } catch (err) {
            console.error(err)
        }

        renderTagList()

        refreshTopbar()
    }
}

// Drag and drop image onto canvas
const dropZone = mustGetElementById('editor-drop-zone')
dropZone.addEventListener('dragover', e => e.preventDefault())
dropZone.addEventListener('drop', e => {
    e.preventDefault()
    e.stopPropagation()

    if (editorState.isEdit) {
        return
    }

    const file = e.dataTransfer.files[0]

    if (!file || !file.type.startsWith('image/')) {
        return
    }

    const reader = new FileReader()
    reader.onload = async (evt) => {
        editorState.pendingImageDataUrl = evt.target.result

        const image   = document.getElementById('editor-image')
        const canvas  = document.getElementById('editor-canvas')
        const dropHint = document.getElementById('editor-drop-hint')
        image.style.display = 'none'
        dropHint.style.display = 'none'
        canvas.style.display = 'block'
        image.src = evt.target.result

        try {
            await drawBodyPartWithTags(canvas, image, editorState.coordinatesMap, editorState.fontSize, editorState.resizeScale)
        } catch (err) {
            console.error(err)
        }
    }

    reader.readAsDataURL(file)
})

// Right-click on canvas to add/edit tag
mustGetElementById('editor-canvas').addEventListener('contextmenu', async (e) => {
    const canvas = document.getElementById('editor-canvas')
    const coords = getClickCoordinates(e, editorState.resizeScale)
    const existingKey = checkCoordinatesExist(canvas, coords.x, coords.y, editorState.coordinatesMap, editorState.resizeScale, editorState.fontSize, tag => tag['name'])

    if (!existingKey) {
        await openNewTagModal(coords)
    }
})

// Left-drag a tag to move it
const editorCanvas = mustGetElementById('editor-canvas')

const redrawEditorSync = () => {
    const image = document.getElementById('editor-image')
    redrawSync(editorCanvas, image,
        c => drawTags(c, editorState.coordinatesMap, editorState.fontSize, editorState.resizeScale),
        editorState.resizeScale)
}

enableCanvasDrag(editorCanvas, {
    getScale:    () => editorState.resizeScale,
    hitTest:     (point) => checkCoordinatesExist(editorCanvas, point.x, point.y, editorState.coordinatesMap,
                     editorState.resizeScale, editorState.fontSize, tag => tag['name']),
    getPosition: (key) => editorState.coordinatesMap[key],
    getSize:     (key) => getPillSize(editorCanvas, editorState.coordinatesMap[key]['name'],
                     editorState.fontSize, editorState.resizeScale),
    onDragMove:  (key, pos) => {
        const tag = editorState.coordinatesMap[key]
        tag.x = pos.x
        tag.y = pos.y
        redrawEditorSync()
    },
})

// Display controls: unlike the session screens, these are saved with the body part
const editorDisplayControls = createDisplayControls(mustGetElementById('editor-display-controls'), {
    onChange: ({ scale, fontSize }) => {
        editorState.resizeScale = scale
        editorState.fontSize    = fontSize
        redrawEditor()
    },
})

const redrawEditor = () => {
    const canvas = document.getElementById('editor-canvas')
    const image  = document.getElementById('editor-image')
    redrawEverything(canvas, image, editorState.coordinatesMap, editorState.fontSize, editorState.resizeScale)
        .catch(err => console.log(err))
}

// Tag modal
const editorTagModal = new bootstrap.Modal(mustGetElementById('editor-tag-modal'))
let _pendingTagCoords = null

// ── Tag modal category picker ─────────────────────────────────────────────────

let tagCategoryId = null   // picked in the tag modal; null for none

const tagCategoryMount = mustGetElementById('editor-tag-category')
tagCategoryMount.appendChild(cloneTemplate(TEMPLATES.searchCombobox))

const tagCategoryPicker = createSearchCombobox(tagCategoryMount, {
    mode:        COMBOBOX_MODE.SINGLE,
    idPrefix:    'editor-tag-category',
    placeholder: 'None. Type to find or create one',
    label:       'Category',
    emptyText:   'No categories yet. Type a name to create one',
    getName:     (category) => category.name,
    getMeta:     (category) => formatCategoryTagCount(category.tagCount),
    isDisabled:  () => false,
    onSelect:    (category) => {
        tagCategoryId = category ? category.id : null
    },
    onCreate:    async (name) => {
        const id = await window.api.addOrEditCategoryById(null, { name })
        return { id, name, tagCount: 0 }
    },
})

// Fresh list each time the modal opens, so categories added or renamed in the
// Categories modal show up. A category that's since been deleted shows as none.
const loadTagCategoryPicker = async (categoryId) => {
    const categoryList     = Object.values(await window.api.getCategories())
    const selectedCategory = categoryList.find(category => category.id === categoryId) ?? null

    tagCategoryPicker.setEntryList(categoryList)
    tagCategoryPicker.setSelectedEntry(selectedCategory)
    tagCategoryId = selectedCategory ? selectedCategory.id : null
}

const openNewTagModal = async (coords) => {
    _pendingTagCoords = coords
    editorState.currentTagId = null
    document.getElementById('editor-tag-modal-label').textContent = 'New tag'
    document.getElementById('editor-tag-name').value = ''
    await loadTagCategoryPicker(null)
    editorTagModal.show()
}

const openEditTagModal = async (tagId) => {
    editorState.currentTagId = tagId
    const tag = editorState.coordinatesMap[tagId]
    document.getElementById('editor-tag-modal-label').textContent = 'Edit tag'
    document.getElementById('editor-tag-name').value = tag['name']
    await loadTagCategoryPicker(tag['category'])
    editorTagModal.show()
}

const deleteTag = async (tagId, tagName) => {
    const result = await window.api.dialogQuestion(`Delete tag "${tagName}"?`)

    if (result.response === 0) {
        if (tagId != null) {
            delete editorState.coordinatesMap[tagId]
            redrawEditor()
            renderTagList()
        }
    }
}

// Unsaved tags need a key in coordinatesMap before the database has given them
// an id. bodyPartStorage inserts any key that isn't an existing tag id.
let newTagCount = 0

const createNewTagKey = () => {
    newTagCount++
    return `new-${newTagCount}`
}

mustGetElementById('editor-tag-save-btn').addEventListener('click', async () => {
    const name = document.getElementById('editor-tag-name').value.trim()

    if (!name) {
        return
    }

    const tagId = editorState.currentTagId || createNewTagKey()
    const coords = editorState.currentTagId
        ? editorState.coordinatesMap[editorState.currentTagId]
        : _pendingTagCoords

    editorState.coordinatesMap[tagId] = { ...coords, name, category: tagCategoryId || undefined }
    editorTagModal.hide()
    redrawEditor()
    renderTagList()
})

const renderTagList = () => {
    const list  = document.getElementById('editor-tag-list')
    const count = document.getElementById('editor-tag-count')
    const tags  = editorState.coordinatesMap
    list.replaceChildren()
    const keys = Object.keys(tags)
    count.textContent = keys.length.toString()

    if (keys.length === 0) {
        list.appendChild(cloneTemplate(TEMPLATES.noTagsEmpty))
        return
    }

    keys.forEach(id => {
        const tagName = tags[id]['name']
        const li      = cloneTemplate(TEMPLATES.tagListItem)

        li.dataset.id = id
        li.dataset.name = tagName
        li.querySelector('.js-name').textContent = tagName

        list.appendChild(li)
    })
}

// Save body part
mustGetElementById('editor-save-btn').addEventListener('click', async () => {
    const name    = document.getElementById('editor-name').value.trim()

    if (!name) {
        await window.api.popup('Please enter a body part name.')
        return
    }

    if (!editorState.isEdit && !editorState.pendingImageDataUrl) {
        await window.api.popup('Please add an image before saving.')
        return
    }

    const bodyPart = {
        name:        name,
        coordinates: editorState.coordinatesMap,
        scale:       editorState.resizeScale,
        fontSize:    Number(editorState.fontSize),
    }

    // Omit image entirely when unchanged; the main process keeps what's on disk.
    if (editorState.pendingImageDataUrl) {
        bodyPart.image = editorState.pendingImageDataUrl
    }

    // A null id creates the body part
    await window.api.addOrEditBodyPartById(AppState.currentBodyPartId, AppState.currentChecklistId, bodyPart)
    navigate(PAGES.CHECKLIST_DETAIL)
})

// ── Categories modal ──────────────────────────────────────────────────────────
const categoriesModal = new bootstrap.Modal(mustGetElementById('categories-modal'))

const categoryModalState = {
    categoryList: [],    // [{ id, name, tagCount }], sorted by name
    query:        '',
    renamingId:   null,  // the row showing a rename box, or null
}

// Names are unique ignoring case and surrounding spaces: "Nerve" blocks " nerve"
const findCategoryByName = (name) => {
    const nameLower = name.trim().toLowerCase()
    return categoryModalState.categoryList.find(category => category.name.toLowerCase() === nameLower)
}

const openCategoriesModal = async () => {
    categoryModalState.query      = ''
    categoryModalState.renamingId = null
    document.getElementById('category-find-input').value = ''

    await loadCategoryList()
    categoriesModal.show()
}

// Focus the box once the modal has finished opening, so typing works straight away
mustGetElementById('categories-modal').addEventListener('shown.bs.modal', () => {
    document.getElementById('category-find-input').focus()
})

const loadCategoryList = async () => {
    const categories = await window.api.getCategories()

    categoryModalState.categoryList = Object.values(categories)
        .sort((first, second) => compareNames(first.name, second.name))

    renderCategoryList()
}

const renderCategoryList = () => {
    const { categoryList, query } = categoryModalState
    const typedText = query.trim()
    const matchList = categoryList.filter(category => matchesQuery(category.name, query))
    const rowList   = matchList.map(createCategoryItem)

    if (typedText && !findCategoryByName(typedText)) {
        rowList.push(createCategoryAddItem(typedText))
    }

    document.getElementById('category-list').replaceChildren(...rowList)
    document.getElementById('category-list-empty').classList.toggle('hide', categoryList.length > 0 || Boolean(typedText))
}

// "Not used yet", "1 tag", "14 tags"
const formatCategoryTagCount = (tagCount) => {
    if (tagCount === 0) {
        return 'Not used yet'
    }

    return `${tagCount} tag${tagCount !== 1 ? 's' : ''}`
}

const createCategoryItem = (category) => {
    const li          = cloneTemplate(TEMPLATES.categoryItem)
    const isRenaming  = category.id === categoryModalState.renamingId
    const renameInput = li.querySelector('.js-rename-input')

    li.dataset.id   = category.id
    li.dataset.name = category.name
    li.querySelector('.js-name').textContent = category.name
    li.querySelector('.js-meta').textContent = formatCategoryTagCount(category.tagCount)

    li.querySelector('.js-name').classList.toggle('hide', isRenaming)
    renameInput.classList.toggle('hide', !isRenaming)
    renameInput.value = category.name

    return li
}

const createCategoryAddItem = (name) => {
    const li = cloneTemplate(TEMPLATES.categoryAddItem)

    li.dataset.name = name
    li.querySelector('.js-name').textContent = `Add "${name}"`

    return li
}

const categoryFindInput = mustGetElementById('category-find-input')

categoryFindInput.addEventListener('input', () => {
    categoryModalState.query      = categoryFindInput.value
    categoryModalState.renamingId = null
    renderCategoryList()
})

// Enter adds what's typed, unless a category already has that name
categoryFindInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') {
        return
    }

    e.preventDefault()
    addCategory(categoryFindInput.value).catch(error => console.error(error))
})

const addCategory = async (name) => {
    const trimmedName = name.trim()

    if (!trimmedName || findCategoryByName(trimmedName)) {
        return
    }

    await window.api.addOrEditCategoryById(null, { name: trimmedName })

    categoryModalState.query = ''
    categoryFindInput.value  = ''
    await loadCategoryList()
}

const startCategoryRename = (id) => {
    categoryModalState.renamingId = id
    renderCategoryList()

    const renameInput = document.querySelector(`#category-list [data-id="${id}"] .js-rename-input`)
    renameInput.focus()
    renameInput.select()
}

const stopCategoryRename = () => {
    categoryModalState.renamingId = null
    renderCategoryList()
}

// Enter or leaving the box saves; Escape cancels. A blank or unchanged
// name just cancels. A name another category has keeps the box open.
const saveCategoryRename = async (renameInput) => {
    const id          = categoryModalState.renamingId
    const category    = categoryModalState.categoryList.find(item => item.id === id)
    const trimmedName = renameInput.value.trim()

    if (!category || !trimmedName || trimmedName === category.name) {
        stopCategoryRename()
        return
    }

    const existingCategory = findCategoryByName(trimmedName)

    if (existingCategory && existingCategory.id !== id) {
        renameInput.classList.add('is-invalid')
        renameInput.title = `"${existingCategory.name}" already exists`
        return
    }

    categoryModalState.renamingId = null
    await window.api.addOrEditCategoryById(id, { name: trimmedName })
    await loadCategoryList()
}

const categoryList = mustGetElementById('category-list')

categoryList.addEventListener('keydown', (e) => {
    if (!e.target.matches('.js-rename-input')) {
        return
    }

    if (e.key === 'Enter') {
        e.preventDefault()
        saveCategoryRename(e.target).catch(error => console.error(error))
    } else if (e.key === 'Escape') {
        // Stops Bootstrap closing the whole modal
        e.stopPropagation()
        stopCategoryRename()
    }
})

// focusout bubbles, unlike blur. renamingId is already null after Enter or
// Escape, so this only saves when you click away.
categoryList.addEventListener('focusout', (e) => {
    if (e.target.matches('.js-rename-input') && categoryModalState.renamingId !== null) {
        saveCategoryRename(e.target).catch(error => console.error(error))
    }
})

categoryList.addEventListener('input', (e) => {
    if (e.target.matches('.js-rename-input')) {
        e.target.classList.remove('is-invalid')
        e.target.removeAttribute('title')
    }
})

const deleteCategory = async (id, name) => {
    const category = categoryModalState.categoryList.find(item => item.id === id)
    const tagCount = category?.tagCount ?? 0

    const message = tagCount > 0
        ? `${tagCount} tag${tagCount !== 1 ? 's use' : ' uses'} "${name}". They'll keep their names but lose the category.\nDelete it?`
        : `Delete the category "${name}"?`

    const result = await window.api.dialogQuestion(message)

    if (result.response === 0) {
        await window.api.removeCategory(id)
        await loadCategoryList()
    }
}
