/**
 * Took this and changed the format + fixed a few pronouns
 * @author Lisenaaaa
 * @see https://github.com/Lisenaaaa/Rain/blob/9ffc3ef64cb5fcd89227244cd623255b3ba85eb2/src/functions/objectfunctions/users.ts#L15-L106
 */
export const pronounMap = {
    "unspecified": {
        "pronoundb": "unspecified",
        "pronoun": "Unspecified",
        "description": "this person",
        "singular": "this person",
        "ownership": "this person's"
    },
    "heHim": {
        "pronoundb": "hh",
        "pronoun": "he/him",
        "description": "him",
        "singular": "he",
        "ownership": "his"
    },
    "heIt": {
        "pronoundb": "hi",
        "pronoun": "he/it",
        "description": "him",
        "singular": "he",
        "ownership": "his"
    },
    "heShe": {
        "pronoundb": "hs",
        "pronoun": "he/she",
        "description": "him",
        "singular": "he",
        "ownership": "his"
    },
    "heThey": {
        "pronoundb": "ht",
        "pronoun": "he/they",
        "description": "him",
        "singular": "he",
        "ownership": "his"
    },
    "itHim": {
        "pronoundb": "ih",
        "pronoun": "it/he",
        "description": "it",
        "singular": "it",
        "ownership": "its"
    },
    "itIts": {
        "pronoundb": "ii",
        "pronoun": "it/its",
        "description": "it",
        "singular": "it",
        "ownership": "its"
    },
    "itShe": {
        "pronoundb": "is",
        "pronoun": "it/she",
        "description": "it",
        "singular": "it",
        "ownership": "its"
    },
    "itThey": {
        "pronoundb": "it",
        "pronoun": "it/they",
        "description": "it",
        "singular": "it",
        "ownership": "its"
    },
    "sheHe": {
        "pronoundb": "shh",
        "pronoun": "she/he",
        "description": "her",
        "singular": "she",
        "ownership": "hers"
    },
    "sheHer": {
        "pronoundb": "sh",
        "pronoun": "she/her",
        "description": "her",
        "singular": "she",
        "ownership": "hers"
    },
    "sheIt": {
        "pronoundb": "si",
        "pronoun": "she/it",
        "description": "her",
        "singular": "she",
        "ownership": "hers"
    },
    "sheThey": {
        "pronoundb": "st",
        "pronoun": "she/they",
        "description": "her",
        "singular": "she",
        "ownership": "hers"
    },
    "theyHe": {
        "pronoundb": "th",
        "pronoun": "they/he",
        "description": "them",
        "singular": "they",
        "ownership": "their"
    },
    "theyIt": {
        "pronoundb": "ti",
        "pronoun": "they/it",
        "description": "them",
        "singular": "they",
        "ownership": "their"
    },
    "theyShe": {
        "pronoundb": "ts",
        "pronoun": "they/she",
        "description": "them",
        "singular": "they",
        "ownership": "their"
    },
    "theyThem": {
        "pronoundb": "tt",
        "pronoun": "they/them",
        "description": "them",
        "singular": "they",
        "ownership": "their"
    },
    "anyPronouns": {
        "pronoundb": "any",
        "pronoun": "Any pronouns",
        "description": "them",
        "singular": "they",
        "ownership": "their"
    },
    "otherPronouns": {
        "pronoundb": "other",
        "pronoun": "Other pronouns",
        "description": "this person",
        "singular": "this person",
        "ownership": "this person's"
    },
    "askPronouns": {
        "pronoundb": "ask",
        "pronoun": "Ask me my pronouns",
        "description": "this person",
        "singular": "this person",
        "ownership": "this person's"
    },
    "avoidPronouns": {
        "pronoundb": "avoid",
        "pronoun": "Avoid pronouns, use my name",
        "description": "{{name}}",
        "singular": "{{name}}",
        "ownership": "{{name}}'s"
    }
} as Record<string, {
    pronoundb: string;
    pronoun: string;
    description: string;
    singular: string;
    ownership: string;
}>

