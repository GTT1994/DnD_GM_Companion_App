// Hand-written tables for the rumour, plot hook, tavern and shop generators. Words in {braces}
// are filled in when generating: {name} a random person, {place} a place, {creature} a creature,
// {thing} an object.

export const PLACES = [
  'the old mill', 'the abandoned watchtower', 'the flooded mine', 'the ruined chapel', 'the merchant\'s manor',
  'the crossroads shrine', 'the sunken barrow', 'the lighthouse', 'the burned farmstead', 'the guildhall cellar',
  'the hermit\'s hut', 'the standing stones', 'the toll bridge', 'the old cemetery', 'the dwarven ruins', 'the river caves',
]

export const CREATURES = [
  'wolves', 'goblins', 'a troll', 'something with too many legs', 'a pale figure', 'bandits', 'a wyvern',
  'giant spiders', 'the dead', 'a hag', 'cultists in red', 'an ogre', 'a ghost', 'kobolds', 'a giant boar',
]

export const THINGS = [
  'a silver crown', 'a map of the old tunnels', 'a sealed letter', 'a black dagger', 'the temple\'s relic',
  'a chest of tax money', 'a dragon\'s egg', 'a cursed coin', 'the mayor\'s signet ring', 'a book bound in skin',
  'a jade statuette', 'a prisoner\'s confession',
]

export const RUMOURS = [
  'Lights have been seen at {place} every night this week.',
  '{name} came back from {place} with gold, but won\'t say where it came from.',
  'Livestock keep going missing near {place}; folk blame {creature}.',
  'Someone is paying good coin for {thing}, no questions asked.',
  '{name} hasn\'t been seen since visiting {place}.',
  'The guards have been told to ignore anything strange at {place}.',
  '{creature} attacked a caravan on the east road two nights ago.',
  'There\'s a hidden passage under {place} that leads out of town.',
  '{name} is in debt to the wrong people and getting desperate.',
  'The well water has tasted strange since the storm.',
  'A stranger in a grey cloak has been asking about {thing}.',
  '{place} was built on top of something much older.',
  'The temple priest has been sneaking out after dark.',
  'Travellers say {creature} have been driven out of the hills by something worse.',
  'The last person to sleep at {place} woke up with no memory of the night.',
  '{name} swears they saw {creature} near {place}.',
  'Prices are going up because the miners have stopped sending ore.',
  'A reward was posted for {thing}, then quietly taken down.',
  'Children have been singing a rhyme about {place} that nobody taught them.',
  '{name} knows more about the missing people than they let on.',
]

// What's actually behind a rumour that isn't the whole truth.
export const PARTLY_TRUE = [
  'the details are right, but it happened years ago',
  'it\'s true, but someone is spreading it on purpose',
  'it\'s real, but much smaller than people say',
  'the place is right, but the culprit is someone else',
  'it happened, but it was an accident, not a crime',
  'it\'s true, but it\'s bait for a trap',
]

export const FALSE_BECAUSE = [
  'a rival made it up to cause trouble',
  'it\'s a misunderstanding of something ordinary',
  'a drunk invented it and it grew with each telling',
  'it\'s a cover story for something else entirely',
  'someone wants people to stay away from there',
]

export const HOOK_GIVERS = [
  'a worried farmer', 'the town reeve', 'a nervous merchant', 'a temple priest', 'a retired adventurer', 'a noble\'s steward',
  'a street urchin', 'a wizard\'s apprentice', 'the captain of the guard', 'a travelling scholar', 'a grieving widow', 'a guild master',
]

export const HOOK_GOALS = [
  'find {name}, who went missing near {place}',
  'recover {thing} from {place}',
  'deal with {creature} troubling the farms',
  'escort a wagon safely to the next town',
  'find out who has been stealing from the temple',
  'deliver {thing} to a contact at {place}',
  'clear {creature} out of {place}',
  'investigate strange noises at {place}',
  'track down the thieves who robbed the guildhall',
  'protect {name} until the festival is over',
  'retrieve a debt owed by someone at {place}',
  'find the source of a sickness spreading through town',
]

export const HOOK_COMPLICATIONS = [
  'the person who hired them is lying about why',
  'a rival group is after the same thing',
  'the "monster" is actually protecting something',
  'someone important wants this to fail',
  'there is a deadline: three days',
  'the target is someone the party knows',
  'the job is legal, but deeply unpopular in town',
  'the place is far more dangerous than they were told',
  'success will anger a powerful faction',
  'the missing person doesn\'t want to be found',
]

export const HOOK_REWARDS = [
  'a purse of gold', 'a favour from someone powerful', 'a minor magic item', 'free lodging and supplies',
  'a map to something valuable', 'a share of whatever is found', 'an introduction at court', 'land outside town',
]

// --- Taverns ---------------------------------------------------------------------------

export const TAVERN_ADJECTIVES = ['Prancing', 'Rusty', 'Golden', 'Drunken', 'Sleeping', 'Laughing', 'Crooked', 'Silver', 'Black', 'Wandering', 'Jolly', 'Broken', 'Red', 'Salty', 'Hungry', 'Lucky']
export const TAVERN_NOUNS = ['Pony', 'Dragon', 'Tankard', 'Griffon', 'Goat', 'Lantern', 'Anchor', 'Boar', 'Stag', 'Wizard', 'Kettle', 'Crown', 'Mermaid', 'Hound', 'Owl', 'Barrel']

export const TAVERN_ATMOSPHERES = [
  'loud and crowded, with a fiddler nobody listens to',
  'quiet and smoky; conversations stop when strangers enter',
  'warm and welcoming, smelling of fresh bread',
  'run-down, with sticky tables and a leaking roof',
  'rowdy, with an arm-wrestling contest in the corner',
  'elegant, with clean linen and overpriced wine',
  'full of off-duty guards telling tall stories',
  'dim and cramped, with private booths behind curtains',
  'a sailors\' haunt with a parrot that swears',
  'nearly empty except for one very drunk dwarf',
]

