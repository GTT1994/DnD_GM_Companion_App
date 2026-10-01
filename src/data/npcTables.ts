// Hand-written tables for the NPC generator: names by ancestry, plus details
// to give an improvised NPC some personality.

export const ancestries = {
  Human: {
    first: ['Aldric', 'Bryn', 'Cedric', 'Dara', 'Edda', 'Garrick', 'Helena', 'Ivo', 'Jessa', 'Kendrick', 'Lyra', 'Marta', 'Osric', 'Petra', 'Rowan', 'Sabine', 'Tomas', 'Wren'],
    last: ['Ashford', 'Blackwood', 'Carver', 'Dunmore', 'Fairweather', 'Greaves', 'Hale', 'Marsh', 'Thatcher', 'Underhill', 'Vance', 'Whitlock'],
  },
  Dwarf: {
    first: ['Adrik', 'Baern', 'Dagnal', 'Eberk', 'Gunnloda', 'Helja', 'Kathra', 'Morgran', 'Orsik', 'Riswynn', 'Thorgrim', 'Vistra'],
    last: ['Battlehammer', 'Fireforge', 'Gorunn', 'Ironfist', 'Loderr', 'Stonehelm', 'Strakeln', 'Torunn'],
  },
  Elf: {
    first: ['Adran', 'Aelar', 'Birel', 'Caelynn', 'Enna', 'Galinndan', 'Ielenia', 'Keyleth', 'Naivara', 'Quelenna', 'Soveliss', 'Thamior'],
    last: ['Amakiir', 'Galanodel', 'Holimion', 'Ilphelkiir', 'Liadon', 'Meliamne', 'Nailo', 'Siannodel'],
  },
  Halfling: {
    first: ['Alton', 'Andry', 'Bree', 'Cade', 'Callie', 'Eldon', 'Kithri', 'Lavinia', 'Merric', 'Nedda', 'Perrin', 'Seraphina'],
    last: ['Brushgather', 'Goodbarrel', 'Greenbottle', 'Highhill', 'Hilltopple', 'Leagallow', 'Tealeaf', 'Thorngage'],
  },
  Gnome: {
    first: ['Alston', 'Bimpnottin', 'Boddynock', 'Carlin', 'Ellyjobell', 'Frug', 'Lorilla', 'Nissa', 'Orryn', 'Roywyn', 'Wrenn', 'Zook'],
    last: ['Beren', 'Daergel', 'Folkor', 'Garrick', 'Nackle', 'Murnig', 'Scheppen', 'Turen'],
  },
  Orc: {
    first: ['Dench', 'Emen', 'Feng', 'Gell', 'Henk', 'Holg', 'Kansif', 'Myev', 'Ovak', 'Shautha', 'Sutha', 'Yevelda'],
    last: ['Bonebreaker', 'Grimtusk', 'Ironhide', 'Redfang', 'Skullsplitter', 'Stormborn'],
  },
  Tiefling: {
    first: ['Akmenos', 'Bryseis', 'Damakos', 'Ekemon', 'Kallista', 'Leucis', 'Makaria', 'Nemeia', 'Orianna', 'Skamos'],
    last: ['Ash', 'Despair', 'Hope', 'Ruin', 'Sorrow', 'Torment', 'Whisper', 'Vigil'],
  },
  Dragonborn: {
    first: ['Arjhan', 'Akra', 'Balasar', 'Biri', 'Donaar', 'Harann', 'Kava', 'Medrash', 'Nala', 'Sora', 'Torinn', 'Uadjit'],
    last: ['Clethtinthiallor', 'Daardendrian', 'Delmirev', 'Kepeshkmolik', 'Myastan', 'Norixius', 'Turnuroth', 'Yarjerit'],
  },
  Goliath: {
    first: ['Aukan', 'Eglath', 'Gae-Al', 'Ilikan', 'Keothi', 'Kuori', 'Manneo', 'Nalla', 'Orilo', 'Paavu', 'Thalai', 'Vaunea'],
    last: ['Bearkiller', 'Dawncaller', 'Horncarver', 'Longleaper', 'Rootsmasher', 'Threadtwister'],
  },
} as const

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
