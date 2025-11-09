const makeTalent = (id, name, options = {}) => ({
    id,
    name,
    maxRank: options.maxRank || 100,
    description: options.description || '',
    scaling: options.scaling || null,
    secondScaling: options.secondScaling || null,
    tags: options.tags || [],
    // kind: 'passive' | 'active' (default passive). activeType optionally: 'offensive'|'defensive'|'buff'
    kind: options.kind || 'passive',
    activeType: options.activeType || null
    ,
    // mana cost to activate this talent (for active talents). Consumers should check/consume this when using the skill.
    manaCost: (typeof options.manaCost === 'number') ? options.manaCost : (options.manaCost ? Number(options.manaCost) : 0),
    // cooldown in milliseconds for active talents (0 = none)
    cooldownMs: typeof options.cooldownMs === 'number' ? options.cooldownMs : (options.cooldownSeconds ? (options.cooldownSeconds * 1000) : 0)
});

const beginnerTalents = [
    makeTalent('sharpened_axe', 'Sharpened Axe', {
        description: 'Increase weapon damage by {value}%.',
        scaling: { type: 'flat', target: 'weaponDamage', base: 0.5, perRank: 0.5 },
        tags: ['combat', 'universal']
    }),
    makeTalent('quickness_boots', 'Quickness Boots', {
        description: 'Move with the shadows. Movement speed +{value}%.',
        scaling: { type: 'percent', target: 'movementSpeed', base: 3, perRank: 0.6 },
        tags: ['utility', 'movement']
    }),
    makeTalent('book_of_the_wise', 'Book of the Wise', {
        description: 'Wisdom in the dark. Experience gain +{value}%.',
        scaling: { type: 'percent', target: 'characterXpGain', base: 5, perRank: 1.5 },
        tags: ['progression']
    }),
    makeTalent('healthy_spirit', 'Healthy Spirit', {
        description: 'Endure the night. Max HP +{value}%.',
        scaling: { type: 'flat', target: 'maxHp', base: 10, perRank: 6 },
        tags: ['survivability']
    }),
    makeTalent('mana_pool', 'Mana Pool', {
        description: 'Expand your dark well. Max mana +{value}.',
        scaling: { type: 'flat', target: 'maxMana', base: 8, perRank: 5 },
        tags: ['mana']
    }),
    makeTalent('thick_skin', 'Thick Skin', {
        description: 'Harden your hide against attacks. Defense +{value}.',
        scaling: { type: 'flat', target: 'defense', base: 3, perRank: 2 },
        tags: ['survivability']
    }),
    makeTalent('work_ethic', 'Work Ethic', {
        description: 'Mine like the night never ends. Gathering XP +{value}%.',
        scaling: { type: 'percent', target: 'skillXpGain', base: 4, perRank: 1.25 },
        tags: ['progression', 'skills']
    }),
    makeTalent('resourcefulness', 'Resourcefulness', {
        description: 'Dig deep into the shadows. Gathering speed +{value}%.',
        scaling: { type: 'percent', target: 'gatherSpeed', base: 3, perRank: 0.7 },
        tags: ['skills']
    }),
    makeTalent('refined_reflexes', 'Refined Reflexes', {
        description: 'Move like a wraith. Attack speed +{value}%.',
        scaling: { type: 'percent', target: 'attackSpeed', base: 2, perRank: 0.5 },
        tags: ['combat']
    }),
    makeTalent('keen_eye', 'Keen Eye', {
        description: 'Strike true from the shadows. Critical strike chance +{value}%.',
        scaling: { type: 'percent', target: 'critChance', base: 1.5, perRank: 0.35 },
        tags: ['combat']
    }),
    makeTalent('precision_training', 'Precision Training', {
        description: 'Hit vital points for deadly strikes. Critical strike damage +{value}%.',
        scaling: { type: 'percent', target: 'critDmg', base: 5, perRank: 1.2 },
        tags: ['combat']
    }),
    makeTalent('loot_lure', 'Loot Lure', {
        description: 'Monsters drop more items, attracted to your shadowy presence. Item drop rate +{value}%.',
        scaling: { type: 'percent', target: 'dropRate', base: 4, perRank: 0.9 },
        tags: ['utility', 'loot']
    }),
    makeTalent('plus1str', "Str +1", {
        description: 'Strength for crushing bones. Increases Strength by {value}.',
        scaling: { type: 'flat', target: 'str', base: 1, perRank: 1 },
        tags: ['utility', 'combat']
    }),
    makeTalent('plus1int', "Int +1", {
        description: 'Intelligence for arcane mastery. Increases Intelligence by {value}.',
        scaling: { type: 'flat', target: 'int', base: 1, perRank: 1 },
        tags: ['utility', 'combat']
    }),
    makeTalent('plus1agi', 'Agi +1', {
        description: 'Agility for swift strikes. Increases Agility by {value}.',
        scaling: { type: 'flat', target: 'agi', base: 1, perRank: 1 },
        tags: ['utility', 'combat']
    })
];

