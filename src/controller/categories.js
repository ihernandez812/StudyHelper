const newCategoryBtn = document.querySelector('#new_category')
const categoryContainer = document.querySelector("#category_container")

window.addEventListener('load', async (e) => {
    let categories = await window.api.getCategories()
    let isFirst = true
    let rows = []
    for(let id in categories){
        let category = categories[id]
        let row = createCategoryRow(id, category, isFirst)
        rows.push(row)
        isFirst = false

    }
    let newRow = createCategoryRow('new_category_text', '', isFirst)
    rows.push(newRow)

    categoryContainer.append(...rows)
})

newCategoryBtn.addEventListener('click', async () => {
    let new_category = document.querySelector('#new_category_text')
    let txt = new_category.value
    if(txt){
        let id = await window.api.generateId()
        new_category.setAttribute('id', id)
        window.api.addOrEditCategoryById(id, txt)
        //we need to add the edit and delete icons to the newly
        //added category
        let currRow = new_category.parentElement.parentElement.parentElement
        let currInputGroup = new_category.parentElement
        let editIcon = createEditIcon(new_category, id)
        let trashIcon = createTrashIcon(currRow, id)
        currInputGroup.append(editIcon, trashIcon)
        let newRow = createCategoryRow('new_category_text', '', false)
        categoryContainer.appendChild(newRow)
    }
})

const createEditIcon = (input, id) => {
    let editSpan = document.createElement('span')
    editSpan.classList.add('input-group-text')

    let editIcon = document.createElement('i')
    editIcon.classList.add('fa')
    editIcon.classList.add('fa-pencil-square-o')

    editSpan.addEventListener('click', () => {
        category = input.value
        if(category){
            window.api.addOrEditCategoryById(id, category)
            alert('Saved')
        } else{
            alert('No Empty Categories Big Dog')
        }

    })

    editSpan.appendChild(editIcon)
    return editSpan
}

const createTrashIcon = (row, id) => {
    let trashSpan = document.createElement('span')
    trashSpan.classList.add('input-group-text')

    let trashIcon = document.createElement('i')
    trashIcon.classList.add('fa')
    trashIcon.classList.add('fa-trash-o')

    trashSpan.addEventListener('click', () => {
        window.api.dialogQuestion('Are you sure you want to delete?')
        .then(res => {
            let result = res.response
            if(result == 0){
                let isFirst = row.classList.contains('pad-5')
                //if we are deleting the first element in the list
                //then we need to add extra padding to the next one
                //so it doesn't look gross
                if(isFirst){
                    let nextSibling = row.nextSibling
                    nextSibling.classList.remove('pad-2')
                    nextSibling.classList.add('pad-5')
                }
                row.remove()
                window.api.removeCategory(id)
                
            }
        })
    })

    trashSpan.appendChild(trashIcon)
    return trashSpan
}

const createCategoryRow = (id, category, isFirst) => {
    let row =  document.createElement('div')
    let rowPadding = (isFirst) ? 'pad-5' : 'pad-2'
    row.classList.add('row')
    row.classList.add(rowPadding)
    row.classList.add('pl-5')

    let column = document.createElement('div')
    column.classList.add('col-6')

    let inputGroup = document.createElement('div')
    inputGroup.classList.add('input-group')
    inputGroup.classList.add('flex-nowrap')

    let input = document.createElement('input')
    input.classList.add('form-control')
    input.setAttribute('placeholder', 'Tag Category')
    input.setAttribute('id', id)

    input.value = category

    let editSpan = createEditIcon(input, id)
    let trashSpan = createTrashIcon(row, id)
    
    inputGroup.appendChild(input)

    //if this is not for a new one give them the ability to delete and edit
    if(category){
        inputGroup.appendChild(editSpan)
        inputGroup.appendChild(trashSpan)
    }
    column.appendChild(inputGroup)
    row.appendChild(column)

    return row

}