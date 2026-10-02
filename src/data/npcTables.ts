// Hand-written tables for the NPC and name generators: names by species and gender, plus
// details to give an improvised NPC some personality.

// Names by species: female and male first names, and family names (or clan / epithet names).
type NameList = { female: string[]; male: string[]; last: string[] }

const human: NameList = {
  female: ['Bryn', 'Dara', 'Edda', 'Helena', 'Jessa', 'Lyra', 'Marta', 'Petra', 'Sabine', 'Wren', 'Ilse', 'Mirela', 'Agnes', 'Tamsin'],
  male: ['Aldric', 'Cedric', 'Garrick', 'Ivo', 'Kendrick', 'Osric', 'Rowan', 'Tomas', 'Bram', 'Emeric', 'Hale', 'Joren', 'Matthias', 'Silas'],
  last: ['Ashford', 'Blackwood', 'Carver', 'Dunmore', 'Fairweather', 'Greaves', 'Hale', 'Marsh', 'Thatcher', 'Underhill', 'Vance', 'Whitlock'],
}
const elf: NameList = {
  female: ['Caelynn', 'Enna', 'Ielenia', 'Keyleth', 'Naivara', 'Quelenna', 'Birel', 'Lia', 'Mialee', 'Sariel', 'Valanthe', 'Shava'],
  male: ['Adran', 'Aelar', 'Galinndan', 'Soveliss', 'Thamior', 'Erevan', 'Heian', 'Ivellios', 'Paelias', 'Riardon', 'Varis', 'Theren'],
  last: ['Amakiir', 'Galanodel', 'Holimion', 'Ilphelkiir', 'Liadon', 'Meliamne', 'Nailo', 'Siannodel'],
}
const orc: NameList = {
  female: ['Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Ovak', 'Shautha', 'Sutha', 'Vola', 'Yevelda'],
  male: ['Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Keth', 'Krusk', 'Mhurren', 'Ront', 'Shump', 'Thokk'],
  last: ['Bonebreaker', 'Grimtusk', 'Ironhide', 'Redfang', 'Skullsplitter', 'Stormborn'],
}

export const ancestries = {
  Human: human,
  Dwarf: {
    female: ['Gunnloda', 'Helja', 'Kathra', 'Riswynn', 'Vistra', 'Amber', 'Bardryn', 'Dagnal', 'Eldeth', 'Falkrunn', 'Hlin', 'Torbera'],
    male: ['Adrik', 'Baern', 'Eberk', 'Morgran', 'Orsik', 'Thorgrim', 'Bruenor', 'Dain', 'Harbek', 'Rurik', 'Tordek', 'Vondal'],
    last: ['Battlehammer', 'Fireforge', 'Gorunn', 'Ironfist', 'Loderr', 'Stonehelm', 'Strakeln', 'Torunn'],
  },
  Elf: elf,
  'Half-Elf': {
    female: [...human.female.slice(0, 6), ...elf.female.slice(0, 6)],
    male: [...human.male.slice(0, 6), ...elf.male.slice(0, 6)],
    last: [...human.last.slice(0, 6), ...elf.last.slice(0, 4)],
  },
  Halfling: {
    female: ['Andry', 'Bree', 'Callie', 'Kithri', 'Lavinia', 'Nedda', 'Seraphina', 'Cora', 'Euphemia', 'Jillian', 'Merla', 'Verna'],
    male: ['Alton', 'Cade', 'Eldon', 'Merric', 'Perrin', 'Corrin', 'Finnan', 'Garret', 'Lyle', 'Milo', 'Osborn', 'Roscoe'],
    last: ['Brushgather', 'Goodbarrel', 'Greenbottle', 'Highhill', 'Hilltopple', 'Leagallow', 'Tealeaf', 'Thorngage'],
  },
  Gnome: {
    female: ['Bimpnottin', 'Ellyjobell', 'Lorilla', 'Nissa', 'Roywyn', 'Wrenn', 'Breena', 'Carlin', 'Donella', 'Ellywick', 'Mardnab', 'Zanna'],
    male: ['Alston', 'Boddynock', 'Frug', 'Orryn', 'Zook', 'Alvyn', 'Brocc', 'Dimble', 'Eldon', 'Fonkin', 'Gimble', 'Glim'],
    last: ['Beren', 'Daergel', 'Folkor', 'Garrick', 'Nackle', 'Murnig', 'Scheppen', 'Turen'],
  },
  Orc: orc,
  'Half-Orc': {
    female: [...orc.female.slice(0, 6), ...human.female.slice(6, 12)],
    male: [...orc.male.slice(0, 6), ...human.male.slice(6, 12)],
    last: [...orc.last, ...human.last.slice(6, 10)],
  },
  Tiefling: {
    female: ['Bryseis', 'Kallista', 'Makaria', 'Nemeia', 'Orianna', 'Akta', 'Anakis', 'Criella', 'Damaia', 'Lerissa', 'Rieta', 'Ea'],
    male: ['Akmenos', 'Damakos', 'Ekemon', 'Leucis', 'Skamos', 'Amnon', 'Barakas', 'Iados', 'Kairon', 'Mordai', 'Pelaios', 'Therai'],
    last: ['Ash', 'Despair', 'Hope', 'Ruin', 'Sorrow', 'Torment', 'Whisper', 'Vigil'],
  },
  Dragonborn: {
    female: ['Akra', 'Biri', 'Kava', 'Nala', 'Sora', 'Uadjit', 'Daar', 'Farideh', 'Harann', 'Jheri', 'Mishann', 'Perra'],
    male: ['Arjhan', 'Balasar', 'Donaar', 'Medrash', 'Torinn', 'Bharash', 'Ghesh', 'Heskan', 'Kriv', 'Nadarr', 'Pandjed', 'Shamash'],
    last: ['Clethtinthiallor', 'Daardendrian', 'Delmirev', 'Kepeshkmolik', 'Myastan', 'Norixius', 'Turnuroth', 'Yarjerit'],
  },
  Goliath: {
    female: ['Eglath', 'Gae-Al', 'Keothi', 'Kuori', 'Nalla', 'Orilo', 'Thalai', 'Vaunea', 'Aki', 'Mai', 'Thotham', 'Uthal'],
    male: ['Aukan', 'Ilikan', 'Manneo', 'Paavu', 'Gauthak', 'Kavaki', 'Lo-Kag', 'Maveith', 'Meavoi', 'Pethani', 'Thalai', 'Vimak'],
    last: ['Bearkiller', 'Dawncaller', 'Horncarver', 'Longleaper', 'Rootsmasher', 'Threadtwister'],
  },
  Aasimar: {
    female: ['Arken', 'Arwen', 'Chaya', 'Davina', 'Elysia', 'Imperia', 'Kiriel', 'Lumina', 'Seraphiel', 'Theodora', 'Vela', 'Zariel'],
    male: ['Aldrich', 'Barachiel', 'Castiel', 'Ezra', 'Gideon', 'Ishmael', 'Lucien', 'Malachi', 'Rafael', 'Tobias', 'Uriel', 'Zeke'],
    last: ['Brightwater', 'Dawnward', 'Goldenmere', 'Lightbringer', 'Morningstar', 'Silverhand', 'Starfall', 'Truesong'],
  },
} satisfies Record<string, NameList>

