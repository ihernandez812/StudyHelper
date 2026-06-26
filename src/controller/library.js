// ── Library screen ────────────────────────────────────────────────────────────

const loadLibraryScreen = async () => {
    const checklists = await window.api.getChecklists()
    const list       = document.getElementById('library-checklist-list')
    const emptyState = document.getElementById('library-empty')

    Array.from(list.children).forEach(c => { if (c.id !== 'library-empty') c.remove() })

    const keys = Object.keys(checklists)

    if (keys.length === 0) {
        emptyState.classList.remove('hide')
        return
    }

    emptyState.classList.add('hide')

    keys.forEach(id => {
        const checklist = checklists[id]
        const partCount = Object.keys(checklist['bodyParts'] || {}).length
        list.appendChild(createLibraryRow(id, checklist['name'], partCount))
    })
}

const createLibraryRow = (id, name, partCount) => {
    const li = document.createElement('li')
    li.classList.add('checklist-row')
    li.innerHTML = `
        <div class="checklist-info">
            <h4>${name}</h4>
            <span>${partCount} body part${partCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="checklist-actions">
            <button class="btn btn-secondary open-btn">Open</button>
            <button class="btn btn-ghost btn-icon edit-btn" title="Rename">
                <i class="fas fa-pen"></i>
            </button>
            <button class="btn btn-ghost btn-icon delete-btn" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>`

    li.querySelector('.open-btn').addEventListener('click', () => openChecklistDetail(id, name))
    li.querySelector('.edit-btn').addEventListener('click', () => openEditChecklistModal(id, name))
    li.querySelector('.delete-btn').addEventListener('click', () => deleteChecklist(id, li))

    return li
}

const openChecklistDetail = (id, name) => {
    window.AppState.currentChecklistId   = id
    window.AppState.currentChecklistName = name
    navigate('checklist-detail')
}

// ── Checklist modal (add/edit) ────────────────────────────────────────────────

let _editingChecklistId = null
const checklistModal = new bootstrap.Modal(document.getElementById('checklist-modal'))

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

document.getElementById('checklist-save-btn').addEventListener('click', async () => {
    const name = document.getElementById('checklist-name-input').value.trim()

    if (!name) {
        return
    }

    if (_editingChecklistId) {
        const checklist = await window.api.getChecklistById(_editingChecklistId)
        checklist['name'] = name
        await window.api.addOrEditChecklistById(_editingChecklistId, checklist)
    } else {

        await window.api.addOrEditChecklistById(null, { name, bodyParts: {} })
    }

    checklistModal.hide()
    await loadLibraryScreen()
})

const deleteChecklist = async (id, rowElement) => {
    const result = await window.api.dialogQuestion('Delete this checklist and all its body parts?')

    if (result.response === 0) {
        await window.api.deleteChecklistById(id)
        rowElement.remove()

        // Refresh stats on home if empty now
        const remaining = Object.keys(await window.api.getChecklists())

        if (remaining.length === 0) {
            document.getElementById('library-empty').classList.remove('hide')
        }
    }
}

// ── Checklist detail screen ───────────────────────────────────────────────────
const loadChecklistDetail = async () => {
    const id        = window.AppState.currentChecklistId
    const checklist = await window.api.getChecklistById(id)

    if (!checklist) {
        return
    }

    const grid       = document.getElementById('body-part-grid')
    const emptyState = document.getElementById('body-part-empty')

    // Clear previous cards (keep empty state)
    Array.from(grid.children).forEach(c => { if (c.id !== 'body-part-empty') c.remove() })

    const bodyParts = checklist['bodyParts'] || {}
    const keys      = Object.keys(bodyParts)

    if (keys.length === 0) {
        emptyState.classList.remove('hide')
    } else {
        emptyState.classList.add('hide')
        keys.forEach(bpId => {
            const bp   = bodyParts[bpId]
            const tags = Object.keys(bp['coordinates'] || {}).length
            grid.appendChild(createBodyPartCard(bpId, bp['name'], tags))
        })
    }

    // Add the "add body part" card at the end
    const addCard = document.createElement('div')
    addCard.classList.add('body-part-card', 'body-part-card--add')
    addCard.innerHTML = `<i class="fas fa-plus"></i><span>Add body part</span>`
    addCard.addEventListener('click', () => openBodyPartEditor(null))
    grid.appendChild(addCard)
}

