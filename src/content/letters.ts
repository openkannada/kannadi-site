// The letters of the Kannada alphabet in their traditional order and groups.

/** The 13 vowels (ಸ್ವರಗಳು). */
export const VOWELS = ["ಅ", "ಆ", "ಇ", "ಈ", "ಉ", "ಊ", "ಋ", "ಎ", "ಏ", "ಐ", "ಒ", "ಓ", "ಔ"];

/** The 2 yogavahas (ಯೋಗವಾಹಗಳು), shown on ಅ. */
export const YOGAVAHAS = ["ಅಂ", "ಅಃ"];

/** The 25 structured consonants (ವರ್ಗೀಯ ವ್ಯಂಜನಗಳು): 5 groups by where they are said, 5 by how. */
export const STRUCTURED: { group: string; letters: string[] }[] = [
  { group: "ಕ ವರ್ಗ", letters: ["ಕ", "ಖ", "ಗ", "ಘ", "ಙ"] },
  { group: "ಚ ವರ್ಗ", letters: ["ಚ", "ಛ", "ಜ", "ಝ", "ಞ"] },
  { group: "ಟ ವರ್ಗ", letters: ["ಟ", "ಠ", "ಡ", "ಢ", "ಣ"] },
  { group: "ತ ವರ್ಗ", letters: ["ತ", "ಥ", "ದ", "ಧ", "ನ"] },
  { group: "ಪ ವರ್ಗ", letters: ["ಪ", "ಫ", "ಬ", "ಭ", "ಮ"] },
];

/** How the 5 columns of the structured consonants are said, with the names Kannada schools use. */
export const MANNERS: { en: string; kn: string }[] = [
  { en: "Plain", kn: "ಅಲ್ಪಪ್ರಾಣ" },
  { en: "Aspirated", kn: "ಮಹಾಪ್ರಾಣ" },
  { en: "Voiced", kn: "ಅಲ್ಪಪ್ರಾಣ" },
  { en: "Voiced, aspirated", kn: "ಮಹಾಪ್ರಾಣ" },
  { en: "Nasal", kn: "ಅನುನಾಸಿಕ" },
];

/** The 9 unstructured consonants (ಅವರ್ಗೀಯ ವ್ಯಂಜನಗಳು). */
export const UNSTRUCTURED = ["ಯ", "ರ", "ಲ", "ವ", "ಶ", "ಷ", "ಸ", "ಹ", "ಳ"];

/** All 34 consonants in alphabet order. */
export const CONSONANTS = [...STRUCTURED.flatMap((g) => g.letters), ...UNSTRUCTURED];

export const DIGITS = ["೦", "೧", "೨", "೩", "೪", "೫", "೬", "೭", "೮", "೯"];

/** The kagunita columns: no sign, the 12 vowel signs, ಂ, ಃ and the virama. */
export const SIGNS = ["", "ಾ", "ಿ", "ೀ", "ು", "ೂ", "ೃ", "ೆ", "ೇ", "ೈ", "ೊ", "ೋ", "ೌ", "ಂ", "ಃ", "್"];

/** What each kagunita column adds, read aloud in place of a sign on a dotted circle. */
export const SIGN_NAMES = ["", "ā sign", "i sign", "ī sign", "u sign", "ū sign", "r̥ sign", "e sign", "ē sign", "ai sign", "o sign", "ō sign", "au sign", "anusvara", "visarga", "virama"];
