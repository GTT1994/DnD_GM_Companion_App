// Which SRD monsters live where, for the random encounter generator. Hand-written (the SRD data
// has no environments), loosely following the DMG's monster lists by environment. Monster IDs
// cover both editions; an ID missing from one edition is simply skipped.
// Homebrew monsters can be given environments in the monster editor.

export const ENVIRONMENTS = [
  'arctic', 'coast', 'desert', 'dungeon', 'forest', 'grassland', 'hills', 'mountain', 'swamp', 'underdark', 'underwater', 'urban',
] as const

export type Environment = (typeof ENVIRONMENTS)[number]

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  arctic: 'Arctic', coast: 'Coast', desert: 'Desert', dungeon: 'Dungeon', forest: 'Forest', grassland: 'Grassland',
  hills: 'Hills', mountain: 'Mountain', swamp: 'Swamp', underdark: 'Underdark', underwater: 'Underwater', urban: 'Urban',
}

const words = (s: string) => s.trim().split(/\s+/)

export const MONSTERS_BY_ENVIRONMENT: Record<Environment, string[]> = {
  arctic: words(`
    polar-bear winter-wolf frost-giant remorhaz ice-mephit mammoth saber-toothed-tiger owlbear ogre bandit
    bandit-captain scout berserker tribal-warrior warrior-infantry giant-owl wolf dire-wolf
    white-dragon-wyrmling young-white-dragon adult-white-dragon ancient-white-dragon ice-devil`),
  coast: words(`
    crab giant-crab sahuagin sahuagin-warrior merfolk merfolk-skirmisher merrow harpy pirate pirate-captain
    bandit bandit-captain giant-eagle pteranodon sea-hag griffon roc plesiosaurus giant-toad guard scout
    blood-hawk kobold kobold-warrior water-elemental storm-giant giant-lizard druid tribal-warrior
    bronze-dragon-wyrmling young-bronze-dragon adult-bronze-dragon ancient-bronze-dragon`),
  desert: words(`
    jackal hyena giant-hyena camel vulture giant-vulture scorpion giant-scorpion poisonous-snake venomous-snake
    giant-poisonous-snake giant-venomous-snake constrictor-snake giant-constrictor-snake gnoll gnoll-warrior
    bandit bandit-captain cult-fanatic cultist mummy mummy-lord lamia androsphinx gynosphinx sphinx-of-valor
    sphinx-of-lore sphinx-of-wonder dust-mephit efreeti djinni purple-worm giant-lizard swarm-of-insects
    air-elemental tribal-warrior blue-dragon-wyrmling young-blue-dragon adult-blue-dragon ancient-blue-dragon
    brass-dragon-wyrmling young-brass-dragon adult-brass-dragon ancient-brass-dragon`),
  dungeon: words(`
    skeleton zombie ghoul ghast wight specter shadow wraith mummy gelatinous-cube black-pudding gray-ooze
    ochre-jelly mimic rust-monster gibbering-mouther otyugh kobold kobold-warrior goblin goblin-boss
    goblin-warrior goblin-minion hobgoblin hobgoblin-warrior hobgoblin-captain bugbear bugbear-warrior
    bugbear-stalker orc ogre ogre-zombie troll minotaur minotaur-skeleton minotaur-of-baphomet animated-armor
    flying-sword animated-flying-sword rug-of-smothering animated-rug-of-smothering swarm-of-rats giant-rat
    rat swarm-of-bats stirge darkmantle grick roper spider giant-spider phase-spider cult-fanatic cultist
    cultist-fanatic mage gargoyle homunculus imp quasit shield-guardian flesh-golem clay-golem stone-golem
    chuul cloaker basilisk medusa swarm-of-crawling-claws warhorse-skeleton ghost doppelganger guardian-naga
    spirit-naga wererat-human wererat-hybrid xorn shrieker shrieker-fungus violet-fungus dretch thug tough
    bandit vampire-spawn`),
  forest: words(`
    wolf dire-wolf worg brown-bear black-bear owlbear boar giant-boar elk giant-elk deer giant-spider ettercap
    giant-owl owl badger giant-badger panther tiger sprite dryad satyr unicorn treant awakened-tree
    awakened-shrub blink-dog centaur centaur-trooper goblin goblin-boss goblin-warrior goblin-minion hobgoblin
    bugbear bugbear-warrior bandit bandit-captain scout druid green-hag werewolf-human werewolf-hybrid
    werewolf-wolf wereboar-boar wereboar-human wereboar-hybrid werebear-bear werebear-human werebear-hybrid
    weretiger-tiger weretiger-human weretiger-hybrid giant-wasp swarm-of-insects swarm-of-wasps
    giant-centipede swarm-of-centipedes constrictor-snake giant-constrictor-snake poisonous-snake
    venomous-snake ape baboon pseudodragon gnoll ogre troll couatl tribal-warrior
    green-dragon-wyrmling young-green-dragon adult-green-dragon ancient-green-dragon
    gold-dragon-wyrmling young-gold-dragon`),
  grassland: words(`
    lion hyena giant-hyena jackal elephant rhinoceros giant-eagle hawk blood-hawk axe-beak riding-horse
    warhorse pony draft-horse mule ankheg bulette centaur centaur-trooper gnoll gnoll-warrior hobgoblin
    hobgoblin-captain hobgoblin-warrior orc ogre goblin goblin-warrior bandit bandit-captain scout
    tribal-warrior warrior-infantry cockatrice pegasus griffon hippogriff triceratops allosaurus ankylosaurus
    tyrannosaurus-rex pteranodon weretiger-tiger weretiger-human giant-wasp swarm-of-insects vulture
    giant-vulture boar elk hill-giant chimera
    gold-dragon-wyrmling young-gold-dragon adult-gold-dragon ancient-gold-dragon`),
  hills: words(`
    hill-giant ogre orc goblin goblin-warrior hobgoblin hobgoblin-warrior bugbear gnoll gnoll-warrior wolf
    dire-wolf worg griffon hippogriff manticore chimera wyvern giant-eagle eagle giant-goat goat harpy bandit
    bandit-captain berserker scout ettin troll stone-giant bulette ankheg tribal-warrior guard knight
    werewolf-human werewolf-wolf copper-dragon-wyrmling young-copper-dragon adult-copper-dragon
    ancient-copper-dragon red-dragon-wyrmling`),
  mountain: words(`
    stone-giant cloud-giant storm-giant fire-giant frost-giant giant-eagle eagle roc griffon hippogriff wyvern
    manticore chimera basilisk giant-goat goat harpy ogre orc troll air-elemental gargoyle behir ettin
    saber-toothed-tiger berserker scout pteranodon magma-mephit fire-elemental azer azer-sentinel hell-hound
    tribal-warrior red-dragon-wyrmling young-red-dragon adult-red-dragon ancient-red-dragon
    silver-dragon-wyrmling young-silver-dragon adult-silver-dragon ancient-silver-dragon`),
  swamp: words(`
    lizardfolk crocodile giant-crocodile giant-frog frog giant-toad constrictor-snake giant-constrictor-snake
    poisonous-snake venomous-snake swarm-of-poisonous-snakes swarm-of-venomous-snakes swarm-of-insects stirge
    will-o-wisp green-hag night-hag shambling-mound hydra ghoul zombie ogre-zombie troll giant-lizard lizard
    hippopotamus otyugh ochre-jelly cultist bandit druid swarm-of-quippers quipper piranha swarm-of-piranhas
    giant-centipede giant-spider black-dragon-wyrmling young-black-dragon adult-black-dragon
    ancient-black-dragon`),
  underdark: words(`
    drow drider duergar deep-gnome-svirfneblin grimlock gibbering-mouther cloaker darkmantle roper shrieker
    shrieker-fungus violet-fungus purple-worm chuul otyugh gelatinous-cube black-pudding gray-ooze ochre-jelly
    aboleth giant-spider phase-spider spider minotaur troll ogre goblin bugbear xorn earth-elemental
    giant-fire-beetle swarm-of-beetles giant-bat bat swarm-of-bats rust-monster grick magmin hook-horror`),
  underwater: words(`
    giant-shark hunter-shark reef-shark killer-whale giant-octopus octopus giant-sea-horse giant-seahorse
    sea-horse seahorse quipper swarm-of-quippers piranha swarm-of-piranhas merfolk merfolk-skirmisher merrow
    sahuagin sahuagin-warrior sea-hag water-elemental dragon-turtle kraken aboleth plesiosaurus giant-crab
    crab archelon storm-giant`),
  urban: words(`
    commoner guard guard-captain noble priest priest-acolyte acolyte thug tough tough-boss bandit
    bandit-captain spy assassin veteran warrior-veteran knight mage archmage cultist cult-fanatic
    cultist-fanatic gladiator pirate pirate-captain scout rat giant-rat swarm-of-rats cat mastiff raven
    swarm-of-ravens wererat-human wererat-hybrid wererat-rat doppelganger vampire-vampire vampire-spawn
    vampire-familiar ghost specter imp quasit succubus incubus succubus-incubus rakshasa druid shield-guardian
    animated-armor homunculus gargoyle mule riding-horse draft-horse warhorse zombie skeleton`),
}

// The environments a monster is tagged with (SRD tags, or a homebrew monster's own list).
export function environmentsOf(monster: { index: string; environments?: string[] }): Environment[] {
  if (monster.environments?.length) return monster.environments as Environment[]
  return ENVIRONMENTS.filter((env) => MONSTERS_BY_ENVIRONMENT[env].includes(monster.index))
}
