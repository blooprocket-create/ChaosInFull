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
        description: 'Makes your enemies regret their life choices. Increases weapon damage by {value}.',
        scaling: { type: 'flat', target: 'weaponDamage', base: 0.5, perRank: 0.5 },
        tags: ['combat', 'universal']
    }),
    makeTalent('quickness_boots', 'Quickness Boots', {
        description: 'Run like the devil\'s chasing you. Movement speed +{value}% per rank.',
        scaling: { type: 'percent', target: 'movementSpeed', base: 3, perRank: 0.6 },
        tags: ['utility', 'movement']
    }),
    makeTalent('book_of_the_wise', 'Book of the Wise', {
        description: 'Level up faster, because life\’s too short. Character experience gain increased by {value}%.',
        scaling: { type: 'percent', target: 'characterXpGain', base: 5, perRank: 1.5 },
        tags: ['progression']
    }),
    makeTalent('healthy_spirit', 'Healthy Spirit', {
        description: 'More HP means more time to suffer. Max HP increased by {value}.',
        scaling: { type: 'flat', target: 'maxHp', base: 10, perRank: 6 },
        tags: ['survivability']
    }),
    makeTalent('mana_pool', 'Mana Pool', {
        description: 'Mana for your dark rituals. Max mana increased by {value}.',
        scaling: { type: 'flat', target: 'maxMana', base: 8, perRank: 5 },
        tags: ['mana']
    }),
    makeTalent('thick_skin', 'Thick Skin', {
        description: 'Thick skin for when life hits hard. Defense increased by {value}.',
        scaling: { type: 'flat', target: 'defense', base: 3, perRank: 2 },
        tags: ['survivability']
    }),
    makeTalent('work_ethic', 'Work Ethic', {
        description: 'Skills improve, but so does your existential dread. Skill experience gain increased by {value}%.',
        scaling: { type: 'percent', target: 'skillXpGain', base: 4, perRank: 1.25 },
        tags: ['progression', 'skills']
    }),
    makeTalent('resourcefulness', 'Resourcefulness', {
        description: 'Gather resources before the apocalypse. Gathering speed increased by {value}%.',
        scaling: { type: 'percent', target: 'gatherSpeed', base: 3, perRank: 0.7 },
        tags: ['skills']
    }),
    makeTalent('refined_reflexes', 'Refined Reflexes', {
        description: 'Attack faster, die sooner. Attack speed increased by {value}%.',
        scaling: { type: 'percent', target: 'attackSpeed', base: 2, perRank: 0.5 },
        tags: ['combat']
    }),
    makeTalent('keen_eye', 'Keen Eye', {
        description: 'Crits that make enemies question their existence. Critical strike chance increased by {value}%.',
        scaling: { type: 'percent', target: 'critChance', base: 1.5, perRank: 0.35 },
        tags: ['combat']
    }),
    makeTalent('precision_training', 'Precision Training', {
        description: 'Crits that hurt more than your ex. Critical damage increased by {value}%.',
        scaling: { type: 'percent', target: 'critDmg', base: 5, perRank: 1.2 },
        tags: ['combat']
    }),
    makeTalent('loot_lure', 'Loot Lure', {
        description: 'Loot drops, because karma\’s a bitch. Item drop rate increased by {value}%.',
        scaling: { type: 'percent', target: 'dropRate', base: 4, perRank: 0.9 },
        tags: ['utility', 'loot']
    }),
    makeTalent('plus1str', "Str +1", {
        description: 'Strength for crushing skulls. Increases Strength by {value}.',
        scaling: { type: 'flat', target: 'str', base: 1, perRank: 1 },
        tags: ['utility', 'combat']
    }),
    makeTalent('plus1int', "Int +1", {
        description: 'Intellect for plotting revenge. Increases Intellect by {value}.',
        scaling: { type: 'flat', target: 'int', base: 1, perRank: 1 },
        tags: ['utility', 'combat']
    }),
    makeTalent('plus1agi', 'Agi +1', {
        description: 'Agility for dodging fate. Increases Agility by {value}.',
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
    makeTalent('terror_form', 'Terror Form', {//re-working
    description: 'A Demononic Form overtakes you that chills the soul...with fire. Melee attackers take {value}% damage of their max hp over 3 seconds if they get too close. Costs {secondValue} mana per second to maintain.',
    scaling: { type: 'percent', target: 'terrorAuraDamage', base: 5, perRank: 0.15 },
    secondScaling: { type: 'flat', target: 'manaCostPerSec', base: 5, perRank: 0.35 },
    tags: ['damage', 'aura'],
    kind: 'active',
    activeType: 'offensive',
    cooldownSeconds: 1,
    manaCost: 0
    }),
    makeTalent('money_pit', 'Money Pit', {
        description: 'Monsters drop more gold, because misery loves company. gold drop rate +{value}% more.',
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
        description: 'gain {value} more weapon damage for every power of 10 gold you carry.',
        scaling: { type: 'flat', target: 'goldWeaponDamage', base: 2, perRank: 0.25 },
        tags: ['combat', 'scaling']
    }),
    makeTalent('heavy_hitter', 'Heavy Hitter', {
        description: 'regular attacks have a chance to cause bleeding. Bleed chance +{value}%. Bleed deals {secondValue}% of attack damage over 5 seconds.',
        scaling: { type: 'percent', target: 'bleedChance', base: 3, perRank: 1.5 },
        secondScaling: { type: 'percent', target: 'bleedDamagePercent', base: 20, perRank: 3 },
        tags: ['combat', 'damage']
    }),
    makeTalent('unholy_frenzy', 'Unholy Frenzy', {
        description: 'every {secondValue} seconds, enter a frenzied state, increasing attack speed by {value}% for 8 seconds.',
        scaling: { type: 'percent', target: 'frenzyAttackSpeed', base: 15, perRank: 2.5 },
        secondScaling: { type: 'flat', target: 'frenzyCooldownSeconds', base: 30, perRank: -0.2 },
        tags: ['combat', 'buff']
    })
];

const occultisTalents = [
    makeTalent('sigilcraft', 'Sigilcraft', {//works
        description: 'Draw forbidden symbols that explode in faces. Sigil damage +{value}%.',
        scaling: { type: 'percent', target: 'sigilDamage', base: 80, perRank: 8.75 },
        tags: ['combat', 'occultis'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 10,
        manaCost: 25
    }),
    makeTalent('mana_shield', 'Mana Shield', {
        description: 'A passive mana shield: a portion of your max mana becomes a regenerative shield that restores slowly when out of combat.',
        scaling: { type: 'percent', target: 'manaShieldStrength', base: 15, perRank: 0.6 },
        secondScaling: { type: 'flat', target: 'manaShieldRegenPerSec', base: 1, perRank: 0.25 },
        tags: ['mana', 'defensive', 'occultis', 'passive'],
        kind: 'passive'
    }),
    makeTalent('hex_engine', 'Hex Engine', {//works
        description: 'Teleport through curses, because walking is for mortals. Blink cooldown -{value}s.',
        // Scoped target so the talent only affects its own cooldown value
        scaling: { type: 'flat', target: 'hex_engine.cooldownSeconds', base: 12, perRank: -0.07 },
        tags: ['mobility', 'occultis'],
        kind: 'active',
        activeType: 'buff',
        // base cooldown in seconds (UI consumers use cooldownMs / cooldownSeconds)
        cooldownSeconds: 12,
        manaCost: 35
    }),
    makeTalent('void_path', 'Void Path', {//works
        description: 'Leave a void trail as you move: the skill stamps short-lived void zones along your path that each deal {value}% damage once to enemies who enter. Zones last 1.2s. Zone radius = {secondValue} px + per-rank increases.',
        scaling: { type: 'percent', target: 'voidPathDamage', base: 6, perRank: 2.25 },
        secondScaling: { type: 'flat', target: 'voidPathRadius', base: 22, perRank: 2 },
        tags: ['movement', 'aoe', 'occultis'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 14,
        manaCost: 20,
        // Note: placement interval and max concurrent zones are runtime-tuned in code and are not expressed via scaling fields.
    }),
    makeTalent('dark_shield', 'Dark Shield', {
        description: 'Gain a shield when health drops below a threshold. Shield strength scales with your max mana.',
        scaling: { type: 'percent', target: 'magicShield', base: 5, perRank: 0.45 },
        tags: ['survivability', 'occultis'],
        kind: 'passive'
    }),
    makeTalent('rune_overflow', 'Rune Overflow', {
        description: 'Crits that refill your dark well. Crit mana refund +{value}%.',
        scaling: { type: 'percent', target: 'critManaRefund', base: 15, perRank: 1.5 },
        tags: ['mana', 'crit', 'occultis']
    }),
    makeTalent('astral_acuity', 'Astral Acuity', {
        description: 'Spells that pierce the veil of reality. Spell crit chance +{value}%.',
        scaling: { type: 'percent', target: 'spellCritChance', base: 2.5, perRank: 0.5 },
        tags: ['combat', 'occultis']
    }),
    makeTalent('abyssal_conjurer', 'Abyssal Conjurer', {//added
        description: 'When you slay foes there is a chance to conjure a minor abyssal ally for a short time.',
        scaling: { type: 'percent', target: 'abyssalSummonChance', base: 6, perRank: 1.1 },
        tags: ['summon', 'occultis'],
        kind: 'passive'
    }),
    makeTalent('blood_ritual_reserve', 'Blood Ritual Reserve', {//works
        description: 'Channel to sacrifice a portion of your maximum mana each second to restore health. Cancelling ends the channel.',
        scaling: { type: 'percent', target: 'bloodRitualHpCostPerSec', base: 2, perRank: 0.4 },
        secondScaling: { type: 'percent', target: 'bloodRitualManaGainPerSec', base: 6, perRank: 1.0 },
        tags: ['mana', 'channel', 'occultis'],
        kind: 'active',
        activeType: 'utility',
        cooldownSeconds: 10,
        manaCost: 0
    }),
    makeTalent('planar_echo', 'Planar Echo', {
        description: 'Spells that echo from the void. Spell duplicate chance +{value}%.',
        scaling: { type: 'percent', target: 'spellDuplicate', base: 3, perRank: 0.6 },
        tags: ['combat', 'occultis']
    }),
    makeTalent('glyphic_anchor', 'Glyphic Anchor', {
        description: 'Stand still, embrace the void. Standing damage reduction +{value}% (stacks to 3).',
        scaling: { type: 'percent', target: 'standingDR', base: 3, perRank: 0.7 },
        tags: ['survivability', 'occultis'],
        kind: 'passive'
    }),
    makeTalent('forbidden_balls', 'Forbidden Balls', {//works
        description: 'Launch homing void orbs that seek the nearest enemy and explode on impact. Orbs spawn one every 0.2s. Fires {value} orb(s); each orb deals {secondValue}% damage on hit.',
        scaling: { type: 'flat', target: 'forbiddenBalls.count', base: 2, perRank: 1 },
        secondScaling: { type: 'percent', target: 'forbiddenBalls.damage', base: 80, perRank: 6 },
        tags: ['aoe', 'offensive', 'occultis'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 14,
        manaCost: 22,
        // Note: launch gap and orb physics are runtime-tuned in code and not expressed via scaling fields.
    }),
    makeTalent('shadow_mosaic', 'Shadow Mosaic', {
        description: 'Damage from the shadows between worlds. Some attacks have a chance to hit an additional time.',
        scaling: { type: 'percent', target: 'shadowDamage', base: 7, perRank: 0.7 },
        tags: ['damage', 'occultis']
    }),
    makeTalent('wood_lover', 'Staff Mastery', {
        description: 'Increase staff damage and handling. Staff damage +{value}%.',
        scaling: { type: 'percent', target: 'staffDamage', base: 8, perRank: 1.2 },
        tags: ['combat', 'occultis']
    }),
    makeTalent('occult_resurgence', 'Occult Resurgence', {
        description: 'Spells that cheat death itself. Cooldown reset chance +{value}%.',
        scaling: { type: 'percent', target: 'cooldownResetChance', base: 1.5, perRank: 0.25 },
        tags: ['utility', 'occultis']
    })
];

const stalkerTalents = [
    makeTalent('eagle_eye', 'Eagle Shot', { //added
        description: 'Shoot eyes out from afar, like a true coward. Eagle Shot damage +{value}%.',
        scaling: { type: 'percent', target: 'eagleShotDamage', base: 200, perRank: 4 },
        tags: ['combat', 'stalker', 'offensive'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 7,
        manaCost: 15
    }),
    makeTalent('shadowstep', 'Shadowstep', { //works
        description: 'Step into shadows, because facing reality is hard. Blink, turn invisible(enter stealth), and block all damage for {value} seconds. The first attack breaks the invisibility and deals guaranteed crit damage.',
        scaling: { type: 'flat', target: 'shadowstepDuration', base: 3, perRank: 0.07 },
        tags: ['mobility', 'defensive', 'offensive', 'stalker'],
        kind: 'active',
        activeType: 'defensive',
        cooldownSeconds: 12,
        manaCost: 20
   }),
    makeTalent('knife_swarm', 'Knife Swarm', { //works
        description: 'Throw knives everywhere, hope one hits. Knife damage +{value}%. Spawns {secondValue} extra knives at current rank.',
        scaling: { type: 'percent', target: 'knifeDamage', base: 5, perRank: 0.45 },
        tags: ['aoe', 'combat'],
        kind: 'active',
        activeType: 'offensive',
        // encode extra knives per rank as a second scaling so modifiers computation and UI can read it
        secondScaling: { type: 'flat', target: 'knifeExtraCount', base: 0, perRank: 0.2 },
        cooldownSeconds: 1.5,
        manaCost: 8
    }),
    makeTalent('razor_feathers', 'Razor Feathers', {//added
        description: 'Crits that pluck the soul. On crit, deal an additional {value}% damage over 4 seconds.',
        scaling: { type: 'percent', target: 'critDoT', base: 8, perRank: 1.6 },
        tags: ['combat']
    }),
    makeTalent('poison_weapons', 'Poison Weapons', {//added
        description: 'Coat your weapons in deadly toxins causing poison damage over time. Attacks add a stack of Poison damage +{value}%. Stacks up to 5 times.',
        scaling: { type: 'percent', target: 'poisonDamage', base: 70, perRank: 1.2 },
        tags: ['damage']
    }),
    makeTalent('silent_steps', 'Silent Steps', {//added
        description: 'Move like a shadow in the night. Gain Stealth Points while in stealth for every 20px moved; each 10 points raises crit damage by {value}%. Immediately gain 20 Stealth Points upon Shadowstep. Points get consumed on crits. Maximum of 100 Stealth Points.',
        scaling: { type: 'percent', target: 'silentCritDmg', base: 25, perRank: 5 },
        tags: ['utility']
    }),
    makeTalent('five_finger_discount', '5 Finger Discount', {//added (id normalized)
        description: 'Steal from the rich to give to yourself. Gold gain +{value}%.',
        scaling: { type: 'percent', target: 'goldGain', base: 6, perRank: 1.1 },
        tags: ['utility']
    }),
    makeTalent('hunter_s_formula', "Hunter's Formula", {//added
        description: 'Poisoned targets scream louder, or they try to. Poison target bonus +{value}%.',
        scaling: { type: 'percent', target: 'poisonTargetBonus', base: 9, perRank: 1.5 },
        tags: ['combat']
    }),
    makeTalent('needle_rain', 'Needle Rain', { //works(fails visually)
        description: 'Rain death from above, like a vengeful sky. Arrows land from the sky every 0.2s in an AOE. Projectile count +{value}.',
        scaling: { type: 'flat', target: 'projectileCount', base: 5, perRank: 1 },
        tags: ['aoe', 'combat'],
        kind: 'active',
        activeType: 'offensive',
        cooldownSeconds: 15,
        manaCost: 12
    }),
    makeTalent('ambush_mastery', 'Ambush Mastery', { //added
        description: 'Strike from the dark with terrible efficiency. Your first attack when exiting stealth deals an additional {value}% damage and increases critical damage by {secondValue}% for 4s.',
        scaling: { type: 'percent', target: 'stealthAttackDamage', base: 25, perRank: 2 },
        secondScaling: { type: 'percent', target: 'stealthCritDmg', base: 15, perRank: 1.5 },
        tags: ['stalker', 'combat', 'stealth']
    }),
    makeTalent('toxic_precision', 'Toxic Precision', {//added
        description: 'Your precision makes poisons stick. On critical hits apply extra poison stacks. Poison application chance +{value}%.',
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
        description: 'Hide the spoils of your craft. Backstab or stealth-kill rewards have increased drop/gold: drop rate +{value}% and gold gain +{secondValue}%.',
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
        description: 'Tune your eagle eye to strike more than one foe. Ricochet hit has +{value}% more crit chance.',
        scaling: { type: 'percent', target: 'eagleCritChance', base: 4, perRank: 0.6 },
        tags: ['aoe', 'stalker', 'combat']
    })
];

const ravagerTalents = [
    makeTalent('severance', 'Severance', {
        description: 'Execute the weak, spare the strong. Execute threshold +{value}%.',
        scaling: { type: 'percent', target: 'executeThreshold', base: 5, perRank: 1 },
        tags: ['combat', 'ravager']
    }),
    makeTalent('brutal_chain', 'Brutal Chain', {
        description: 'Chains that drag souls to hell. Chain damage +{value}% per bounce.',
        scaling: { type: 'percent', target: 'chainDamage', base: 7, perRank: 1.4 },
        tags: ['combat']
    }),
    makeTalent('savage_rush', 'Savage Rush', {
        description: 'Charge like a bull in a china shop. Charge efficiency +{value}%.',
        scaling: { type: 'percent', target: 'chargeEfficiency', base: 6, perRank: 1.1 },
        tags: ['mobility', 'combat']
    }),
    makeTalent('bone_ward', 'Bone Ward', {
        description: 'Shields from the bones of the fallen. Elite shield +{value}% max HP.',
        scaling: { type: 'percent', target: 'eliteShield', base: 30, perRank: 3 },
        tags: ['survivability']
    }),
    makeTalent('warpath', 'Warpath', {
        description: 'Every step stains the ground red. Movement damage stack +{value}.',
        scaling: { type: 'flat', target: 'movementDamageStack', base: 0.2, perRank: 0.05 },
        tags: ['combat']
    }),
    makeTalent('blood_roar', 'Blood Roar', {
        description: 'Taunts that scream for blood. Taunt damage buff +{value}%.',
        scaling: { type: 'percent', target: 'tauntDamageBuff', base: 8, perRank: 1.1 },
        tags: ['combat']
    }),
    makeTalent('hemorrhage_engine', 'Hemorrhage Engine', {
        description: 'Bleeds that fuel your rage. Bleed target damage +{value}%.',
        scaling: { type: 'percent', target: 'bleedTargetDamage', base: 10, perRank: 1.6 },
        tags: ['damage']
    }),
    makeTalent('gorewheel', 'Gorewheel', {
        description: 'Spins that paint the walls. Spin extra hits +{value}.',
        scaling: { type: 'flat', target: 'spinExtraHits', base: 0, perRank: 0.05 },
        tags: ['aoe']
    }),
    makeTalent('echoing_rage', 'Echoing Rage', {
        description: 'Kills that echo in eternity. Shout reset +{value}%.',
        scaling: { type: 'percent', target: 'shoutReset', base: 4, perRank: 0.7 },
        tags: ['utility']
    }),
    makeTalent('martyr_pact', 'Martyr Pact', {
        description: 'Pain stored for the final blow. Damage stored +{value}%.',
        scaling: { type: 'percent', target: 'damageStored', base: 12, perRank: 1.8 },
        tags: ['combat']
    }),
    makeTalent('flesh_harvest', 'Flesh Harvest', {
        description: 'Loot from the elite\'s rotting corpse. Elite drop rate +{value}%.',
        scaling: { type: 'percent', target: 'eliteDropRate', base: 6, perRank: 1 },
        tags: ['loot']
    }),
    makeTalent('titan_grip', 'Titan Grip', {
        description: 'Weapons heavy with the weight of sins. Two-hand defense +{value}%.',
        scaling: { type: 'percent', target: 'twoHandDefense', base: 4, perRank: 0.8 },
        tags: ['survivability']
    }),
    makeTalent('rupture_field', 'Rupture Field', {
        description: 'Fields that rupture reality. Slam field damage +{value}%.',
        scaling: { type: 'percent', target: 'slamFieldDamage', base: 14, perRank: 1.5 },
        tags: ['aoe']
    }),
    makeTalent('gory_dividend', 'Gory Dividend', {
        description: 'Respecs paid in blood. Tab refund chance +{value}%.',
        scaling: { type: 'percent', target: 'tab3Refund', base: 3, perRank: 0.5 },
        tags: ['utility']
    }),
    makeTalent('cataclysmic_drive', 'Cataclysmic Drive', {
        description: 'Ultimates that bleed the world dry. Ultimate bleed bonus +{value}%.',
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
        description: 'Bleeds that paint the world red. Bleed amplify +{value}%.',
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
        description: 'Weave curses that unravel souls. Hex damage +{value}%.',
        scaling: { type: 'percent', target: 'hexDamage', base: 8, perRank: 1.5 },
        tags: ['combat', 'hexweaver']
    }),
    makeTalent('curse_quilt', 'Curse Quilt', {
        description: 'Pile on the misery, layer by layer. Curse stacks +{value}%.',
        scaling: { type: 'percent', target: 'curseStacks', base: 6, perRank: 1 },
        tags: ['control']
    }),
    makeTalent('loomed_insight', 'Loomed Insight', {
        description: 'Each curse whispers dark secrets. Spell haste +{value}% per curse.',
        scaling: { type: 'percent', target: 'curseSpellHaste', base: 3, perRank: 0.5 },
        tags: ['utility']
    }),
    makeTalent('fate_spindle', 'Fate Spindle', {
        description: 'Spin fate\'s cruel threads. Curse duplicate chance +{value}%.',
        scaling: { type: 'percent', target: 'curseDuplicate', base: 4, perRank: 0.8 },
        tags: ['control']
    }),
    makeTalent('hexed_ward', 'Hexed Ward', {
        description: 'Turn their curses against them. Hexed DR +{value}%.',
        scaling: { type: 'percent', target: 'hexedDamageReduction', base: 7, perRank: 1.1 },
        tags: ['survivability']
    }),
    makeTalent('loomed_bargain', 'Loomed Bargain', {
        description: 'Refresh the agony, pay in pain. Curse refresh damage +{value}%.',
        scaling: { type: 'percent', target: 'curseRefreshDamage', base: 5, perRank: 0.9 },
        tags: ['utility']
    }),
    makeTalent('pattern_of_wither', 'Pattern of Wither', {
        description: 'Decay that rots from within. Decay damage +{value}%.',
        scaling: { type: 'percent', target: 'decayDamage', base: 9, perRank: 1.4 },
        tags: ['damage']
    }),
    makeTalent('woven_refrain', 'Woven Refrain', {
        description: 'Allies shrouded in your dark tapestry. Ally DR +{value}%.',
        scaling: { type: 'percent', target: 'allyDamageReduction', base: 3, perRank: 0.6 },
        tags: ['support']
    }),
    makeTalent('weftwalker', 'Weftwalker', {
        description: 'Step between the threads of reality. Teleport efficiency +{value}%.',
        scaling: { type: 'percent', target: 'teleportEfficiency', base: 8, perRank: 1.3 },
        tags: ['mobility']
    }),
    makeTalent('hexbound_vectors', 'Hexbound Vectors', {
        description: 'Curses that spread like plague. Curse spread +{value}.',
        scaling: { type: 'flat', target: 'curseSpread', base: 0, perRank: 0.04 },
        tags: ['control']
    }),
    makeTalent('forged_dread', 'Forged Dread', {
        description: 'Bosses tremble at your loom. Boss damage +{value}%.',
        scaling: { type: 'percent', target: 'bossDamage', base: 5, perRank: 1 },
        tags: ['combat']
    }),
    makeTalent('counterwoven', 'Counterwoven', {
        description: 'Strike back with threads of doom. Retaliate chance +{value}%.',
        scaling: { type: 'percent', target: 'retaliateChance', base: 4, perRank: 0.7 },
        tags: ['utility']
    }),
    makeTalent('loomed_attunement', 'Loomed Attunement', {
        description: 'Mana from the suffering of others. Mana per curse +{value}.',
        scaling: { type: 'flat', target: 'manaPerCurse', base: 2, perRank: 0.6 },
        tags: ['mana']
    }),
    makeTalent('hexing_spiral', 'Hexing Spiral', {
        description: 'DOTs that chase you down. Moving DOT tick +{value}%.',
        scaling: { type: 'percent', target: 'movingDotTick', base: 5, perRank: 0.9 },
        tags: ['damage']
    }),
    makeTalent('loomkeepers_promise', "Loomkeeper's Promise", {
        description: 'The loom demands its due. Hexweaver refund chance +{value}%.',
        scaling: { type: 'percent', target: 'hexweaverRefund', base: 3, perRank: 0.5 },
        tags: ['utility']
    })
];

const astralScribeTalents = [
    makeTalent('chronicle_of_time', 'Chronicle of Time', {
        description: 'Time magic that makes clocks weep. Damage increased by {value}%.',
        scaling: { type: 'percent', target: 'timeMagicDamage', base: 7, perRank: 1.4 },
        tags: ['combat', 'astral_scribe']
    }),
    makeTalent('temporal_buffer', 'Temporal Buffer', {
        description: 'Pain deferred is pain endured. Store {value}% of incoming damage to be taken over 6 seconds.',
        scaling: { type: 'percent', target: 'temporalStore', base: 10, perRank: 1.6 },
        tags: ['survivability']
    }),
    makeTalent('gravity_well', 'Gravity Well', {
        description: 'Suck them into oblivion. Pull radius of time rifts increased by {value}%.',
        scaling: { type: 'percent', target: 'riftRadius', base: 6, perRank: 1 },
        tags: ['control']
    }),
    makeTalent('stellar_guidance', 'Stellar Guidance', {
        description: 'Stars that guide to doom. Allies affected by guiding stars gain {value}% haste.',
        scaling: { type: 'percent', target: 'allyHaste', base: 5, perRank: 0.9 },
        tags: ['support']
    }),
    makeTalent('chronomantic_charge', 'Chronomantic Charge', {
        description: 'Charge faster, curse sooner. Charge time for heavy spells reduced by {value}%.',
        scaling: { type: 'percent', target: 'chargeReduction', base: 8, perRank: 1.2 },
        tags: ['utility']
    }),
    makeTalent('stellar_resonance', 'Stellar Resonance', {
        description: 'Echoes of dying stars. Damage amplifiers last {value}% longer.',
        scaling: { type: 'percent', target: 'buffDuration', base: 6, perRank: 1 },
        tags: ['support']
    }),
    makeTalent('event_horizon', 'Event Horizon', {
        description: 'Where light fears to tread. Black hole damage increased by {value}%.',
        scaling: { type: 'percent', target: 'blackHoleDamage', base: 9, perRank: 1.5 },
        tags: ['damage']
    }),
    makeTalent('constellation_map', 'Constellation Map', {
        description: 'Map the dead stars. Identify star trails that grant {value}% more loot.',
        scaling: { type: 'percent', target: 'trailLoot', base: 5, perRank: 0.9 },
        tags: ['loot']
    }),
    makeTalent('retrograde_step', 'Retrograde Step', {
        description: 'Step back from the grave. Blink reverses {value}% of damage taken in the last 2 seconds.',
        scaling: { type: 'percent', target: 'blinkHeal', base: 12, perRank: 1.4 },
        tags: ['survivability']
    }),
    makeTalent('starlit_ink', 'Starlit Ink', {
        description: 'Ink from fallen stars. Spells cost {value}% less mana.',
        scaling: { type: 'percent', target: 'manaCostReduction', base: 4, perRank: 0.7 },
        tags: ['mana']
    }),
    makeTalent('celestial_alignment', 'Celestial Alignment', {
        description: 'Align with cosmic horror. Gain {value}% more damage during celestial events.',
        scaling: { type: 'percent', target: 'celestialDamage', base: 8, perRank: 1.2 },
        tags: ['situational']
    }),
    makeTalent('time_loop', 'Time Loop', {
        description: 'Loop the agony. {value}% chance to reset the cooldown of a random spell when one completes.',
        scaling: { type: 'percent', target: 'cooldownResetChance', base: 2, perRank: 0.35 },
        tags: ['utility']
    }),
    makeTalent('astral_projection', 'Astral Projection', {
        description: 'Project your nightmares. Projection damage increased by {value}% and lasts longer.',
        scaling: { type: 'percent', target: 'projectionDamage', base: 7, perRank: 1.1 },
        tags: ['damage']
    }),
    makeTalent('epochal_record', 'Epochal Record', {
        description: 'Record the epochs of suffering. Each minute in combat grants {value}% spell damage (stacks up to 5 times).',
        scaling: { type: 'percent', target: 'combatScaling', base: 1.5, perRank: 0.3 },
        tags: ['damage']
    }),
    makeTalent('scribe_dividend', 'Scribe Dividend', {
        description: 'Dividends from the void. Gain {value}% chance to refund Astral Scribe talent points when respeccing.',
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
        description: 'Hide in the dark, where nightmares lurk. While in stealth, movement speed increased by {value}%.',
        scaling: { type: 'percent', target: 'stealthSpeed', base: 6, perRank: 1 },
        tags: ['mobility']
    }),
    makeTalent('cloak_of_silence', 'Cloak of Silence', {
        description: 'Silence their screams before they start. Abilities from stealth silence enemies for {value} seconds.',
        scaling: { type: 'flat', target: 'silenceDuration', base: 0.4, perRank: 0.05 },
        tags: ['control']
    }),
    makeTalent('lethal_precision', 'Lethal Precision', {
        description: 'Crits that make death look like an accident. Critical strike chance increased by {value}%.',
        scaling: { type: 'percent', target: 'critChance', base: 3, perRank: 0.6 },
        tags: ['combat']
    }),
    makeTalent('shadow_mantle', 'Shadow Mantle', {
        description: 'Embrace the void, laugh at pain. Damage taken reduced by {value}% for 3s after exiting stealth.',
        scaling: { type: 'percent', target: 'postStealthDR', base: 12, perRank: 1.6 },
        tags: ['survivability']
    }),
    makeTalent('nightfall_poison', 'Nightfall Poison', {
        description: 'Poison that whispers sweet decay. Poison damage increased by {value}%.',
        scaling: { type: 'percent', target: 'poisonDamage', base: 8, perRank: 1.4 },
        tags: ['damage']
    }),
    makeTalent('evasive_assault', 'Evasive Assault', {
        description: 'Dodge fate, strike back with vengeance. Dodging an attack grants {value}% haste for 4s.',
        scaling: { type: 'percent', target: 'dodgeHaste', base: 6, perRank: 1 },
        tags: ['utility']
    }),
    makeTalent('dark_affinity', 'Dark Affinity', {
        description: 'The night devours the weak. Damage increased by {value}% at night.',
        scaling: { type: 'percent', target: 'nightDamage', base: 8, perRank: 1.3 },
        tags: ['situational']
    }),
    makeTalent('blade_dancer', 'Blade Dancer', {
        description: 'Dance with death, one step at a time. Each consecutive hit in 3s increases damage by {value}% (stacks 5).',
        scaling: { type: 'percent', target: 'comboDamage', base: 1.5, perRank: 0.3 },
        tags: ['combat']
    }),
    makeTalent('silent_finish', 'Silent Finish', {
        description: 'Kill quietly, leave no witnesses. Killing from stealth grants {value}% crit for 5s.',
        scaling: { type: 'percent', target: 'stealthKillCrit', base: 10, perRank: 1.5 },
        tags: ['combat']
    }),
    makeTalent('smoke_bombard', 'Smoke Bombard', {
        description: 'Choke on your own despair. Smoke bombs deal {value}% more damage and slow enemies.',
        scaling: { type: 'percent', target: 'smokeDamage', base: 12, perRank: 1.8 },
        tags: ['aoe']
    }),
    makeTalent('voidstep', 'Voidstep', {
        description: 'Step into the abyss, emerge untouchable. Blink distance increased by {value}% and grants brief invulnerability.',
        scaling: { type: 'percent', target: 'blinkEfficiency', base: 7, perRank: 1.2 },
        tags: ['mobility']
    }),
    makeTalent('twilight_pursuit', 'Twilight Pursuit', {
        description: 'Chase the cowards into the grave. Damage increased by {value}% against fleeing enemies.',
        scaling: { type: 'percent', target: 'pursuitDamage', base: 6, perRank: 1 },
        tags: ['combat']
    }),
    makeTalent('nightstalkers_mark', "Nightstalker's Mark", {
        description: 'Marked for oblivion, doomed to suffer. Marked targets take {value}% increased damage from stealth attacks.',
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
        description: 'Stars that witness your sins. Star talent points spent grant {value}% experience gain globally.',
        scaling: { type: 'percent', target: 'globalXp', base: 0.6, perRank: 0.12 },
        tags: ['progression', 'star']
    }),
    makeTalent('cosmic_luck', 'Cosmic Luck', {
        description: 'Luck from the void, where hope dies. Rare drop chance increased by {value}%.',
        scaling: { type: 'percent', target: 'rareDropRate', base: 2, perRank: 0.4 },
        tags: ['loot']
    }),
    makeTalent('galactic_cache', 'Galactic Cache', {
        description: 'Cache from the cosmos, filled with forgotten horrors. Global storage capacity increased by {value}.',
        scaling: { type: 'flat', target: 'storageSlots', base: 2, perRank: 1 },
        tags: ['utility']
    }),
    makeTalent('stardust_alchemy', 'Stardust Alchemy', {
        description: 'Alchemy from stardust, turning potions to poison. Potion effectiveness increased by {value}%.',
        scaling: { type: 'percent', target: 'potionEffect', base: 4, perRank: 0.9 },
        tags: ['utility']
    }),
    makeTalent('cosmic_cartography', 'Cosmic Cartography', {
        description: 'Maps drawn in blood. Unlock secret map nodes {value}% faster.',
        scaling: { type: 'percent', target: 'mapDiscovery', base: 6, perRank: 1.1 },
        tags: ['exploration']
    }),
    makeTalent('stellar_motivation', 'Stellar Motivation', {
        description: 'Motivation from dying stars. Idle skill gains increased by {value}%.',
        scaling: { type: 'percent', target: 'idleSkillGain', base: 5, perRank: 1 },
        tags: ['idle']
    }),
    makeTalent('voidnet', 'Voidnet', {
        description: 'Net from the void, catching nightmares. Fishing and gathering minigames have {value}% more rare nodes.',
        scaling: { type: 'percent', target: 'rareNodeRate', base: 2.5, perRank: 0.4 },
        tags: ['skills']
    }),
    makeTalent('starforged_tools', 'Starforged Tools', {
        description: 'Tools forged in stellar fires, burning away durability. Tool durability loss reduced by {value}%.',
        scaling: { type: 'percent', target: 'durabilityLoss', base: 5, perRank: 0.9 },
        tags: ['utility']
    }),
    makeTalent('astral_fortune', 'Astral Fortune', {
        description: 'Fortune from the astral plane, paid in souls. Daily quest rewards increased by {value}%.',
        scaling: { type: 'percent', target: 'questReward', base: 6, perRank: 1 },
        tags: ['progression']
    }),
    makeTalent('starry_entrails', 'Starry Entrails', {
        description: 'Entrails of stars, dripping with points. Chance to obtain star talent points from bosses increased by {value}%.',
        scaling: { type: 'percent', target: 'starPointDrop', base: 3, perRank: 0.6 },
        tags: ['star']
    }),
    makeTalent('cosmic_barter', 'Cosmic Barter', {
        description: 'Barter with cosmic entities, at a steep price. Shop prices reduced by {value}%.',
        scaling: { type: 'percent', target: 'shopDiscount', base: 3, perRank: 0.5 },
        tags: ['utility']
    }),
    makeTalent('etheric_flux', 'Etheric Flux', {
        description: 'Flux from the ether, regenerating your darkness. Mana regen and stamina regen increased by {value}%.',
        scaling: { type: 'percent', target: 'regen', base: 4, perRank: 0.7 },
        tags: ['mana']
    }),
    makeTalent('star_chart', 'Star Chart', {
        description: 'Charts of stars, charting your doom. World event timers reduced by {value}%.',
        scaling: { type: 'percent', target: 'eventTimerReduction', base: 6, perRank: 1 },
        tags: ['utility']
    }),
    makeTalent('nova_clause', 'Nova Clause', {
        description: 'Clause in the nova, exploding with damage. Every spent star talent point adds {value}% damage globally.',
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
    tab_occultis_core: {
        id: 'tab_occultis_core',
        slot: 2,
        label: 'Occultis Tenets',
        description: 'Spellcraft and curse manipulation for Occultis casters.',
        type: 'class',
        classIds: ['occultis', 'hexweaver', 'astral_scribe'],
        talents: occultisTalents
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
    occultis: 'occultis',
    hexweaver: 'occultis',
    astral_scribe: 'occultis',
    stalker: 'stalker',
    nightblade: 'stalker',
    shade_dancer: 'stalker'
};

const SLOT2_TAB_BY_PATH = {
    horror: 'tab_horror_core',
    occultis: 'tab_occultis_core',
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
    'tab_occultis_core',
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