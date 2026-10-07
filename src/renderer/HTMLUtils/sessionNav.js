// Prev/Next stepping shared by session screens (study, practical review).
// Owns the current index and the progress UI. The screen loads the item
// in onChange(index, previousIndex); previousIndex is null on start.
const createSessionNav = ({ label, bar, prevBtn, nextBtn, btnGroup, formatLabel, onChange }) => {
    let index = 0
    let count = 0

    const render = () => {
        const position = index + 1

        label.textContent = formatLabel(position, count)
        bar.style.width   = `${(position / count) * 100}%`
        prevBtn.classList.toggle('disabled', index <= 0)
        nextBtn.classList.toggle('disabled', index >= count - 1)
    }

    const goTo = async (newIndex) => {
        if (newIndex < 0 || newIndex >= count || newIndex === index) {
            return
        }

        const previousIndex = index
        index = newIndex
        render()
        await onChange(index, previousIndex)
    }

    prevBtn.addEventListener('click', () => {
        goTo(index - 1).catch(err => console.error(err))
    })

    nextBtn.addEventListener('click', () => {
        goTo(index + 1).catch(err => console.error(err))
    })

    // Resets to the first item; nav buttons only show when there's more than one
    const start = async (itemCount) => {
        index = 0
        count = itemCount
        btnGroup.classList.toggle('hide', count <= 1)
        render()
        await onChange(0, null)
    }

    return { start }
}

export { createSessionNav }