const horrorTalents = [
    makeTalent('bonecrusher_training', 'Bonecrusher Smash', {
        description: 'Smash skulls like they owe you money. Deals {value}% more Bonecrusher damage. Stuns for 3 seconds.',
        scaling: { type: 'percent', target: 'boneSmashDamage', base: 120, perRank: 8 },
        tags: ['combat', 'horror', 'offensive'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 12,
        manaCost: 20
    }),
    makeTalent('rupture_form', 'Rupture Form', {
        description: 'Rip armor off like skin from a corpse. Armor shred effectiveness +{value}%.',
        scaling: { type: 'percent', target: 'armorShredPercent', base: 20, perRank: 2 },
        tags: ['combat', 'debuff', 'horror'],
        kind: 'active',
        activeType: 'defensive',
        cooldownSeconds: 10,
        manaCost: 15
    }),
    makeTalent('ghastly_drive', 'Ghastly Drive', {
        description: 'Dash through foes, leaving ghosts in your wake. Dash damage +{value}%.',
        scaling: { type: 'percent', target: 'dashDamage', base: 40, perRank: 5 },
        tags: ['mobility', 'damage'],
        kind: 'active',
        activeType: 'offensive',
        // base cooldown for the active dash in seconds
        cooldownSeconds: 8,
        manaCost: 20
    }),
    makeTalent('bloodstaked_guard', 'Bloodstaked Guard', {
        description: 'Steal life from the dying. {value}% lifesteal on melee hits.',
        scaling: { type: 'percent', target: 'lifesteal', base: 1.5, perRank: 0.35 },
        tags: ['sustain']
    }),
    makeTalent('flesh_of_iron', 'Flesh of Iron', {
        description: 'Turn your skin to iron, ignore the pain. Damage reduction +{value}.',
        scaling: { type: 'flat', target: 'damageReduction', base: 1, perRank: 0.6 },
        tags: ['survivability']
    }),
    makeTalent('terror_form', 'Terror Form', {
        description: 'Wear fear like a crown. Melee attackers take damage equal to {value}% of their max HP over 3 seconds if they get too close. Costs {secondValue} mana per second to maintain.',
        scaling: { type: 'percent', target: 'terrorAuraDamage', base: 5, perRank: 0.15 },
        secondScaling: { type: 'flat', target: 'manaCostPerSec', base: 5, perRank: 0.35 },
        tags: ['damage', 'aura'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 1,
        manaCost: 0
    }),
    makeTalent('money_pit', 'Money Pit', {
        description: 'Monsters drop more gold, because misery loves company. Gold drop rate +{value}%.',
        scaling: { type: 'percent', target: 'goldDropRate', base: 50, perRank: 1.1 },
        tags: ['utility', 'loot']
    }),
    makeTalent('dark_reaping', 'Dark Reaping', {
        description: 'Critical strikes that harvest souls. Critical strikes heal for {value}% of damage dealt.',
        scaling: { type: 'percent', target: 'critLifesteal', base: 10, perRank: 1.5 },
        tags: ['combat', 'sustain']
    }),
    makeTalent('sinister_strength', 'Sinister Strength', {
        description: 'Unleash dark power to crush your foes. Strength +{value}.',
        scaling: { type: 'flat', target: 'str', base: 1, perRank: 1 },
        tags: ['utility', 'combat']
    }),
    makeTalent('mining_madness', 'Mining Madness', {
        description: 'Mine like your life depends on it. Mining speed +{value}%.',
        scaling: { type: 'percent', target: 'miningSpeed', base: 4, perRank: 0.9 },
        tags: ['skills']
    }),
    makeTalent('mining_exp_gain', 'Mining Expertise', {
        description: 'Gain mining expertise faster. Mining experience gain +{value}%.',
        scaling: { type: 'percent', target: 'miningXpGain', base: 5, perRank: 1.2 },
        tags: ['progression', 'skills']
    }),
    makeTalent('cleave_mastery', 'Cleave Mastery', {
        description: 'Your auto-attacks hit multiple enemies. Melee attacks gain additional targets ({secondValue} extra targets at current rank, max 6). Cleave does {value}% damage to secondary targets.',
        scaling: { type: 'percent', target: 'cleaveDamage', base: 30, perRank: 0.8 },
        // secondary scaling encodes "extra targets per rank" so computeTalentModifiers and UI can use it
        secondScaling: { type: 'flat', target: 'cleaveExtraTargets', base: 0, perRank: 0.04 },
        // runtime/UI can clamp this to the authored maximum
        maxExtraTargets: 6,
        tags: ['combat', 'aoe']
    }),
    makeTalent('hoarding_instincts', 'Hoarding Instincts', {
        description: 'Gain {value} more weapon damage for every power of 10 gold you carry.',
        scaling: { type: 'flat', target: 'goldWeaponDamage', base: 2, perRank: 0.25 },
        tags: ['combat', 'scaling']
    }),
    makeTalent('heavy_hitter', 'Heavy Hitter', {
        description: 'Regular attacks have a chance to cause bleeding. Bleed chance +{value}%. Bleed deals {secondValue}% of attack damage over 5 seconds.',
        scaling: { type: 'percent', target: 'bleedChance', base: 3, perRank: 1.5 },
        secondScaling: { type: 'percent', target: 'bleedDamagePercent', base: 20, perRank: 3 },
        tags: ['combat', 'damage']
    }),
    makeTalent('unholy_frenzy', 'Unholy Frenzy', {
        description: 'Every {secondValue} seconds, enter a frenzied state, increasing attack speed by {value}% for 8 seconds.',
        scaling: { type: 'percent', target: 'frenzyAttackSpeed', base: 15, perRank: 2.5 },
        secondScaling: { type: 'flat', target: 'frenzyCooldownSeconds', base: 30, perRank: -0.2 },
        tags: ['combat', 'buff']
    })
];

const occultistTalents = [
    makeTalent('sigilcraft', 'Sigilcraft', {//works
        description: 'Draw forbidden symbols that explode in faces. Sigil damage +{value}%.',
        scaling: { type: 'percent', target: 'sigilDamage', base: 80, perRank: 8.75 },
        tags: ['combat', 'occultist'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 10,
        manaCost: 300
    }),
    makeTalent('mana_shield', 'Mana Shield', {
        description: 'Your will hardens into a shimmering bulwark. Convert a portion of your max mana into a regenerative shield. Shield strength +{value}%. Restores {secondValue} mana/sec while out of combat.',
        scaling: { type: 'percent', target: 'manaShieldStrength', base: 15, perRank: 0.6 },
        secondScaling: { type: 'flat', target: 'manaShieldRegenPerSec', base: 1, perRank: 0.25 },
        tags: ['mana', 'defensive', 'occultist', 'passive'],
        kind: 'passive'
    }),
    makeTalent('hex_engine', 'Hex Engine', {//works
        description: 'Teleport through curses, because walking is for mortals. Blink cooldown -{value}s.',
        // Scoped target so the talent only affects its own cooldown value
        scaling: { type: 'flat', target: 'hex_engine.cooldownSeconds', base: 12, perRank: -0.07 },
        tags: ['mobility', 'occultist'],
        kind: 'active',
        activeType: 'buff',
        // base cooldown in seconds (UI consumers use cooldownMs / cooldownSeconds)
        cooldownSeconds: 12,
        manaCost: 50
    }),
    makeTalent('void_path', 'Void Path', {//works
        description: 'Absence follows in your footsteps. Leave short‑lived void zones along your path that each deal {value}% damage once to enemies who enter. Zones last 1.2s. Zone radius = {secondValue}px + per‑rank increases.',
        scaling: { type: 'percent', target: 'voidPathDamage', base: 6, perRank: 2.25 },
        secondScaling: { type: 'flat', target: 'voidPathRadius', base: 22, perRank: 0.2 },
        tags: ['movement', 'aoe', 'occultist'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 14,
        manaCost: 150,
        // Note: placement interval and max concurrent zones are runtime-tuned in code and are not expressed via scaling fields.
    }),
    makeTalent('dark_shield', 'Dark Shield', {
        description: 'When the void gazes back, it shelters you. Gain a magic shield when health drops below a threshold. Shield strength +{value}% (scales with max mana).',
        scaling: { type: 'percent', target: 'magicShield', base: 5, perRank: 0.45 },
        tags: ['survivability', 'occultist'],
        kind: 'passive'
    }),
    makeTalent('rune_overflow', 'Rune Overflow', {
        description: 'Crits that refill your dark well. Crit mana refund +{value}%.',
        scaling: { type: 'percent', target: 'critManaRefund', base: 15, perRank: 1.5 },
        tags: ['mana', 'crit', 'occultist']
    }),
    makeTalent('astral_acuity', 'Astral Acuity', {
        description: 'Spells that pierce the veil of reality. Spell crit chance +{value}%.',
        scaling: { type: 'percent', target: 'spellCritChance', base: 2.5, perRank: 0.5 },
        tags: ['combat', 'occultist']
    }),
    makeTalent('abyssal_conjurer', 'Abyssal Conjurer', {//added
        description: 'Your kills tear seams in reality. On kill, {value}% chance to conjure a minor abyssal ally for a short time.',
        scaling: { type: 'percent', target: 'abyssalSummonChance', base: 6, perRank: 1.1 },
        tags: ['summon', 'occultist'],
        kind: 'passive'
    }),
    makeTalent('blood_ritual_reserve', 'Blood Ritual Reserve', {//works
        description: 'Bleed the body to feed the mind. Costs {value}% of max HP per second and restores {secondValue}% mana per second while channeled. Cancelling ends the channel.',
        scaling: { type: 'percent', target: 'bloodRitualHpCostPerSec', base: 2, perRank: 0.4 },
        secondScaling: { type: 'percent', target: 'bloodRitualManaGainPerSec', base: 6, perRank: 1.0 },
        tags: ['mana', 'channel', 'occultist'],
        kind: 'active',
        activeType: 'utility',
        cooldownSeconds: 10,
        manaCost: 150
    }),
    makeTalent('planar_echo', 'Planar Echo', {
        description: 'Spells that echo from the void. Spell duplicate chance +{value}%.',
        scaling: { type: 'percent', target: 'spellDuplicate', base: 3, perRank: 0.6 },
        tags: ['combat', 'occultist']
    }),
    makeTalent('glyphic_anchor', 'Glyphic Anchor', {
        description: 'Stand still, embrace the void. Standing damage reduction +{value}% (stacks to 3).',
        scaling: { type: 'percent', target: 'standingDR', base: 3, perRank: 0.7 },
        tags: ['survivability', 'occultist'],
        kind: 'passive'
    }),
    makeTalent('forbidden_balls', 'Forbidden Balls', {//works
        description: 'Set hungry stars loose. Launch homing void orbs that seek the nearest enemy and explode on impact. Orbs spawn one every 0.2s. Fires {value} orb(s). Each orb deals {secondValue}% of your Spell DMG on hit, then crits and enemy reductions apply.',
        scaling: { type: 'flat', target: 'forbiddenBalls.count', base: 2, perRank: 1 },
        // Rebalanced: rank 1 = 22%, rank 100 = 165% using base + per*(rank-1). per = (165-22)/99 ≈ 1.4444
        secondScaling: { type: 'percent', target: 'forbiddenBalls.damage', base: 22, perRank: 1.45 },
        tags: ['aoe', 'offensive', 'occultist'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 14,
        manaCost: 250,
        // Note: launch gap and orb physics are runtime-tuned in code and not expressed via scaling fields.
    }),
    makeTalent('shadow_mosaic', 'Shadow Mosaic', {
        description: 'Damage from the spaces between worlds. Shadow damage +{value}%. Some attacks may hit an additional time.',
        scaling: { type: 'percent', target: 'shadowDamage', base: 7, perRank: 0.7 },
        tags: ['damage', 'occultist']
    }),
    makeTalent('wood_lover', 'Staff Mastery', {
        description: 'Increase staff damage and handling. Staff damage +{value}%.',
        scaling: { type: 'percent', target: 'staffDamage', base: 8, perRank: 1.2 },
        tags: ['combat', 'occultist']
    }),
    makeTalent('occult_resurgence', 'Occult Resurgence', {
        description: 'Spells that bend time. Cooldown reset chance +{value}%.',
        scaling: { type: 'percent', target: 'cooldownResetChance', base: 1.5, perRank: 0.25 },
        tags: ['utility', 'occultist']
    })
];

const stalkerTalents = [
    makeTalent('eagle_eye', 'Eagle Shot', { // cleaned
        description: 'Shoot eyes out from afar, like a true coward. Eagle Shot damage +{value}%.',
        scaling: { type: 'percent', target: 'eagleShotDamage', base: 35, perRank: 5 },
        tags: ['combat', 'stalker', 'offensive'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 7
    }),
    makeTalent('shadowstep', 'Shadowstep', { //works
        description: 'Step into shadows, because facing reality is hard. Blink, enter stealth, and block all damage for {value} seconds. The first attack breaks stealth and deals a guaranteed critical hit.',
        scaling: { type: 'flat', target: 'shadowstepDuration', base: 3, perRank: 0.07 },
        tags: ['mobility', 'defensive', 'offensive', 'stalker'],
        kind: 'active',
        activeType: 'defensive',
        cooldownSeconds: 12
   }),
    makeTalent('knife_swarm', 'Knife Swarm', { //works
        description: 'Throw knives everywhere, hope one hits. Knife damage +{value}%. Spawns {secondValue} extra knives at current rank. Damage scales with Attack base (weapon avg + 1.1×AGI + 0.35×LUK).',
        scaling: { type: 'percent', target: 'knifeDamage', base: 15, perRank: 0.45 },
        secondScaling: { type: 'flat', target: 'knifeCount', base: 8, perRank: 0.22 },
        tags: ['aoe', 'combat'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 1.5,
        manaCost: 8
    }),
    makeTalent('razor_feathers', 'Razor Feathers', {//added
        description: 'Critical hits cause cuts that keep bleeding. Your crits apply an additional DoT equal to {value}% of the crit damage over a short duration.',
        scaling: { type: 'percent', target: 'critDoT', base: 8, perRank: 1.6 },
        tags: ['combat']
    }),
    makeTalent('poison_weapons', 'Poison Weapons', {//added
        description: 'Coat your blades in venom. Poison damage +{value}%.',
        scaling: { type: 'percent', target: 'poisonDamage', base: 70, perRank: 1.2 },
        tags: ['damage']
    }),
    makeTalent('silent_steps', 'Silent Steps', {//added
        description: 'Move unheard, strike harder. On a critical hit, consume Stealth Points in chunks of 10; each chunk adds {value}% critical damage to that crit.',
        scaling: { type: 'percent', target: 'silentCritDmg', base: 25, perRank: 5 },
        tags: ['utility']
    }),
    makeTalent('five_finger_discount', '5 Finger Discount', {//added (id normalized)
        description: 'Sticky fingers, heavier purse. Gold gained +{value}%.',
        scaling: { type: 'percent', target: 'goldGain', base: 6, perRank: 1.1 },
        tags: ['utility']
    }),
    makeTalent('hunter_s_formula', "Hunter's Formula", {//added
        description: 'Study the toxin’s path. Deal {value}% increased damage to poisoned targets.',
        scaling: { type: 'percent', target: 'poisonTargetBonus', base: 9, perRank: 1.5 },
        tags: ['combat']
    }),
    makeTalent('needle_rain', 'Needle Rain', { //works
        description: 'Call down {value} needles that each deal +{secondValue}% of your Attack base. Scales with Attack base (weapon avg + 1.1×AGI + 0.35×LUK).',
        scaling: { type: 'flat', target: 'projectileCount', base: 15, perRank: 0.5 },
        secondScaling: { type: 'percent', target: 'needleRainDamage', base: 5, perRank: 1.5 },
        tags: ['aoe', 'combat'],
        kind: 'active',
        activeType: 'offensive',
        manaCost: 12,
        cooldownSeconds: 10
    }),
    makeTalent('ambush_mastery', 'Ambush Mastery', { // cleaned
        description: 'Strike from the dark with terrible efficiency. Your first attack when exiting stealth deals an additional {value}% damage and increases critical damage by {secondValue}% for 4s.',
        scaling: { type: 'percent', target: 'stealthAttackDamage', base: 22, perRank: 1.25 },
        secondScaling: { type: 'percent', target: 'stealthCritDmg', base: 15, perRank: 1.5 },
        tags: ['stalker', 'combat', 'stealth']
    }),
    makeTalent('toxic_precision', 'Toxic Precision', {//added
        description: 'Aim for the vein. Chance to apply poison +{value}%.',
        scaling: { type: 'percent', target: 'poisonApplyChance', base: 12, perRank: 1.8 },
        tags: ['combat', 'poison']
    }),
    makeTalent('marksman_focus', 'Marksman Focus', {//added
        description: 'Focus your aim for deadlier shots. Eagle Shot gains +{value}% crit chance and +{secondValue}% critical damage while standing still for 1s.',
        scaling: { type: 'percent', target: 'eagleCritChance', base: 8, perRank: 1.2 },
        secondScaling: { type: 'percent', target: 'eagleCritDmg', base: 18, perRank: 2 },
        tags: ['stalker', 'combat', 'precision']
    }),
    makeTalent('camouflage_cache', 'Camouflage Cache', {//added
        description: 'Hide the spoils of your craft. Backstabs or stealth kills grant increased rewards: drop rate +{value}% and gold +{secondValue}%.',
        scaling: { type: 'percent', target: 'dropRate', base: 8, perRank: 1.5 },
        secondScaling: { type: 'percent', target: 'goldGain', base: 6, perRank: 1 },
        tags: ['utility', 'loot', 'stalker']
    }),
    makeTalent('evasive_flourish', 'Evasive Flourish', { //added
        description: 'When you exit Shadowstep or other stealths you gain a brief dodge chance and a short haste burst. Dodge chance +{value}% and haste +{secondValue}% for 3s.',
        scaling: { type: 'percent', target: 'postStealthDodge', base: 6, perRank: 1 },
        secondScaling: { type: 'percent', target: 'postStealthHaste', base: 10, perRank: 1.2 },
        tags: ['survivability', 'mobility', 'stalker']
    })
    ,
    makeTalent('ricochet_calibration', 'Ricochet Calibration', {//added
        description: 'Tune your eagle eye to strike more than one foe. Ricochet hits have +{value}% crit chance.',
        scaling: { type: 'percent', target: 'eagleCritChance', base: 4, perRank: 0.6 },
        tags: ['aoe', 'stalker', 'combat']
    })
];

const ravagerTalents = [
    makeTalent('severance', 'Severance', {
        description: 'Cut wages, then throats. Execute threshold +{value}%.',
        scaling: { type: 'percent', target: 'executeThreshold', base: 5, perRank: 1 },
        tags: ['combat', 'ravager']
    }),
    makeTalent('brutal_chain', 'Brutal Chain', {
        description: 'Iron sermons preached link by link. Chain damage +{value}% per bounce.',
        scaling: { type: 'percent', target: 'chainDamage', base: 7, perRank: 1.4 },
        tags: ['combat']
    }),
    makeTalent('savage_rush', 'Savage Rush', {
        description: 'No brakes, only targets. Charge efficiency +{value}%.',
        scaling: { type: 'percent', target: 'chargeEfficiency', base: 6, perRank: 1.1 },
        tags: ['mobility', 'combat']
    }),
    makeTalent('bone_ward', 'Bone Ward', {
        description: 'Wear the fallen as policy. Elite shield +{value}% max HP.',
        scaling: { type: 'percent', target: 'eliteShield', base: 30, perRank: 3 },
        tags: ['survivability']
    }),
    makeTalent('warpath', 'Warpath', {
        description: 'Footprints that bruise the world. Movement damage stack +{value}.',
        scaling: { type: 'flat', target: 'movementDamageStack', base: 0.2, perRank: 0.05 },
        tags: ['combat']
    }),
    makeTalent('blood_roar', 'Blood Roar', {
        description: 'A roar that taxes the living. Taunt damage buff +{value}%.',
        scaling: { type: 'percent', target: 'tauntDamageBuff', base: 8, perRank: 1.1 },
        tags: ['combat']
    }),
    makeTalent('hemorrhage_engine', 'Hemorrhage Engine', {
        description: 'Turn arteries into engines. Bleed target damage +{value}%.',
        scaling: { type: 'percent', target: 'bleedTargetDamage', base: 10, perRank: 1.6 },
        tags: ['damage']
    }),
    makeTalent('gorewheel', 'Gorewheel', {
        description: 'Spin the room into paste. Spin extra hits +{value}.',
        scaling: { type: 'flat', target: 'spinExtraHits', base: 0, perRank: 0.05 },
        tags: ['aoe']
    }),
    makeTalent('echoing_rage', 'Echoing Rage', {
        description: 'Let fury rebound. Shout reset +{value}%.',
        scaling: { type: 'percent', target: 'shoutReset', base: 4, perRank: 0.7 },
        tags: ['utility']
    }),
    makeTalent('martyr_pact', 'Martyr Pact', {
        description: 'Save the ache, spend it all at once. Damage stored +{value}%.',
        scaling: { type: 'percent', target: 'damageStored', base: 12, perRank: 1.8 },
        tags: ['combat']
    }),
    makeTalent('flesh_harvest', 'Flesh Harvest', {
        description: 'Elites die with interest. Elite drop rate +{value}%.',
        scaling: { type: 'percent', target: 'eliteDropRate', base: 6, perRank: 1 },
        tags: ['loot']
    }),
    makeTalent('titan_grip', 'Titan Grip', {
        description: 'Two hands, one verdict. Two-hand defense +{value}%.',
        scaling: { type: 'percent', target: 'twoHandDefense', base: 4, perRank: 0.8 },
        tags: ['survivability']
    }),
    makeTalent('rupture_field', 'Rupture Field', {
        description: 'Slam until the ground files a complaint. Field damage +{value}%.',
        scaling: { type: 'percent', target: 'slamFieldDamage', base: 14, perRank: 1.5 },
        tags: ['aoe']
    }),
    makeTalent('gory_dividend', 'Gory Dividend', {
        description: 'Refunds, but grislier. Tab refund chance +{value}%.',
        scaling: { type: 'percent', target: 'tab3Refund', base: 3, perRank: 0.5 },
        tags: ['utility']
    }),
    makeTalent('cataclysmic_drive', 'Cataclysmic Drive', {
        description: 'Bleeds that write history. Ultimate bleed bonus +{value}%.',
        scaling: { type: 'percent', target: 'ultimateBleedBonus', base: 5, perRank: 1 },
        tags: ['damage']
    })
];

const sanguineTalents = [
    makeTalent('blood_ritual', 'Blood Ritual', {
        description: 'Sacrifice your lifeblood for power. Blood sacrifice damage +{value}%.',
        scaling: { type: 'percent', target: 'bloodSacrificeDamage', base: 15, perRank: 2 },
        tags: ['combat', 'sanguine', 'offensive'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 20,
        manaCost: 0
    }),
    makeTalent('vampiric_touch', 'Vampiric Touch', {
        description: 'Steal life from the dying. Vampiric heal +{value}%.',
        scaling: { type: 'percent', target: 'vampiricHeal', base: 3, perRank: 0.6 },
        tags: ['sustain']
    }),
    makeTalent('hematic_burst', 'Hematic Burst', {
        description: 'Explode in a fountain of blood. Hematic burst damage +{value}%.',
        scaling: { type: 'percent', target: 'hematicBurstDamage', base: 50, perRank: 5 },
        tags: ['combat', 'aoe', 'sanguine'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 30,
        manaCost: 0
    }),
    makeTalent('crimson_wave', 'Crimson Wave', {
        description: 'Dash through blood and guts. Crimson trail damage +{value}%.',
        scaling: { type: 'percent', target: 'crimsonTrailDamage', base: 25, perRank: 3 },
        tags: ['mobility', 'damage', 'sanguine'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 15,
        manaCost: 0
    }),
    makeTalent('life_leech', 'Life Leech', {
        description: 'Crits that suck the soul dry. Crit heal +{value}%.',
        scaling: { type: 'percent', target: 'critHeal', base: 5, perRank: 1 },
        tags: ['sustain']
    }),
    makeTalent('blood_fury', 'Blood Fury', {
        description: 'Rage fueled by your own blood. Blood fury speed +{value}%.',
        scaling: { type: 'percent', target: 'bloodFurySpeed', base: 2, perRank: 0.4 },
        tags: ['combat']
    }),
    makeTalent('sanguine_barrier', 'Sanguine Barrier', {
        description: 'Turn pain into protection. Damage to shield +{value}%.',
        scaling: { type: 'percent', target: 'damageToShield', base: 8, perRank: 1.2 },
        tags: ['survivability']
    }),
    makeTalent('arterial_spray', 'Arterial Spray', {
        description: 'Bleeds that paint the world red. Bleed damage amplified by {value}%.',
        scaling: { type: 'percent', target: 'bleedAmplify', base: 10, perRank: 1.5 },
        tags: ['damage']
    }),
    makeTalent('carnal_knowledge', 'Carnal Knowledge', {
        description: 'Learn from the dead. Kill XP bonus +{value}%.',
        scaling: { type: 'percent', target: 'killXpBonus', base: 5, perRank: 1 },
        tags: ['progression']
    }),
    makeTalent('blood_oath', 'Blood Oath', {
        description: 'Oaths sealed in blood. Blood oath damage +{value}%.',
        scaling: { type: 'percent', target: 'bloodOathDamage', base: 6, perRank: 1 },
        tags: ['combat']
    }),
    makeTalent('hemoglobin_haste', 'Hemoglobin Haste', {
        description: 'Speed from the brink of death. Low HP speed +{value}%.',
        scaling: { type: 'percent', target: 'lowHpSpeed', base: 8, perRank: 1.2 },
        tags: ['mobility']
    }),
    makeTalent('vital_transfusion', 'Vital Transfusion', {
        description: 'Share the pain with allies. Transfusion heal +{value}%.',
        scaling: { type: 'percent', target: 'transfusionHeal', base: 4, perRank: 0.8 },
        tags: ['support']
    }),
    makeTalent('crimson_tide', 'Crimson Tide', {
        description: 'AOE that bathes you in blood. AOE heal +{value}%.',
        scaling: { type: 'percent', target: 'aoeHeal', base: 6, perRank: 1 },
        tags: ['sustain']
    }),
    makeTalent('sanguine_refund', 'Sanguine Refund', {
        description: 'Respecs paid in pints. Tab refund chance +{value}%.',
        scaling: { type: 'percent', target: 'tab4Refund', base: 4, perRank: 0.6 },
        tags: ['utility']
    }),
    makeTalent('blood_moon', 'Blood Moon', {
        description: 'Damage under the crimson sky. Night damage bonus +{value}%.',
        scaling: { type: 'percent', target: 'nightDamageBonus', base: 7, perRank: 1.1 },
        tags: ['situational']
    })
];

const hexweaverTalents = [
    makeTalent('threads_of_ruin', 'Threads of Ruin', {
        description: 'Lay a pattern that unravels marrow. Hex damage +{value}%.',
        scaling: { type: 'percent', target: 'hexDamage', base: 8, perRank: 1.5 },
        tags: ['combat', 'hexweaver']
    }),
    makeTalent('curse_quilt', 'Curse Quilt', {
        description: 'Patch them in malice, stitch by stitch. Curse stacks +{value}%.',
        scaling: { type: 'percent', target: 'curseStacks', base: 6, perRank: 1 },
        tags: ['control']
    }),
    makeTalent('loomed_insight', 'Loomed Insight', {
        description: 'Every stitch hums a secret. Spell haste +{value}% per curse.',
        scaling: { type: 'percent', target: 'curseSpellHaste', base: 3, perRank: 0.5 },
        tags: ['utility']
    }),
    makeTalent('fate_spindle', 'Fate Spindle', {
        description: 'Spin until fate frays. Curse duplicate chance +{value}%.',
        scaling: { type: 'percent', target: 'curseDuplicate', base: 4, perRank: 0.8 },
        tags: ['control']
    }),
    makeTalent('hexed_ward', 'Hexed Ward', {
        description: 'Wear their maledictions as mail. Hexed DR +{value}%.',
        scaling: { type: 'percent', target: 'hexedDamageReduction', base: 7, perRank: 1.1 },
        tags: ['survivability']
    }),
    makeTalent('loomed_bargain', 'Loomed Bargain', {
        description: 'Reweave the hurt; charge interest. Curse refresh damage +{value}%.',
        scaling: { type: 'percent', target: 'curseRefreshDamage', base: 5, perRank: 0.9 },
        tags: ['utility']
    }),
    makeTalent('pattern_of_wither', 'Pattern of Wither', {
        description: 'Trace sigils that rot from within. Decay damage +{value}%.',
        scaling: { type: 'percent', target: 'decayDamage', base: 9, perRank: 1.4 },
        tags: ['damage']
    }),
    makeTalent('woven_refrain', 'Woven Refrain', {
        description: 'Shelter allies beneath your tapestry. Ally DR +{value}%.',
        scaling: { type: 'percent', target: 'allyDamageReduction', base: 3, perRank: 0.6 },
        tags: ['support']
    }),
    makeTalent('weftwalker', 'Weftwalker', {
        description: 'Walk the spaces between threads. Teleport efficiency +{value}%.',
        scaling: { type: 'percent', target: 'teleportEfficiency', base: 8, perRank: 1.3 },
        tags: ['mobility']
    }),
    makeTalent('hexbound_vectors', 'Hexbound Vectors', {
        description: 'Send hexes down every seam. Curse spread +{value}.',
        scaling: { type: 'flat', target: 'curseSpread', base: 0, perRank: 0.04 },
        tags: ['control']
    }),
    makeTalent('forged_dread', 'Forged Dread', {
        description: 'Beat dread into steel. Boss damage +{value}%.',
        scaling: { type: 'percent', target: 'bossDamage', base: 5, perRank: 1 },
        tags: ['combat']
    }),
    makeTalent('counterwoven', 'Counterwoven', {
        description: 'Stitch pain back into the sender. Retaliate chance +{value}%.',
        scaling: { type: 'percent', target: 'retaliateChance', base: 4, perRank: 0.7 },
        tags: ['utility']
    }),
    makeTalent('loomed_attunement', 'Loomed Attunement', {
        description: 'Drink mana through every curse-thread. Mana per curse +{value}.',
        scaling: { type: 'flat', target: 'manaPerCurse', base: 2, perRank: 0.6 },
        tags: ['mana']
    }),
    makeTalent('hexing_spiral', 'Hexing Spiral', {
        description: 'Spiral stitches that chase them down. Moving DOT tick +{value}%.',
        scaling: { type: 'percent', target: 'movingDotTick', base: 5, perRank: 0.9 },
        tags: ['damage']
    }),
    makeTalent('loomkeepers_promise', "Loomkeeper's Promise", {
        description: 'The loom remembers its debts. Hexweaver refund chance +{value}%.',
        scaling: { type: 'percent', target: 'hexweaverRefund', base: 3, perRank: 0.5 },
        tags: ['utility']
    })
];

const astralScribeTalents = [
    makeTalent('chronicle_of_time', 'Chronicle of Time', {
        description: 'Write your name in the margins of hours. Time magic damage +{value}%.',
        scaling: { type: 'percent', target: 'timeMagicDamage', base: 7, perRank: 1.4 },
        tags: ['combat', 'astral_scribe']
    }),
    makeTalent('temporal_buffer', 'Temporal Buffer', {
        description: 'Put pain on layaway. Store {value}% of incoming damage and pay it out over 6 seconds.',
        scaling: { type: 'percent', target: 'temporalStore', base: 10, perRank: 1.6 },
        tags: ['survivability']
    }),
    makeTalent('gravity_well', 'Gravity Well', {
        description: 'Space is a suggestion. Time rifts pull {value}% farther.',
        scaling: { type: 'percent', target: 'riftRadius', base: 6, perRank: 1 },
        tags: ['control']
    }),
    makeTalent('stellar_guidance', 'Stellar Guidance', {
        description: 'The stars hum; you move. Allies under your guiding stars gain {value}% haste.',
        scaling: { type: 'percent', target: 'allyHaste', base: 5, perRank: 0.9 },
        tags: ['support']
    }),
    makeTalent('chronomantic_charge', 'Chronomantic Charge', {
        description: 'Steal seconds from the cast bar. Heavy spell charge time −{value}%.',
        scaling: { type: 'percent', target: 'chargeReduction', base: 8, perRank: 1.2 },
        tags: ['utility']
    }),
    makeTalent('stellar_resonance', 'Stellar Resonance', {
        description: 'Let dying stars linger. Damage amplifiers last {value}% longer.',
        scaling: { type: 'percent', target: 'buffDuration', base: 6, perRank: 1 },
        tags: ['support']
    }),
    makeTalent('event_horizon', 'Event Horizon', {
        description: 'Edge of the abyss. Black hole damage +{value}%.',
        scaling: { type: 'percent', target: 'blackHoleDamage', base: 9, perRank: 1.5 },
        tags: ['damage']
    }),
    makeTalent('constellation_map', 'Constellation Map', {
        description: 'Cartography of the carcass sky. Star trails grant {value}% more loot.',
        scaling: { type: 'percent', target: 'trailLoot', base: 5, perRank: 0.9 },
        tags: ['loot']
    }),
    makeTalent('retrograde_step', 'Retrograde Step', {
        description: 'Walk backward out of a mistake. Blink reverses {value}% of damage taken in the last 2s.',
        scaling: { type: 'percent', target: 'blinkHeal', base: 12, perRank: 1.4 },
        tags: ['survivability']
    }),
    makeTalent('starlit_ink', 'Starlit Ink', {
        description: 'Dip your quill in nebulae. Spells cost {value}% less mana.',
        scaling: { type: 'percent', target: 'manaCostReduction', base: 4, perRank: 0.7 },
        tags: ['mana']
    }),
    makeTalent('celestial_alignment', 'Celestial Alignment', {
        description: 'When the heavens misbehave, capitalize. Damage +{value}% during celestial events.',
        scaling: { type: 'percent', target: 'celestialDamage', base: 8, perRank: 1.2 },
        tags: ['situational']
    }),
    makeTalent('time_loop', 'Time Loop', {
        description: 'Finish a spell, lose a cooldown. {value}% chance to reset a random one.',
        scaling: { type: 'percent', target: 'cooldownResetChance', base: 2, perRank: 0.35 },
        tags: ['utility']
    }),
    makeTalent('astral_projection', 'Astral Projection', {
        description: 'Step out of yourself and make it hurt. Projection damage +{value}%, lasts longer.',
        scaling: { type: 'percent', target: 'projectionDamage', base: 7, perRank: 1.1 },
        tags: ['damage']
    }),
    makeTalent('epochal_record', 'Epochal Record', {
        description: 'Let the minutes pile up, and so does your damage. Each minute in combat grants {value}% spell damage (stacks 5).',
        scaling: { type: 'percent', target: 'combatScaling', base: 1.5, perRank: 0.3 },
        tags: ['damage']
    }),
    makeTalent('scribe_dividend', 'Scribe Dividend', {
        description: 'The ledger of stars pays out. {value}% chance to refund Astral Scribe points when respeccing.',
        scaling: { type: 'percent', target: 'astralRefund', base: 3, perRank: 0.5 },
        tags: ['utility']
    })
];

const nightbladeTalents = [
    makeTalent('umbral_edge', 'Umbral Edge', {
        description: 'Stab them in the back, because trust is for fools. Backstab damage increased by {value}%.',
        scaling: { type: 'percent', target: 'backstabDamage', base: 9, perRank: 1.7 },
        tags: ['combat', 'nightblade']
    }),
    makeTalent('shadow_fade', 'Shadow Fade', {
        description: 'Melt into the hush. While in stealth, movement speed +{value}%.',
        scaling: { type: 'percent', target: 'stealthSpeed', base: 6, perRank: 1 },
        tags: ['mobility']
    }),
    makeTalent('cloak_of_silence', 'Cloak of Silence', {
        description: 'Close the throat of the fight. Stealth abilities silence for {value}s.',
        scaling: { type: 'flat', target: 'silenceDuration', base: 0.4, perRank: 0.05 },
        tags: ['control']
    }),
    makeTalent('lethal_precision', 'Lethal Precision', {
        description: 'Make the last mistake look intentional. Crit chance +{value}%.',
        scaling: { type: 'percent', target: 'critChance', base: 3, perRank: 0.6 },
        tags: ['combat']
    }),
    makeTalent('shadow_mantle', 'Shadow Mantle', {
        description: 'Step out of sight, step out of harm. Damage taken −{value}% for 3s after leaving stealth.',
        scaling: { type: 'percent', target: 'postStealthDR', base: 12, perRank: 1.6 },
        tags: ['survivability']
    }),
    makeTalent('nightfall_poison', 'Nightfall Poison', {
        description: 'Moonlit venom does the talking. Poison damage +{value}%.',
        scaling: { type: 'percent', target: 'poisonDamage', base: 8, perRank: 1.4 },
        tags: ['damage']
    }),
    makeTalent('evasive_assault', 'Evasive Assault', {
        description: 'Slip the blade, take the tempo. Dodging grants {value}% haste for 4s.',
        scaling: { type: 'percent', target: 'dodgeHaste', base: 6, perRank: 1 },
        tags: ['utility']
    }),
    makeTalent('dark_affinity', 'Dark Affinity', {
        description: 'Night is an accomplice. Damage +{value}% at night.',
        scaling: { type: 'percent', target: 'nightDamage', base: 8, perRank: 1.3 },
        tags: ['situational']
    }),
    makeTalent('blade_dancer', 'Blade Dancer', {
        description: 'Footwork writes obituaries. Each consecutive hit in 3s adds {value}% damage (stacks 5).',
        scaling: { type: 'percent', target: 'comboDamage', base: 1.5, perRank: 0.3 },
        tags: ['combat']
    }),
    makeTalent('silent_finish', 'Silent Finish', {
        description: 'No witnesses. A kill from stealth grants {value}% crit for 5s.',
        scaling: { type: 'percent', target: 'stealthKillCrit', base: 10, perRank: 1.5 },
        tags: ['combat']
    }),
    makeTalent('smoke_bombard', 'Smoke Bombard', {
        description: 'Cough, then collapse. Smoke bombs deal {value}% more damage and slow.',
        scaling: { type: 'percent', target: 'smokeDamage', base: 12, perRank: 1.8 },
        tags: ['aoe']
    }),
    makeTalent('voidstep', 'Voidstep', {
        description: 'Slip between heartbeats. Blink distance +{value}% and a brief invulnerability.',
        scaling: { type: 'percent', target: 'blinkEfficiency', base: 7, perRank: 1.2 },
        tags: ['mobility']
    }),
    makeTalent('twilight_pursuit', 'Twilight Pursuit', {
        description: 'If they run, they bleed. Damage +{value}% against fleeing enemies.',
        scaling: { type: 'percent', target: 'pursuitDamage', base: 6, perRank: 1 },
        tags: ['combat']
    }),
    makeTalent('nightstalkers_mark', "Nightstalker's Mark", {
        description: 'A little ink, a lot of pain. Marked targets take {value}% more damage from stealth attacks.',
        scaling: { type: 'percent', target: 'markDamage', base: 9, perRank: 1.4 },
        tags: ['combat']
    }),
    makeTalent('veiled_dividend', 'Veiled Dividend', {
        description: 'Respecs shrouded in eternal night. Gain {value}% chance to refund Nightblade talent points when respeccing.',
        scaling: { type: 'percent', target: 'nightbladeRefund', base: 3, perRank: 0.5 },
        tags: ['utility']
    })
];

const shadeDancerTalents = [
    makeTalent('phantom_pierce', 'Phantom Pierce', {
        description: 'Pierce through flesh and bone like a bad memory. Projectile penetration increased by {value}%.',
        scaling: { type: 'percent', target: 'projectilePenetration', base: 7, perRank: 1.2 },
        tags: ['combat', 'shade_dancer']
    }),
    makeTalent('dancing_shadows', 'Dancing Shadows', {
        description: 'Dance with death\'s shadow, because your own is boring. Casting shadow dance grants {value}% dodge for 4s.',
        scaling: { type: 'percent', target: 'shadowDodge', base: 10, perRank: 1.5 },
        tags: ['survivability']
    }),
    makeTalent('mirror_feint', 'Mirror Feint', {
        description: 'Create illusions of yourself, because who wants the real you? {value}% chance to create a decoy when hit.',
        scaling: { type: 'percent', target: 'decoyChance', base: 5, perRank: 0.9 },
        tags: ['utility']
    }),
    makeTalent('gloomstep', 'Gloomstep', {
        description: 'Step into the abyss, emerge before it notices. Shadow dash cooldown reduced by {value}%.',
        scaling: { type: 'percent', target: 'shadowDashCooldown', base: 8, perRank: 1.1 },
        tags: ['mobility']
    }),
    makeTalent('shade_volley', 'Shade Volley', {
        description: 'Rain arrows from the void, like tears from a corpse. Volley damage increased by {value}%.',
        scaling: { type: 'percent', target: 'volleyDamage', base: 9, perRank: 1.5 },
        tags: ['damage']
    }),
    makeTalent('netherstrings', 'Netherstrings', {
        description: 'Strings from the underworld, tying souls in knots. Traps arm {value}% faster and last longer.',
        scaling: { type: 'percent', target: 'trapEfficiency', base: 7, perRank: 1.1 },
        tags: ['utility']
    }),
    makeTalent('twilight_momentum', 'Twilight Momentum', {
        description: 'Dodge fate, but it always catches up. Gain {value}% haste after every dodge (stacks 3).',
        scaling: { type: 'percent', target: 'dodgeHaste', base: 4, perRank: 0.7 },
        tags: ['combat']
    }),
    makeTalent('veilbreaker', 'Veilbreaker', {
        description: 'Tear through defenses like ripping open a shroud. Piercing shots ignore {value}% armor.',
        scaling: { type: 'percent', target: 'armorIgnore', base: 12, perRank: 1.8 },
        tags: ['damage']
    }),
    makeTalent('shadowline', 'Shadowline', {
        description: 'Fire from the darkness, where cowards thrive. Movement speed increased by {value}% while firing.',
        scaling: { type: 'percent', target: 'movingSpeed', base: 6, perRank: 1 },
        tags: ['mobility']
    }),
    makeTalent('eclipsing_lure', 'Eclipsing Lure', {
        description: 'Lure them into traps, like moths to a flame... of doom. Trapped enemies take {value}% more damage.',
        scaling: { type: 'percent', target: 'trapDamageBonus', base: 9, perRank: 1.4 },
        tags: ['damage']
    }),
    makeTalent('shadow_torque', 'Shadow Torque', {
        description: 'Reload with the weight of a thousand sins. Crossbow reload speed increased by {value}%.',
        scaling: { type: 'percent', target: 'reloadSpeed', base: 10, perRank: 1.6 },
        tags: ['combat']
    }),
    makeTalent('moonlit_ambush', 'Moonlit Ambush', {
        description: 'Ambush under the moon, where nightmares are born. Damage increased by {value}% during ambush encounters.',
        scaling: { type: 'percent', target: 'ambushDamage', base: 8, perRank: 1.2 },
        tags: ['situational']
    }),
    makeTalent('umbra_synergy', 'Umbra Synergy', {
        description: 'Allies bask in your shadow, or drown in it. Ally shadow damage increased by {value}% when near you.',
        scaling: { type: 'percent', target: 'allyShadowDamage', base: 5, perRank: 0.8 },
        tags: ['support']
    }),
    makeTalent('shadeweave', 'Shadeweave', {
        description: 'Weave shadows into weapons of despair. Shadow weaving doubles on every third cast, increasing damage by {value}%.',
        scaling: { type: 'percent', target: 'weaveDamage', base: 6, perRank: 1 },
        tags: ['damage']
    }),
    makeTalent('veil_dividend', 'Veil Dividend', {
        description: 'Respecs shrouded in eternal gloom. Gain {value}% chance to refund Shade Dancer talent points when respeccing.',
        scaling: { type: 'percent', target: 'shadeRefund', base: 3, perRank: 0.5 },
        tags: ['utility']
    })
];

const starTalents = [
    makeTalent('starbound_insight', 'Starbound Insight', {
        description: 'The cosmos watches—and grades. Each star point spent grants {value}% global XP.',
        scaling: { type: 'percent', target: 'globalXp', base: 0.6, perRank: 0.12 },
        tags: ['progression', 'star']
    }),
    makeTalent('cosmic_luck', 'Cosmic Luck', {
        description: 'Flip a coin minted in the void. Rare drop chance +{value}%.',
        scaling: { type: 'percent', target: 'rareDropRate', base: 2, perRank: 0.4 },
        tags: ['loot']
    }),
    makeTalent('galactic_cache', 'Galactic Cache', {
        description: 'Stash your sins among the constellations. Global storage slots +{value}.',
        scaling: { type: 'flat', target: 'storageSlots', base: 2, perRank: 1 },
        tags: ['utility']
    }),
    makeTalent('stardust_alchemy', 'Stardust Alchemy', {
        description: 'Shake a nebula into your vials. Potion effectiveness +{value}%.',
        scaling: { type: 'percent', target: 'potionEffect', base: 4, perRank: 0.9 },
        tags: ['utility']
    }),
    makeTalent('cosmic_cartography', 'Cosmic Cartography', {
        description: 'Trace forbidden routes. Unlock secret map nodes {value}% faster.',
        scaling: { type: 'percent', target: 'mapDiscovery', base: 6, perRank: 1.1 },
        tags: ['exploration']
    }),
    makeTalent('stellar_motivation', 'Stellar Motivation', {
        description: 'Let the universe do the work. Idle skill gains +{value}%.',
        scaling: { type: 'percent', target: 'idleSkillGain', base: 5, perRank: 1 },
        tags: ['idle']
    }),
    makeTalent('voidnet', 'Voidnet', {
        description: 'Cast a net into nowhere. Rare nodes +{value}% in fishing and gathering.',
        scaling: { type: 'percent', target: 'rareNodeRate', base: 2.5, perRank: 0.4 },
        tags: ['skills']
    }),
    makeTalent('starforged_tools', 'Starforged Tools', {
        description: 'Tools tempered in vacuum don’t complain. Tool durability loss −{value}%.',
        scaling: { type: 'percent', target: 'durabilityLoss', base: 5, perRank: 0.9 },
        tags: ['utility']
    }),
    makeTalent('astral_fortune', 'Astral Fortune', {
        description: 'Lucky stars pay stipends. Daily quest rewards +{value}%.',
        scaling: { type: 'percent', target: 'questReward', base: 6, perRank: 1 },
        tags: ['progression']
    }),
    makeTalent('starry_entrails', 'Starry Entrails', {
        description: 'Bosses bleed constellations. Chance to drop star talent points +{value}%.',
        scaling: { type: 'percent', target: 'starPointDrop', base: 3, perRank: 0.6 },
        tags: ['star']
    }),
    makeTalent('cosmic_barter', 'Cosmic Barter', {
        description: 'Haggle with ghosts of suns. Shop prices −{value}%.',
        scaling: { type: 'percent', target: 'shopDiscount', base: 3, perRank: 0.5 },
        tags: ['utility']
    }),
    makeTalent('etheric_flux', 'Etheric Flux', {
        description: 'Breathe ether. Mana and stamina regen +{value}%.',
        scaling: { type: 'percent', target: 'regen', base: 4, perRank: 0.7 },
        tags: ['mana']
    }),
    makeTalent('star_chart', 'Star Chart', {
        description: 'Know when the sky misbehaves. World event timers −{value}%.',
        scaling: { type: 'percent', target: 'eventTimerReduction', base: 6, perRank: 1 },
        tags: ['utility']
    }),
    makeTalent('nova_clause', 'Nova Clause', {
        description: 'Your contract with the cosmos is explosive. Each star point spent adds {value}% global damage.',
        scaling: { type: 'percent', target: 'globalDamage', base: 0.5, perRank: 0.1 },
        tags: ['combat']
    })
];

export const TALENT_TABS = {
    tab_beginner: {
        id: 'tab_beginner',
        slot: 1,
        label: 'Beginner Fundamentals',
        description: 'Baseline talents accessible to every fresh adventurer.',
        type: 'universal',
        talents: beginnerTalents
    },
    tab_horror_core: {
        id: 'tab_horror_core',
        slot: 2,
        label: 'Horror Doctrines',
        description: 'Aggressive melee talents tailored to Horrors and their evolutions.',
        type: 'class',
        classIds: ['horror', 'ravager', 'sanguine'],
        talents: horrorTalents
    },
    tab_occultist_core: {
        id: 'tab_occultist_core',
        slot: 2,
        label: 'Occultist Tenets',
        description: 'Spellcraft and curse manipulation for Occultist casters.',
        type: 'class',
        classIds: ['occultist', 'hexweaver', 'astral_scribe'],
        talents: occultistTalents
    },
    tab_stalker_core: {
        id: 'tab_stalker_core',
        slot: 2,
        label: 'Stalker Methods',
        description: 'Marksman and mobility tools for Stalkers and their kin.',
        type: 'class',
        classIds: ['stalker', 'nightblade', 'shade_dancer'],
        talents: stalkerTalents
    },
    tab_ravager_special: {
        id: 'tab_ravager_special',
        slot: 3,
        label: 'Ravager Formulas',
        description: 'Brutal frontline enhancers for Ravagers.',
        type: 'subclass',
        classIds: ['ravager'],
        talents: ravagerTalents
    },
    tab_sanguine_special: {
        id: 'tab_sanguine_special',
        slot: 3,
        label: 'Sanguine Rites',
        description: 'Blood magic specializations for Sanguine adepts.',
        type: 'subclass',
        classIds: ['sanguine'],
        talents: sanguineTalents
    },
    tab_hexweaver_special: {
        id: 'tab_hexweaver_special',
        slot: 3,
        label: 'Hexweaver Patterns',
        description: 'Curse weaving secrets for Hexweavers.',
        type: 'subclass',
        classIds: ['hexweaver'],
        talents: hexweaverTalents
    },
    tab_astral_scribe_special: {
        id: 'tab_astral_scribe_special',
        slot: 3,
        label: 'Astral Script',
        description: 'Temporal and stellar arts for Astral Scribes.',
        type: 'subclass',
        classIds: ['astral_scribe'],
        talents: astralScribeTalents
    },
    tab_nightblade_special: {
        id: 'tab_nightblade_special',
        slot: 3,
        label: 'Nightblade Codex',
        description: 'Assassination arts for Nightblades.',
        type: 'subclass',
        classIds: ['nightblade'],
        talents: nightbladeTalents
    },
    tab_shade_dancer_special: {
        id: 'tab_shade_dancer_special',
        slot: 3,
        label: 'Shade Dancer Steps',
        description: 'Dance-like ranged techniques for Shade Dancers.',
        type: 'subclass',
        classIds: ['shade_dancer'],
        talents: shadeDancerTalents
    },
    tab_star_special: {
        id: 'tab_star_special',
        slot: 4,
        label: 'Star Talents',
        description: 'Cross-class utility that consumes rare Star Talent points.',
        type: 'star',
        talents: starTalents
    }
};

export const CLASS_PATH_MAP = {
    beginner: 'beginner',
    horror: 'horror',
    ravager: 'horror',
    sanguine: 'horror',
    occultist: 'occultist',
    hexweaver: 'occultist',
    astral_scribe: 'occultist',
    stalker: 'stalker',
    nightblade: 'stalker',
    shade_dancer: 'stalker'
};

const SLOT2_TAB_BY_PATH = {
    horror: 'tab_horror_core',
    occultist: 'tab_occultist_core',
    stalker: 'tab_stalker_core'
};

const SLOT3_TAB_BY_CLASS = {
    ravager: 'tab_ravager_special',
    sanguine: 'tab_sanguine_special',
    hexweaver: 'tab_hexweaver_special',
    astral_scribe: 'tab_astral_scribe_special',
    nightblade: 'tab_nightblade_special',
    shade_dancer: 'tab_shade_dancer_special'
};

export function getTalentTab(tabId) {
    return TALENT_TABS[tabId] || null;
}

export function getTabsForClass(classId) {
    if (!classId) return ['tab_beginner', 'tab_star_special'];
    const path = CLASS_PATH_MAP[classId] || 'beginner';
    const tabs = ['tab_beginner'];
    const slot2 = SLOT2_TAB_BY_PATH[path];
    if (slot2) tabs.push(slot2);
    const slot3 = SLOT3_TAB_BY_CLASS[classId];
    if (slot3) tabs.push(slot3);
    tabs.push('tab_star_special');
    return tabs;
}

export function getTabIdForSlot(classId, slot) {
    if (slot === 1) return 'tab_beginner';
    if (slot === 4) return 'tab_star_special';
    const normalizedSlot = Number(slot);
    if (normalizedSlot === 2) {
        const path = CLASS_PATH_MAP[classId];
        return path ? SLOT2_TAB_BY_PATH[path] || null : null;
    }
    if (normalizedSlot === 3) {
        return SLOT3_TAB_BY_CLASS[classId] || null;
    }
    return null;
}

export const TALENT_TAB_ORDER = [
    'tab_beginner',
    'tab_horror_core',
    'tab_occultist_core',
    'tab_stalker_core',
    'tab_ravager_special',
    'tab_sanguine_special',
    'tab_hexweaver_special',
    'tab_astral_scribe_special',
    'tab_nightblade_special',
    'tab_shade_dancer_special',
    'tab_star_special'
];

export default {
    TALENT_TABS,
    CLASS_PATH_MAP,
    TALENT_TAB_ORDER,
    getTalentTab,
    getTabsForClass,
    getTabIdForSlot
};

// --- Runtime helpers (award points, initialize talent state) ---
function ensureCharTalents(char) {
    if (!char) return;
    if (!char.talents) char.talents = { pointsByTab: {}, unspentByTab: {}, starPoints: 0, allocations: {}, skillBar: [] };
    // ensure keys for tabs exist
    try {
        Object.keys(TALENT_TABS).forEach(tid => {
            if (!char.talents.pointsByTab[tid]) char.talents.pointsByTab[tid] = 0;
            if (!char.talents.unspentByTab[tid]) char.talents.unspentByTab[tid] = 0;
            if (!char.talents.allocations[tid]) char.talents.allocations[tid] = {};
        });
        // ensure skillBar is an array of length 9 (slots 1..9)
        if (!Array.isArray(char.talents.skillBar)) {
            char.talents.skillBar = new Array(9).fill(null);
        } else {
            while (char.talents.skillBar.length < 9) char.talents.skillBar.push(null);
            if (char.talents.skillBar.length > 9) char.talents.skillBar.length = 9;
        }
        if (!Array.isArray(char.learnedActives)) char.learnedActives = [];
        if (!char.talents.cooldowns || typeof char.talents.cooldowns !== 'object') char.talents.cooldowns = {};
        // keep track of which tabs we've synced retroactive points for (so we don't double-credit on repeated loads)
        if (!char.talents._tabSynced || typeof char.talents._tabSynced !== 'object') char.talents._tabSynced = {};
        
        // Retro-credit newly unlocked tabs: compute historical points from char level and skill levels
        try {
            const tabsToConsider = getTabsForClass && getTabsForClass(char.class) ? getTabsForClass(char.class) : [];
            // total points per tab from levels: 3 points per level gained (assume starting at level 1)
            const level = Number(char.level || 1);
            const levelPoints = Math.max(0, (level - 1)) * 3;
            // total points per tab from skills: sum of (skill.level - 1) across skills we can find on char
            let skillPoints = 0;
            try {
                for (const k of Object.keys(char || {})) {
                    try {
                        const obj = char[k];
                        if (!obj || typeof obj !== 'object') continue;
                        if (typeof obj.level === 'number') {
                            skillPoints += Math.max(0, Number(obj.level || 1) - 1);
                        }
                    } catch (e) { /* ignore per-skill */ }
                }
            } catch (e) {}
            const totalHistoric = Number(levelPoints || 0) + Number(skillPoints || 0);
            // credit each tab that we haven't synced yet (exclude star tabs)
            for (const tid of tabsToConsider) {
                try {
                    const tdef = TALENT_TABS[tid];
                    if (!tdef || tdef.type === 'star') continue;
                    if (char.talents._tabSynced[tid]) continue; // already handled
                    const existing = Number(char.talents.pointsByTab[tid] || 0);
                    const need = Math.max(0, totalHistoric - existing);
                    if (need > 0) {
                        char.talents.pointsByTab[tid] = existing + need;
                        char.talents.unspentByTab[tid] = (char.talents.unspentByTab[tid] || 0) + need;
                    }
                    char.talents._tabSynced[tid] = true;
                } catch (e) { /* ignore per-tab */ }
            }
        } catch (e) {}
    } catch (e) {}
}

function awardPointsForTabs(char, tabIds = [], points = 0) {
    if (!char || !tabIds || !points) return;
    ensureCharTalents(char);
    for (const tid of tabIds) {
        try {
            const tab = TALENT_TABS[tid];
            if (!tab) continue;
            // don't award to star tab via these flows
            if (tab.type === 'star') continue;
            char.talents.pointsByTab[tid] = (char.talents.pointsByTab[tid] || 0) + points;
            char.talents.unspentByTab[tid] = (char.talents.unspentByTab[tid] || 0) + points;
        } catch (e) { /* ignore per-tab errors */ }
    }
}

function addStarPoints(char, amount = 0) {
    if (!char || !amount) return;
    ensureCharTalents(char);
    char.talents.starPoints = (char.talents.starPoints || 0) + amount;
}

function onCharacterLevelUp(scene, char, levelsGained = 1) {
    if (!char || !levelsGained) return;
    try {
        ensureCharTalents(char);
        const tabs = getTabsForClass(char.class);
        const nonStarTabs = (tabs || []).filter(tid => { const t = TALENT_TABS[tid]; return t && t.type !== 'star'; });
        const pointsPerTab = 3 * Number(levelsGained || 0);
        awardPointsForTabs(char, nonStarTabs, pointsPerTab);
        try {
            if (scene && typeof scene._showToast === 'function') scene._showToast && scene._showToast(`Gained ${pointsPerTab} talent points per unlocked tab.`);
            else if (typeof console !== 'undefined') console.log && console.log('Talent points awarded:', { perTab: pointsPerTab, tabs: nonStarTabs });
        } catch (e) {}
    } catch (e) { /* swallow */ }
}

function onSkillLevelUp(scene, char, skillKey, levelsGained = 1) {
    if (!char || !skillKey || !levelsGained) return;
    try {
        ensureCharTalents(char);
        const tabs = getTabsForClass(char.class);
        const nonStarTabs = (tabs || []).filter(tid => { const t = TALENT_TABS[tid]; return t && t.type !== 'star'; });
        const pointsPerTab = 1 * Number(levelsGained || 0);
        awardPointsForTabs(char, nonStarTabs, pointsPerTab);
        try {
            if (scene && typeof scene._showToast === 'function') scene._showToast && scene._showToast(`+${pointsPerTab} talent point(s) per unlocked tab from ${skillKey} level up.`);
            else if (typeof console !== 'undefined') console.log && console.log('Skill talent points awarded', { skill: skillKey, perTab: pointsPerTab, tabs: nonStarTabs });
        } catch (e) {}
    } catch (e) { /* swallow */ }
}

// Helper: return talent definition by tabId and talentId
function getTalentDef(tabId, talentId) {
    try {
        const tab = TALENT_TABS[tabId];
        if (!tab || !Array.isArray(tab.talents)) return null;
        return tab.talents.find(t => t && t.id === talentId) || null;
    } catch (e) { return null; }
}

function getTalentDefById(talentId) {
    try {
        for (const tid of Object.keys(TALENT_TABS || {})) {
            const tab = TALENT_TABS[tid];
            if (!tab || !Array.isArray(tab.talents)) continue;
            for (const t of tab.talents) {
                if (t && t.id === talentId) return { def: t, tabId: tid };
            }
        }
    } catch (e) {}
    return null;
}

// When allocation changes (inc/dec), handle active-skill learn/unlearn side effects
function processTalentAllocation(scene, char, tabId, talentId, prevAlloc = 0, newAlloc = 0) {
    try {
        if (!char) return;
        ensureCharTalents(char);
        const def = getTalentDef(tabId, talentId);
        if (!def) return;
        // If allocation increased, count this toward any quest objective that requires learning a talent.
        // We intentionally progress on ANY talent rank learned (active or passive) to keep the tutorial simple.
        try {
            if ((Number(newAlloc || 0)) > (Number(prevAlloc || 0))) {
                const helper = (typeof window !== 'undefined' && window.__shared_ui && typeof window.__shared_ui.updateQuestProgressAndCheckCompletion === 'function')
                    ? window.__shared_ui.updateQuestProgressAndCheckCompletion
                    : null;
                const qp = (typeof window !== 'undefined' && typeof window.updateQuestProgress === 'function')
                    ? window.updateQuestProgress
                    : null;
                if (helper && scene) helper(scene, 'learn_talent', null, 1);
                else if (qp && scene && scene.char) qp(scene.char, 'learn_talent', null, 1);
            }
        } catch (e) { /* ignore quest progress errors */ }
        // Only active talents result in learned skills
        if (def.kind === 'active') {
            // learn: went from 0 -> 1
            if ((prevAlloc || 0) <= 0 && (newAlloc || 0) > 0) {
                if (!char.learnedActives) char.learnedActives = [];
                if (!char.learnedActives.find(x => x && x.id === talentId)) {
                    char.learnedActives.push({ id: talentId, name: def.name || talentId, tab: tabId, activeType: def.activeType || null });
                }
                try { if (scene && typeof scene._showToast === 'function') scene._showToast && scene._showToast(`Learned skill: ${def.name || talentId}`); } catch (e) {}
            }
            // unlearn: went from >=1 -> 0
            if ((prevAlloc || 0) > 0 && (newAlloc || 0) <= 0) {
                if (Array.isArray(char.learnedActives)) {
                    char.learnedActives = char.learnedActives.filter(x => x && x.id !== talentId);
                }
                // also clear any assigned skill bar slots (stored under char.talents.skillBar -> array 1..9)
                try {
                    if (char.talents && Array.isArray(char.talents.skillBar)) {
                        for (let i = 0; i < char.talents.skillBar.length; i++) {
                            if (char.talents.skillBar[i] === talentId) char.talents.skillBar[i] = null;
                        }
                    }
                } catch (e) {}
                try { if (scene && typeof scene._showToast === 'function') scene._showToast && scene._showToast(`Forgot skill: ${def.name || talentId}`); } catch (e) {}
            }
        }
    } catch (e) { /* swallow */ }

    // After any allocation changes, recompute derived vitals so HUD and stats reflect talent effects immediately.
    try {
        if (scene && scene.char) {
            const effAfter = (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.stats && typeof window.__shared_ui.stats.effectiveStats === 'function')
                ? window.__shared_ui.stats.effectiveStats(scene.char)
                : null;
            if (effAfter) {
                // write authoritative computed maxima back to the stored character so HUD consumers that prefer char.maxhp see updated values
                scene.char.maxhp = (typeof effAfter.maxhp === 'number') ? effAfter.maxhp : scene.char.maxhp;
                scene.char.maxmana = (typeof effAfter.maxmana === 'number') ? effAfter.maxmana : scene.char.maxmana;
                // clamp current hp/mana to new maxima
                try { if (typeof scene.char.hp !== 'number' || scene.char.hp > scene.char.maxhp) scene.char.hp = scene.char.maxhp; } catch (e) {}
                try { if (typeof scene.char.mana !== 'number' || scene.char.mana > scene.char.maxmana) scene.char.mana = scene.char.maxmana; } catch (e) {}
            }
            // trigger HUD + stats modal refresh if available
            try { if (scene._updateHUD) scene._updateHUD(); else { if (scene._destroyHUD) scene._destroyHUD(); if (scene._createHUD) scene._createHUD(); } } catch (e) {}
            try { if (window && window.__shared_ui && window.__shared_ui.refreshStatsModal && scene._statsModal) window.__shared_ui.refreshStatsModal(scene); } catch (e) {}
        }
    } catch (e) { /* ignore */ }
}

// Post-load fixer: enforce reasonable active/passive defaults per tab type
function enforceTabCompositionRules() {
    try {
        for (const tid of Object.keys(TALENT_TABS || {})) {
            const tab = TALENT_TABS[tid];
            if (!tab || !Array.isArray(tab.talents)) continue;
            // Beginner/universal tab: force all passive
            if (tab.type === 'universal') {
                tab.talents.forEach(t => { if (t) { t.kind = 'passive'; t.activeType = null; } });
                continue;
            }
            // Star tab: keep passive
            if (tab.type === 'star') {
                tab.talents.forEach(t => { if (t) { t.kind = 'passive'; t.activeType = null; } });
                continue;
            }
            // Class/core tabs: prefer first 3 as actives, but do NOT override an explicit `kind` set on a talent.
            if (tab.type === 'class') {
                const map = ['offensive', 'defensive', 'buff'];
                for (let i = 0; i < tab.talents.length; i++) {
                    const t = tab.talents[i];
                    if (!t) continue;
                    if (i < 3) {
                        // only assign active kind when the talent doesn't already declare a kind
                        if (typeof t.kind === 'undefined' || t.kind === null) {
                            t.kind = 'active';
                            t.activeType = map[i % map.length];
                        } else {
                            // respect explicitly authored kinds; ensure activeType is present for active talents
                            if (t.kind === 'active') t.activeType = t.activeType || map[i % map.length];
                            else t.activeType = t.activeType || null;
                        }
                    } else {
                        t.kind = t.kind || 'passive';
                        if (!t.activeType) t.activeType = null;
                    }
                }
                continue;
            }
            // Subclass/special: prefer first 6 as actives, but again DO NOT override explicit `kind` authorship.
            if (tab.type === 'subclass') {
                const map = ['offensive', 'defensive', 'buff'];
                for (let i = 0; i < tab.talents.length; i++) {
                    const t = tab.talents[i];
                    if (!t) continue;
                    if (i < 6) {
                        if (typeof t.kind === 'undefined' || t.kind === null) {
                            t.kind = 'active';
                            t.activeType = map[i % map.length];
                        } else {
                            if (t.kind === 'active') t.activeType = t.activeType || map[i % map.length];
                            else t.activeType = t.activeType || null;
                        }
                    } else {
                        t.kind = t.kind || 'passive';
                        if (!t.activeType) t.activeType = null;
                    }
                }
                continue;
            }
        }
    } catch (e) { /* swallow */ }
}

// Run composer once on module load so talent defs have default kinds
try { enforceTabCompositionRules(); } catch (e) {}

export { ensureCharTalents, awardPointsForTabs, addStarPoints, onCharacterLevelUp, onSkillLevelUp, getTalentDef, getTalentDefById, processTalentAllocation };
// Compute aggregated talent modifiers for a character.
// Returns an object mapping target -> { flat: number, percent: number }
// Assumption: each talent's effective value at rank R is computed as: value = base + perRank * (R - 1)
// where `scaling.base` is the value at rank 1 and `scaling.perRank` is the incremental per additional rank.
function computeTalentModifiers(char) {
    const out = {};
    if (!char || !char.talents || !char.talents.allocations) return out;
    try {
        for (const tabId of Object.keys(char.talents.allocations || {})) {
            const allocs = char.talents.allocations[tabId] || {};
            for (const tid of Object.keys(allocs)) {
                const rank = Number(allocs[tid] || 0);
                if (!rank || rank <= 0) continue;
                const def = getTalentDef(tabId, tid);
                if (!def) continue;
                // primary scaling
                if (def.scaling) {
                    const s = def.scaling || {};
                    const base = Number(s.base || 0);
                    const per = Number(s.perRank || 0);
                    const val = base + per * Math.max(0, rank - 1);
                    const target = s.target;
                    if (target) {
                        out[target] = out[target] || { flat: 0, percent: 0 };
                        if (s.type === 'percent') out[target].percent += Number(val || 0);
                        else out[target].flat += Number(val || 0);
                    }
                }
                // secondary scaling (some talents define a secondScaling for an extra target)
                if (def.secondScaling) {
                    const s2 = def.secondScaling || {};
                    const base2 = Number(s2.base || 0);
                    const per2 = Number(s2.perRank || 0);
                    const val2 = base2 + per2 * Math.max(0, rank - 1);
                    const target2 = s2.target;
                    if (target2) {
                        out[target2] = out[target2] || { flat: 0, percent: 0 };
                        if (s2.type === 'percent') out[target2].percent += Number(val2 || 0);
                        else out[target2].flat += Number(val2 || 0);
                    }
                }
            }
        }
    } catch (e) {
        // swallow
    }
    try { if (char) char._talentModifiers = out; } catch (e) {}
    return out;
}

export { computeTalentModifiers };
