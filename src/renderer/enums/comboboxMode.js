// How a search combobox treats a pick:
//   MULTIPLE  each pick toggles an entry, then the box clears (study, practical)
//   SINGLE    a pick becomes the value and stays in the box, like a <select>
const COMBOBOX_MODE = {
    MULTIPLE: 'multiple',
    SINGLE:   'single',
}

export {
    COMBOBOX_MODE,
}