export const PATRONS = [
  'a pair of mercenaries arguing over a map', 'a bard tuning a lute, looking for an audience', 'a merchant counting coins too openly',
  'a hooded figure who never takes off their gloves', 'farmers complaining about the weather', 'a noble pretending not to be one',
  'a priest drinking alone', 'a card game that\'s getting tense', 'an old soldier with one arm', 'two lovers whispering',
  'a halfling selling "genuine" relics', 'a tired courier with an urgent letter', 'a drunk who claims to have seen a dragon',
  'a guard who should be on duty', 'a scholar scribbling in a journal',
]

// Meals and drinks at a quality level, with prices from the SRD's food, drink and lodging list.
export type TavernQuality = 'poor' | 'modest' | 'comfortable' | 'wealthy'

export const TAVERN_PRICES: Record<TavernQuality, { meal: string; room: string; drink: string }> = {
  poor: { meal: '6 cp', room: '1 sp', drink: 'Ale, 4 cp a mug' },
  modest: { meal: '3 sp', room: '5 sp', drink: 'Ale, 4 cp a mug; common wine, 2 sp a pitcher' },
  comfortable: { meal: '5 sp', room: '8 sp', drink: 'Ale, 4 cp a mug; common wine, 2 sp a pitcher' },
  wealthy: { meal: '8 sp', room: '2 gp', drink: 'Common wine, 2 sp a pitcher; fine wine, 10 gp a bottle' },
}

export const DISHES: Record<TavernQuality, string[]> = {
  poor: ['thin vegetable broth', 'day-old bread and dripping', 'boiled turnips', 'mystery stew', 'hard cheese and onions'],
  modest: ['mutton stew with dumplings', 'fried fish and greens', 'pork pie', 'barley soup and bread', 'sausages and mash'],
  comfortable: ['roast chicken with herbs', 'venison pie', 'trout with almonds', 'lamb and rosemary stew', 'honey-glazed ham'],
  wealthy: ['spiced boar with figs', 'pheasant in red wine', 'lobster from the coast', 'saffron rice with lamb', 'candied pears and cream'],
}

// --- Shops -------------------------------------------------------------------------------

export type ShopType = 'general' | 'blacksmith' | 'alchemist' | 'fletcher' | 'magic'
export type SettlementSize = 'village' | 'town' | 'city'

export const SHOP_LABELS: Record<ShopType, string> = {
  general: 'General store',
  blacksmith: 'Blacksmith & armourer',
  alchemist: 'Alchemist & apothecary',
  fletcher: 'Bowyer & fletcher',
  magic: 'Magic shop',
}

export const SHOPKEEPER_JOBS: Record<ShopType, string> = {
  general: 'shopkeeper', blacksmith: 'blacksmith', alchemist: 'alchemist', fletcher: 'fletcher', magic: 'arcane trader',
}

export const SHOP_NAMES: Record<ShopType, string[]> = {
  general: ['Supplies & Sundries', 'General Goods', 'Provisions', 'Trading Post', 'Odds & Ends'],
  blacksmith: ['Forge', 'Anvil', 'Steelworks', 'Smithy', 'Hammer & Tongs'],
  alchemist: ['Remedies', 'Tinctures & Tonics', 'Apothecary', 'Potions & Powders', 'Herbs & Elixirs'],
  fletcher: ['Bows & Arrows', 'Fletchery', 'Quiver & String', 'Archery Supplies'],
  magic: ['Curiosities', 'Arcane Emporium', 'Wonders', 'Enchanted Goods', 'Relics & Rarities'],
}

// Mundane items an alchemist sells, by name (matched against the edition's equipment list).
export const ALCHEMIST_ITEMS = ['acid', 'alchemist\'s fire', 'antitoxin', 'healer\'s kit', 'oil', 'perfume', 'potion of healing', 'herbalism kit', 'alchemist\'s supplies', 'vial', 'flask', 'poisoner\'s kit', 'soap', 'holy water', 'candle']

// How many items, the dearest mundane item (gp), and the magic item rarities on offer, by settlement.
export const SETTLEMENTS: Record<SettlementSize, { stock: number; maxPrice: number; magic: Record<string, number>; magicCount: string }> = {
  village: { stock: 6, maxPrice: 50, magic: { Common: 90, Uncommon: 10 }, magicCount: '1d3' },
  town: { stock: 10, maxPrice: 500, magic: { Common: 45, Uncommon: 45, Rare: 10 }, magicCount: '1d4+2' },
  city: { stock: 15, maxPrice: 100000, magic: { Common: 25, Uncommon: 45, Rare: 25, 'Very Rare': 5 }, magicCount: '2d4+3' },
}

// Magic item prices: the SRD doesn't price magic items, so these are hand-written bands by rarity
// (similar to the usual published guidance). Prices are rolled within the band.
export const MAGIC_PRICES: Record<string, [number, number]> = {
  Common: [50, 100],
  Uncommon: [101, 500],
  Rare: [501, 5000],
  'Very Rare': [5001, 50000],
  Legendary: [50001, 200000],
}

export const HAGGLING = [
  'won\'t budge on price, but throws in a small extra',
  'knocks 10% off for a good story',
  'charges 20% more to anyone who looks rich',
  'gives a discount to anyone who helps with a problem out back',
  'haggles enthusiastically and enjoys it',
  'only takes coin, never trades',
  'will trade goods for goods, especially rare herbs or ore',
  'offers credit to locals, never to strangers',
]