export type Gender = 'Female' | 'Male'

export type Ancestry = keyof typeof ancestries

export const occupations = [
  'blacksmith', 'innkeeper', 'merchant', 'farmer', 'priest', 'guard', 'sailor', 'scholar', 'hunter',
  'thief', 'noble', 'alchemist', 'bard', 'herbalist', 'miner', 'fisher', 'tailor', 'cartographer',
  'mercenary', 'beggar', 'stablehand', 'scribe', 'tax collector', 'gravedigger',
]

export const appearances = [
  'a jagged scar across one cheek', 'piercing, unblinking eyes', 'a missing front tooth', 'elaborate braided hair',
  'ink-stained fingers', 'an expensive but threadbare coat', 'a nervous twitch in one eye', 'unusually tall and gaunt',
  'a heavy limp', 'a booming laugh', 'many rings on every finger', 'smells strongly of smoke',
  'a tattoo of a coiled serpent', 'freckles and wild red hair', 'immaculately groomed', 'mud-caked boots',
]

export const personalities = [
  'friendly and talkative', 'suspicious of strangers', 'arrogant and boastful', 'shy and soft-spoken',
  'cheerful no matter what', 'blunt to the point of rudeness', 'curious about everything', 'easily frightened',
  'quick to anger', 'deeply religious', 'greedy but honest about it', 'kind-hearted and naive',
  'sarcastic and witty', 'world-weary and cynical', 'overly formal', 'a hopeless romantic',
]

export const mannerisms = [
  'hums while thinking', 'speaks in a whisper', 'uses long, flowery words', 'taps fingers constantly',
  'never makes eye contact', 'stands far too close', 'chews on a pipe or straw', 'repeats the last word others say',
  'ends sentences with a question', 'laughs at their own jokes', 'counts coins while talking', 'frequently quotes proverbs',
  'speaks about themself in the third person', 'cracks knuckles', 'squints at everyone', 'gestures wildly',
]

export const motivations = [
  'pay off a crushing debt', 'protect their family', 'win the love of someone out of reach', 'get revenge on an old rival',
  'find a missing sibling', 'earn a place among the nobility', 'escape this town for good', 'prove their worth to a parent',
  'atone for a past crime', 'discover a lost family heirloom', 'keep their shop afloat', 'serve their god faithfully',
]

export const secrets = [
  'is secretly working for a thieves\' guild', 'owes money to dangerous people', 'witnessed a murder and told no one',
  'is a deserter from an army', 'is having an affair with a local noble', 'has a cursed item hidden at home',
  'is not who they claim to be', 'is a spy for a rival town', 'knows the location of a hidden treasure',
  'is being blackmailed', 'secretly worships a forbidden god', 'has a twin nobody knows about',
]
