
//Clones a <template> and hands back its root element.
//
//Appending a DocumentFragment moves its children out and leaves the fragment
//empty, so the root has to be pulled off the clone before it goes anywhere.
//Returning the element instead of the fragment means callers can keep filling
//it in after they have appended it.
const cloneTemplate = (template) => {
    return template.content.cloneNode(true).firstElementChild
}
