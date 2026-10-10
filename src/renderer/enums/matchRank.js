// How well a search query matches a name, best first
const MATCH_RANK = {
    PREFIX:     0,   // "fem"   → Femur
    WORD_START: 1,   // "brach" → Biceps brachii
    CONTAINS:   2,   // "brach" → Coracobrachialis
}

export {
    MATCH_RANK,
}