const createBodyPartCard = (id, name, tagCount) => {
    const card = document.createElement('div')
    card.classList.add('body-part-card')
    card.innerHTML = `
        <div class="body-part-card-content">
            <h4>${name}</h4>
            <span>${tagCount} tag${tagCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="body-part-card-actions">
            <button class="btn btn-secondary btn-sm edit-btn"><i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-ghost btn-icon delete-btn"><i class="fas fa-trash"></i></button>
        </div>`

    card.querySelector('.edit-btn').addEventListener('click', () => openBodyPartEditor(id))
    card.querySelector('.delete-btn').addEventListener('click', () => deleteBodyPart(id, card))
    return card
}

const deleteBodyPart = async (id, cardElement) => {
    const result = await window.api.dialogQuestion('Delete this body part?')

    if (result.response === 0) {
        await window.api.removeBodyPart(id, window.AppState.currentChecklistId)
        cardElement.remove()
        const grid = document.getElementById('body-part-grid')
        const cards = grid.querySelectorAll('.body-part-card:not(.body-part-card--add)')
        if (cards.length === 0) {
            document.getElementById('body-part-empty').classList.remove('hide')
        }
    }
}

// ── Body part editor ──────────────────────────────────────────────────────────
let editorState = {
    coordinatesMap: {},
    resizeScale:    1,
    fontSize:       16,
    currentTagId:   null,
    isEdit:         false,
}

const openBodyPartEditor = (bodyPartId) => {
    window.AppState.currentBodyPartId   = bodyPartId
    window.AppState.currentBodyPartName = bodyPartId ? null : null // set after load
    navigate('bodypart-editor')
}

const initBodyPartEditor = async () => {
    // Reset state
    editorState = { coordinatesMap: {}, resizeScale: 1, fontSize: 16, currentTagId: null, isEdit: false }
    updateScaleLabel()
    renderTagList()

    const bpId        = window.AppState.currentBodyPartId
    const checklistId = window.AppState.currentChecklistId
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
        const bp = await window.api.getBodyPartById(bpId, checklistId)
        nameInput.value             = bp['name']
        editorState.coordinatesMap  = bp['coordinates'] || {}
        editorState.resizeScale     = bp['scale'] || 1
        editorState.fontSize        = bp['fontSize'] || 16
        window.AppState.currentBodyPartName = bp['name']

        const fontSelect = document.getElementById('editor-font-size')
        fontSelect.value = editorState.fontSize

        image.style.display = 'none'
        dropHint.style.display = 'none'
        canvas.style.display = 'block'

        image.onload = () => {
            drawBodyPartWithTags(canvas, image, editorState.coordinatesMap, editorState.fontSize, editorState.resizeScale)
        }
        image.src = bp['image']

        if (image.complete && image.naturalWidth > 0) {
            image.onload()
        }

        updateScaleLabel()
        renderTagList()

        // Refresh topbar breadcrumb now that we have the name
        setTopbar(TOPBAR['bodypart-editor'].left(), TOPBAR['bodypart-editor'].right())
    }
}

// Drag and drop image onto canvas
const dropZone = document.getElementById('editor-drop-zone')
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
        const image   = document.getElementById('editor-image')
        const canvas  = document.getElementById('editor-canvas')
        const dropHint = document.getElementById('editor-drop-hint')
        image.style.display = 'none'
        dropHint.style.display = 'none'
        canvas.style.display = 'block'

        image.onload = () => {
            drawBodyPartWithTags(canvas, image, editorState.coordinatesMap, editorState.fontSize, editorState.resizeScale)
        }

        image.src = evt.target.result

    }

    reader.readAsDataURL(file)
})

