/**
 * Took this and changed the format + fixed a few pronouns
 * @author Lisenaaaa
 * @see https://github.com/Lisenaaaa/Rain/blob/9ffc3ef64cb5fcd89227244cd623255b3ba85eb2/src/functions/objectfunctions/users.ts#L15-L106
 */
export const pronoundbmap = {
    "unspecified": {
        "pronoun": "Unspecified",
        "describe": "this person",
        "singular": "this person",
        "ownership": "this person's"
    },
    "hh": {
        "pronoun": "he/him",
        "describe": "him",
        "singular": "he",
        "ownership": "his"
    },
    "hi": {
        "pronoun": "he/it",
        "describe": "him",
        "singular": "he",
        "ownership": "his"
    },
    "hs": {
        "pronoun": "he/she",
        "describe": "him",
        "singular": "he",
        "ownership": "his"
    },
    "ht": {
        "pronoun": "he/they",
        "describe": "him",
        "singular": "he",
        "ownership": "his"
    },
    "ih": {
        "pronoun": "it/him",
        "describe": "it",
        "singular": "it",
        "ownership": "its"
    },
    "ii": {
        "pronoun": "it/its",
        "describe": "it",
        "singular": "it",
        "ownership": "its"
    },
    "is": {
        "pronoun": "it/she",
        "describe": "it",
        "singular": "it",
        "ownership": "its"
    },
    "it": {
        "pronoun": "it/they",
        "describe": "it",
        "singular": "it",
        "ownership": "its"
    },
    "shh": {
        "pronoun": "she/he",
        "describe": "her",
        "singular": "she",
        "ownership": "hers"
    },
    "sh": {
        "pronoun": "she/her",
        "describe": "her",
        "singular": "she",
        "ownership": "hers"
    },
    "si": {
        "pronoun": "she/it",
        "describe": "her",
        "singular": "she",
        "ownership": "hers"
    },
    "st": {
        "pronoun": "she/they",
        "describe": "her",
        "singular": "she",
        "ownership": "hers"
    },
    "th": {
        "pronoun": "they/he",
        "describe": "them",
        "singular": "they",
        "ownership": "their"
    },
    "ti": {
        "pronoun": "they/it",
        "describe": "them",
        "singular": "they",
        "ownership": "their"
    },
    "ts": {
        "pronoun": "they/she",
        "describe": "them",
        "singular": "they",
        "ownership": "their"
    },
    "tt": {
        "pronoun": "they/them",
        "describe": "them",
        "singular": "they",
        "ownership": "their"
    },
    "any": {
        "pronoun": "Any pronouns",
        "describe": "them",
        "singular": "they",
        "ownership": "their"
    },
    "other": {
        "pronoun": "Other pronouns",
        "describe": "this person",
        "singular": "this person",
        "ownership": "this person's"
    },
    "ask": {
        "pronoun": "Ask me my pronouns",
        "describe": "this person",
        "singular": "this person",
        "ownership": "this person's"
    },
    "avoid": {
        "pronoun": "Avoid pronouns, use my name",
        "describe": "{{name}}",
        "singular": "{{name}}",
        "ownership": "{{name}}'s"
    }
} as Record<string, {
    pronoun: string;
    describe: string;
    singular: string;
    ownership: string;
}>