// Right-click on canvas to add/edit tag
document.getElementById('editor-canvas').addEventListener('contextmenu', async (e) => {
    const canvas = document.getElementById('editor-canvas')
    const coords = getClickCoordinates(e, editorState.resizeScale)
    const existingKey = checkCoordinatesExist(canvas, coords.x, coords.y, editorState.coordinatesMap, editorState.resizeScale, editorState.fontSize, true, false)
    await populateCategorySelect('editor-tag-category')

    if (!existingKey) {
        openNewTagModal(coords)
    }
})

// Scale controls
document.getElementById('editor-scale-up').addEventListener('click', () => {
    if (editorState.resizeScale < 2.0) {
        editorState.resizeScale = Math.round((editorState.resizeScale + 0.05) * 100) / 100
        updateScaleLabel()
        redrawEditor()
    }
})

document.getElementById('editor-scale-down').addEventListener('click', () => {
    if (editorState.resizeScale > 0.1) {
        editorState.resizeScale = Math.round((editorState.resizeScale - 0.05) * 100) / 100
        updateScaleLabel()
        redrawEditor()
    }
})
document.getElementById('editor-font-size').addEventListener('change', (e) => {
    editorState.fontSize = e.target.value
    redrawEditor()
})

const updateScaleLabel = () => {
    document.getElementById('editor-scale-label').textContent = `Scale: ${editorState.resizeScale.toFixed(2)}×`
}

const redrawEditor = () => {
    const canvas = document.getElementById('editor-canvas')
    const image  = document.getElementById('editor-image')
    redrawEverything(canvas, image, editorState.coordinatesMap, editorState.fontSize, editorState.resizeScale)
        .catch(err => console.log(err))
}

// Tag modal
const editorTagModal = new bootstrap.Modal(document.getElementById('editor-tag-modal'))
let _pendingTagCoords = null

const openNewTagModal = (coords) => {
    _pendingTagCoords = coords
    editorState.currentTagId = null
    document.getElementById('editor-tag-modal-label').textContent = 'New tag'
    document.getElementById('editor-tag-name').value = ''
    document.getElementById('editor-tag-delete-btn').classList.add('hide')
    const catSelect = document.getElementById('editor-tag-category')
    catSelect.value = 'null'
    editorTagModal.show()
}

const openEditTagModal = (tagId) => {
    editorState.currentTagId = tagId
    const tag = editorState.coordinatesMap[tagId]
    document.getElementById('editor-tag-modal-label').textContent = 'Edit tag'
    document.getElementById('editor-tag-name').value = tag['name']
    const catSelect = document.getElementById('editor-tag-category')
    catSelect.value = tag['category'] || 'null'
    editorTagModal.show()
}

document.getElementById('editor-tag-save-btn').addEventListener('click', async () => {
    const name     = document.getElementById('editor-tag-name').value.trim()
    const category = document.getElementById('editor-tag-category').value

    if (!name) {
        return
    }

    const tagId = editorState.currentTagId || crypto.randomUUID()
    const coords = editorState.currentTagId
        ? editorState.coordinatesMap[editorState.currentTagId]
        : _pendingTagCoords

    editorState.coordinatesMap[tagId] = { ...coords, name, category }
    editorTagModal.hide()
    redrawEditor()
    renderTagList()
})

document.getElementById('editor-tag-delete-btn').addEventListener('click', async () => {
    const result = await window.api.dialogQuestion('Delete this tag?')

    if (result.response === 0) {
        delete editorState.coordinatesMap[editorState.currentTagId]
        editorTagModal.hide()
        redrawEditor()
        renderTagList()
    }
})

const renderTagList = () => {
    const list  = document.getElementById('editor-tag-list')
    const count = document.getElementById('editor-tag-count')
    const tags  = editorState.coordinatesMap
    list.innerHTML = ''
    const keys = Object.keys(tags)
    count.textContent = keys.length.toString()

    if (keys.length === 0) {
        list.innerHTML = '<li style="color: var(--text-muted); font-size: 12px;">No tags yet. Right-click the image to add one.</li>'
        return
    }

    keys.forEach(id => {
        const li = document.createElement('li')
        li.classList.add('tag-list-item')
        li.innerHTML = `
        <div class="tag-row">
            <span class="tag-name">${tags[id]['name']}</span>
            <div class="tag-actions">
                <button class="btn btn-ghost btn-icon edit-tag-btn"><i class="fas fa-pen"></i></button>
                <button class="btn btn-ghost btn-icon delete-tag-btn"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        `
        li.querySelector('.delete-tag-btn').addEventListener('click', async () => {
            const result = await window.api.dialogQuestion(`Delete tag "${name}"?`)

            if (result.response === 0) {
                if (id != null) {
                    delete editorState.coordinatesMap[id]
                    redrawEditor()
                    renderTagList()
                }
            }
        })

        li.querySelector('.edit-tag-btn').addEventListener('click', async () => {
            openEditTagModal(id)
        })

        list.appendChild(li)
    })
}

// Save body part
document.getElementById('editor-save-btn').addEventListener('click', async () => {
    const name    = document.getElementById('editor-name').value.trim()
    const image   = document.getElementById('editor-image')
    const canvas  = document.getElementById('editor-canvas')

    if (!name) {
        await window.api.popup('Please enter a body part name.')
        return
    }

    if (!image.src || image.src.startsWith('file://') === false && !image.src.startsWith('data:')) {
        await window.api.popup('Please add an image before saving.')
        return
    }

    const bodyPart = {
        name:        name,
        image:         image.src,
        coordinates: editorState.coordinatesMap,
        scale:       editorState.resizeScale,
        fontSize:    editorState.fontSize,
    }

    let bpId = window.AppState.currentBodyPartId || crypto.randomUUID()
    await window.api.addOrEditBodyPartById(bpId, window.AppState.currentChecklistId, bodyPart)
    navigate('checklist-detail')
})

// ── Categories modal ──────────────────────────────────────────────────────────
const categoriesModal = new bootstrap.Modal(document.getElementById('categories-modal'))

const openCategoriesModal = async () => {
    await renderCategoryList()
    categoriesModal.show()
}

const renderCategoryList = async () => {
    const categories = await window.api.getCategories()
    const list= document.getElementById('category-list')
    list.innerHTML = ''

    for (const id in categories) {
        let category = categories[id]
        list.appendChild(createCategoryItem(id, category.name))
    }
}

const createCategoryItem = (id, name) => {
    const li = document.createElement('li')
    li.classList.add('category-item')
    li.innerHTML = `
        <span class="category-name">${name}</span>
        <div class="category-actions">
            <button class="btn btn-ghost btn-icon delete-cat-btn"><i class="fas fa-trash"></i></button>
        </div>`
    li.querySelector('.delete-cat-btn').addEventListener('click', async () => {
        const result = await window.api.dialogQuestion(`Delete category "${name}"?`)

        if (result.response === 0) {
            await window.api.removeCategory(id)
            li.remove()
        }
    })

    return li
}

document.getElementById('add-category-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-category-input')
    const name  = input.value.trim()

    if (!name) {
        return
    }

    const category = {
        name: name,
    }

    window.api.addOrEditCategoryById(null, category).then(res => {
        input.value = ''
        document.getElementById('category-list').appendChild(createCategoryItem(res, name))
    })

})

// ── Shared helper: populate a category <select> ───────────────────────────────

const populateCategorySelect = async (selectId) => {
    const select     = document.getElementById(selectId)
    const categories = await window.api.getCategories()

    // Remove all except the "None" option
    Array.from(select.options).forEach(o => { if (o.value !== 'null') o.remove() })

    for (const id in categories) {
        const option   = document.createElement('option')
        option.value   = id
        let category = categories[id]
        option.textContent = category.name
        select.appendChild(option)
    }
}
