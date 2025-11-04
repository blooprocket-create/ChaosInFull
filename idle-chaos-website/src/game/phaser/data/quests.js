// Quest definitions for the game
// Each quest has id, name, description, objectives, rewards, prerequisites
//
// REFACTORED QUEST SYSTEM:
// 1. All objectives use 'target' field (not itemId/enemyId) for consistency
// 2. Progress is stored ONLY in character.activeQuests[].progress[]
// 3. Single source of truth: getQuestObjectiveState only reads stored progress
// 4. No auto-complete: quests must be manually turned in at handInNpc
// 5. Validation added to updateQuestProgress to prevent silent failures

export const QUEST_DEFS = {
    tutorial_meet_wayne: {
        id: 'tutorial_meet_wayne',
        name: 'Copper Mining Basics',
        description: 'Listen, I need someone who knows their way around a pickaxe. Wayne "The Vein" Mineson runs the mine operation in the caves. He\'s rough around the edges, but the man knows his ore. Go introduce yourself—tell him I sent you.',
        objectives: [
            {
                type: 'travel',
                target: 'Cave',
                required: 1,
                description: 'Travel to the Cave'
            },
            {
                type: 'talk',
                target: 'wayne_mineson',
                required: 1,
                description: 'Speak with Wayne Mineson'
            }
        ],
        rewards: {
            items: [{ id: 'copper_pickaxe', qty: 1 }],
            xp: { mining: 50 },
            gold: 10
        },
        prerequisites: [],
        giver: 'mayor_grimsley',
        location: 'Town',
        handInNpc: 'wayne_mineson'
    },
    tutorial_equip_pickaxe_and_mine: {
        id: 'tutorial_equip_pickaxe_and_mine',
        name: 'Equip Pickaxe and Mine Copper',
        description: 'Right then. See that pickaxe? Get it on your belt and start swinging. These veins won\'t mine themselves. Twenty copper chunks should do it—enough to see if you\'ve got the feel for it. The rhythm\'s in the stone, yeah? Listen close.',
        objectives: [
            {
                type: 'equip',
                target: 'copper_pickaxe',
                required: 1,
                description: 'Equip Copper Pickaxe'
            },
            {
                type: 'mine',
                target: 'copper_ore',
                required: 20,
                description: 'Mine Copper Ore'
            }
        ],
        rewards: {
            items: [{ id: 'copper_helmet', qty: 1 }],
            xp: { smithing: 150 },
            gold: 15
        },
        prerequisites: ['tutorial_meet_wayne'],
        giver: 'wayne_mineson',
        location: 'Cave',
        handInNpc: 'wayne_mineson'
    },
    tutorial_return_to_grimsley: {
        id: 'tutorial_return_to_grimsley',
        name: 'Return to Mayor Grimsley',
        description: 'Not bad work. You\'ve got steady hands. Mayor Grimsley will want to hear you passed the test. Head back topside and give him the good word, yeah?',
        objectives: [
            {
                type: 'travel',
                target: 'Town',
                required: 1,
                description: 'Travel to Town'
            },
            {
                type: 'talk',
                target: 'mayor_grimsley',
                required: 1,
                description: 'Speak with Mayor Grimsley'
            }
        ],
        rewards: {
            xp: { character: 50 },
            gold: 10
        },
        prerequisites: ['tutorial_equip_pickaxe_and_mine'],
        giver: 'wayne_mineson',
        location: 'Cave',
        handInNpc: 'mayor_grimsley'
    },
    tutorial_smelt_copper: {
        id: 'tutorial_smelt_copper',
        name: 'Smelting Copper Ore',
        description: 'So you can swing a pickaxe. Good. Now let\'s see if you can work a furnace. Raw ore is worthless—we need bars. Ten copper bars should suffice. The furnace is by the town square. Don\'t burn yourself.',
        objectives: [
            {
                type: 'smelt',
                target: 'copper_bar',
                required: 10,
                description: 'Smelt Copper Bars'
            }
        ],
        rewards: {
            items: [{ id: 'copper_armor', qty: 1 }],
            xp: { smithing: 100 },
            gold: 20
        },
        prerequisites: ['tutorial_return_to_grimsley'],
        giver: 'mayor_grimsley',
        location: 'Town',
        handInNpc: 'mayor_grimsley'
    },
    tutorial_craft_armor: {
        id: 'tutorial_craft_armor',
        name: 'Crafting Copper Armor',
        description: 'You\'ll need proper protection before venturing further. Use the workbench to forge yourself some gear: leggings, boots, and a sword. Nothing fancy, but it\'ll keep you alive. Show some care with the hammer work.',
        objectives: [
            {
                type: 'craft',
                target: 'copper_legs',
                required: 1,
                description: 'Craft Copper Leggings'
            },
            {
                type: 'craft',
                target: 'copper_boots',
                required: 1,
                description: 'Craft Copper Boots'
            },
            {
                type: 'craft',
                target: 'copper_sword',
                required: 1,
                description: 'Craft Copper Sword'
            }
        ],
        rewards: {
            items: [{ id: 'minor_health_potion', qty: 3 }],
            xp: { smithing: 100 },
            gold: 25
        },
        prerequisites: ['tutorial_smelt_copper'],
        giver: 'mayor_grimsley',
        location: 'Town',
        handInNpc: 'mayor_grimsley'
    },
    tutorial_equip_weapon_and_armor: {
        id: 'tutorial_equip_weapon_and_armor',
        name: 'Equip Your New Gear',
        description: 'Well-crafted pieces, those. Don\'t let them gather dust. Get everything equipped—helmet, armor, leggings, boots, sword. All of it. You represent this town now. Look the part.',
        objectives: [
            {
                type: 'equip',
                target: 'copper_helmet',
                required: 1,
                description: 'Equip Copper Helmet'
            },
            {
                type: 'equip',
                target: 'copper_armor',
                required: 1,
                description: 'Equip Copper Armor'
            },
            {
                type: 'equip',
                target: 'copper_legs',
                required: 1,
                description: 'Equip Copper Leggings'
            },
            {
                type: 'equip',
                target: 'copper_boots',
                required: 1,
                description: 'Equip Copper Boots'
            },
            {
                type: 'equip',
                target: 'copper_sword',
                required: 1,
                description: 'Equip Copper Sword'
            }
        ],
        rewards: {
            xp: { character: 75 },
            gold: 15
        },
        prerequisites: ['tutorial_craft_armor'],
        giver: 'mayor_grimsley',
        location: 'Town',
        handInNpc: 'mayor_grimsley'
    },
    tutorial_learn_talents: {
        id: 'tutorial_learn_talents',
        name: 'Learning Talents',
        description: 'You\'ve earned your first talent point. Press T to open the talents menu and choose your first specialization. Every choice matters—pick what suits your style. Once you\'ve made your selection, report back.',
        objectives: [
            {
                type: 'learn_talent',
                required: 1,
                description: 'Learn 1 Talent Point'
            }
        ],
        rewards: {
            xp: { character: 50 },
            gold: 10
        },
        prerequisites: ['tutorial_equip_weapon_and_armor'],
        giver: 'mayor_grimsley',
        location: 'Town',
        handInNpc: 'mayor_grimsley'
    },
    tutorial_kill_slimes: {
        id: 'tutorial_kill_slimes',
        name: 'Slime Extermination',
        description: 'Time to see if that blade is more than decoration. Slimes have been plaguing the Inner Field—disgusting things, but perfect for testing fresh recruits. Kill five of them. Don\'t get careless.',
        objectives: [
            {
                type: 'kill',
                target: 'slime',
                required: 5,
                description: 'Kill 5 Slimes'
            }
        ],
        rewards: {
            items: [{ id: 'slime_core', qty: 5 }],
            xp: { combat: 75 },
            gold: 20
        },
        prerequisites: ['tutorial_learn_talents'],
        giver: 'mayor_grimsley',
        location: 'Town',
        handInNpc: 'mayor_grimsley'
    },
    tutorial_meet_rowan: {
        id: 'tutorial_meet_rowan',
        name: 'Seek Out Rowan Boneaxe',
        description: 'You\'ve proven yourself capable. There\'s someone I need you to meet: Rowan Boneaxe. He patrols the Grave Forest—grim work, but someone has to do it. Find him and hear what he has to say. The man doesn\'t waste words.',
        objectives: [
            {
                type: 'travel',
                target: 'GraveForest',
                required: 1,
                description: 'Travel to the Grave Forest'
            },
            {
                type: 'talk',
                target: 'rowan_boneaxe',
                required: 1,
                description: 'Speak with Rowan Boneaxe'
            }
        ],
        rewards: {
            items: [{ id: 'copper_hatchet', qty: 1 }],
            xp: { character: 50 },
            gold: 25
        },
        prerequisites: ['tutorial_kill_slimes'],
        giver: 'mayor_grimsley',
        location: 'Town',
        handInNpc: 'rowan_boneaxe'
    },
    tutorial_chop_wood: {
        id: 'tutorial_chop_wood',
        name: 'Woodcutting Basics',
        description: 'Grimsley trusts you. That counts for something. We need timber for watch-fires—keeps the restless dead at bay. Take this hatchet and bring me twenty-five logs. Mind the shadows while you work. Things stir here that don\'t rest easy.',
        objectives: [
            {
                type: 'equip',
                target: 'copper_hatchet',
                required: 1,
                description: 'Equip Copper Hatchet'
            },
            {
                type: 'chop',
                target: 'normal_log',
                required: 25,
                description: 'Chop Normal Logs'
            }
        ],
        rewards: {
            xp: { woodcutting: 100 },
            gold: 100
        },
        prerequisites: ['tutorial_meet_rowan'],
        giver: 'rowan_boneaxe',
        location: 'GraveForest',
        handInNpc: 'rowan_boneaxe'
    },
    mother_lumen_slime_cull: {
        id: 'mother_lumen_slime_cull',
        name: 'Seal the Slime Vents',
        description: 'Traveler... the glowing wells near camp pulse with unnatural life. Slimes emerge endlessly, drawn by something beneath. Will you thin their numbers? Fifty should quiet the chaos for a time. The lantern will guide your blade.',
        objectives: [
            {
                type: 'kill',
                target: 'slime',
                required: 50,
                description: 'Kill 50 Slimes'
            }
        ],
        rewards: {
            items: [{ id: 'minor_health_potion', qty: 5 }],
            xp: { character: 120 },
            gold: 60
        },
        prerequisites: [],
        giver: 'mother_lumen',
        location: 'GloamwayBastion',
        handInNpc: 'mother_lumen'
    },
    mother_lumen_rat_cull: {
        id: 'mother_lumen_rat_cull',
        name: 'Shadows in the Grain',
        description: 'The grain stores... infested. Rats—living, dead, and worse—gnaw at the foundations of safety. Fifteen common vermin, five corpse-touched, and three spectral. Cull them all. The paths must remain clear for those who still walk them.',
        objectives: [
            {
                type: 'kill',
                target: 'rat',
                required: 15,
                description: 'Kill 15 Rats'
            },
            {
                type: 'kill',
                target: 'zombie_rat',
                required: 5,
                description: 'Kill 5 Zombie Rats'
            },
            {
                type: 'kill',
                target: 'ghost_rat',
                required: 3,
                description: 'Kill 3 Spectral Rats'
            }
        ],
        rewards: {
            items: [{ id: 'minor_mana_potion', qty: 3 }],
            xp: { character: 180 },
            gold: 120
        },
        prerequisites: ['mother_lumen_slime_cull'],
        giver: 'mother_lumen',
        location: 'GloamwayBastion',
        handInNpc: 'mother_lumen'
    },
    mother_lumen_goblin_cull: {
        id: 'mother_lumen_goblin_cull',
        name: 'Break the Warband',
        description: 'Goblins harry the approach roads—crude, vicious, numerous. Their warband grows bold in the twilight. Strike fifteen of them down. Scatter their resolve. When they break and flee, the travelers can breathe again. Will you carry this burden?',
        objectives: [
            {
                type: 'kill',
                target: 'goblin',
                required: 15,
                description: 'Kill 15 Goblins'
            }
        ],
        rewards: {
            items: [{ id: 'minor_health_potion', qty: 5 }, { id: 'minor_mana_potion', qty: 7 }, { id: 'teleport_scroll', qty: 1 }],
            xp: { character: 280 },
            gold: 250
        },
        prerequisites: ['mother_lumen_rat_cull'],
        giver: 'mother_lumen',
        location: 'GloamwayBastion',
        handInNpc: 'mother_lumen'
    },
    mother_lumen_request: {
        id: 'mother_lumen_request',
        name: 'A Special Request',
        description: 'The Goblin Chief... I see him in the lantern\'s glow. A brute twice the size of his kin, wreathed in stolen armor and rage. He leads the raids that fracture our defenses. Face him, if you dare. Prove your new mantle is more than cloth and promise.',
        objectives: [
            {
                type: 'kill',
                target: 'goblin_boss',
                required: 1,
                description: 'Defeat the Goblin Chief'
            }
        ],
        rewards: {
            items: [{ id: 'major_health_potion', qty: 5 }, { id: 'major_mana_potion', qty: 5 }, { id: 'teleport_scroll', qty: 5 }],
            xp: { character: 500 },
            gold: 500
        },
        prerequisites: ['mother_lumen_goblin_cull'],
        giver: 'mother_lumen',
        location: 'GloamwayBastion',
        handInNpc: 'mother_lumen'
    }
};

// Helper functions for quest management
export function getQuestById(questId) {
    return QUEST_DEFS[questId] || null;
}

export function getAvailableQuests(character, location) {
    const completed = character.completedQuests || [];
    const active = character.activeQuests || [];
    const activeIds = active.map(q => q.id);

    return Object.values(QUEST_DEFS).filter(quest => {
        // Not already active or completed
        if (activeIds.includes(quest.id) || completed.includes(quest.id)) return false;
        // In correct location
        if (quest.location !== location) return false;
        // Eligibility: use canStartQuest for special cases (e.g., post-class-selection unlocks)
        try { return canStartQuest(character, quest.id); } catch (e) { return quest.prerequisites.every(prereq => completed.includes(prereq)); }
    });
}

export function canStartQuest(character, questId) {
    const quest = getQuestById(questId);
    if (!quest) return false;

    const completed = character.completedQuests || [];
    const active = character.activeQuests || [];
    const activeIds = active.map(q => q.id);

    // Not already active or completed
    if (activeIds.includes(quest.id) || completed.includes(quest.id)) return false;

    // Prerequisites met
    // Special-case: allow mother_lumen_request to become available after the player has chosen a class
    if (quest.id === 'mother_lumen_request') {
        try {
            const hasClass = character && character.class && character.class !== 'beginner';
            if (hasClass) return true;
        } catch (e) {}
    }
    return quest.prerequisites.every(prereq => completed.includes(prereq));
}

export function startQuest(character, questId) {
    const quest = getQuestById(questId);
    if (!quest || !canStartQuest(character, questId)) return false;

    const activeQuest = {
        id: quest.id,
        progress: quest.objectives.map(obj => ({
            type: obj.type,
            target: obj.target, // Consistent field name
            current: 0,
            required: obj.required
        }))
    };

    character.activeQuests = character.activeQuests || [];
    character.activeQuests.push(activeQuest);
    
    // Refresh quest UI when a new quest is started
    try {
        if (typeof window !== 'undefined' && window.__shared_ui) {
            if (window.__shared_ui.updateQuestTracker) {
                window.__shared_ui.updateQuestTracker(null);
            }
            if (window.__shared_ui.refreshQuestLogModal) {
                window.__shared_ui.refreshQuestLogModal(null);
            }
        }
    } catch (e) {
        console.warn('[Quest] Failed to refresh quest UI after starting quest:', e);
    }
    
    return true;
}

export function updateQuestProgress(character, type, target, amount = 1) {
    // Validation
    if (!character) {
        console.warn('[Quest] No character provided to updateQuestProgress');
        return false;
    }
    if (!Array.isArray(character.activeQuests)) {
        console.warn('[Quest] character.activeQuests is not an array');
        character.activeQuests = [];
        return false;
    }
    if (!type) {
        console.warn('[Quest] No type provided to updateQuestProgress');
        return false;
    }

    let progressMade = false;

    // Update progress for all active quests that have matching objectives
    character.activeQuests.forEach(quest => {
        if (!quest || !quest.id) {
            console.warn('[Quest] Invalid quest in activeQuests');
            return;
        }

        const questDef = getQuestById(quest.id);
        if (!questDef) {
            console.warn('[Quest] Quest definition not found:', quest.id);
            return;
        }

        if (!Array.isArray(quest.progress)) {
            console.warn('[Quest] quest.progress is not an array for:', quest.id);
            return;
        }

        quest.progress.forEach(obj => {
            if (!obj) return;
            if (obj.type !== type) return;
            
            const objTarget = obj.target;
            let matches = !objTarget || objTarget === target;
            if (!matches && type === 'kill' && objTarget && target) {
                matches = target === objTarget || target.startsWith(objTarget + '_');
            }
            
            if (matches) {
                const before = obj.current || 0;
                obj.current = Math.min(obj.required || 1, before + amount);
                
                if (obj.current > before) {
                    progressMade = true;
                    if (typeof console !== 'undefined' && console.debug) {
                        console.debug(`[Quest] Progress: ${quest.id} ${type} ${target || 'any'} ${before} → ${obj.current}`);
                    }
                }
            }
        });
    });

    // Quests now stay active until manually turned in at NPCs
    // No more auto-complete logic
    
    // Refresh quest UI if progress was made
    if (progressMade) {
        try {
            if (typeof window !== 'undefined' && window.__shared_ui) {
                if (window.__shared_ui.updateQuestTracker) {
                    window.__shared_ui.updateQuestTracker(null);
                }
                if (window.__shared_ui.refreshQuestLogModal) {
                    window.__shared_ui.refreshQuestLogModal(null);
                }
            }
        } catch (e) {
            console.warn('[Quest] Failed to refresh quest UI:', e);
        }
    }
    
    return progressMade;
}

function applyCharacterExperience(character, amount) {
    if (!character || !amount) return false;
    let leveled = false;
    character.exp = (character.exp || 0) + amount;
    character.expToLevel = character.expToLevel || 100;
    while (character.exp >= character.expToLevel) {
        character.exp -= character.expToLevel;
        character.level = (character.level || 1) + 1;
        character.expToLevel = Math.floor(character.expToLevel * 1.25);
        const raceKey = character.race || 'Human';
        const classKey = character.class || 'beginner';
        const rdefs = (typeof window !== 'undefined' && window.RACE_DEFS) ? window.RACE_DEFS : {};
        const cdefs = (typeof window !== 'undefined' && window.CLASS_DEFS) ? window.CLASS_DEFS : {};
        const racePer = (rdefs && rdefs[raceKey] && rdefs[raceKey].perLevel) ? rdefs[raceKey].perLevel : { str: 1, int: 1, agi: 1, luk: 1 };
        const classPer = (cdefs && cdefs[classKey] && cdefs[classKey].perLevel) ? cdefs[classKey].perLevel : { str: 0, int: 0, agi: 0, luk: 0 };
        if (!character.stats) character.stats = { str: 0, int: 0, agi: 0, luk: 0 };
        ['str', 'int', 'agi', 'luk'].forEach(k => {
            const add = (racePer[k] || 0) + (classPer[k] || 0);
            const fracKey = `_frac_${k}`;
            const current = character[fracKey] || 0;
            const totalAdd = current + add;
            const toApply = Math.floor(totalAdd + 0.000001);
            if (toApply > 0) character.stats[k] = (character.stats[k] || 0) + toApply;
            character[fracKey] = totalAdd - toApply;
        });
        leveled = true;
    }
    if (leveled) {
        const statsHelper = (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.stats && typeof window.__shared_ui.stats.effectiveStats === 'function')
            ? window.__shared_ui.stats.effectiveStats
            : null;
        if (statsHelper) {
            const eff = statsHelper(character) || {};
            if (typeof eff.maxhp === 'number') character.maxhp = eff.maxhp;
            if (typeof eff.maxmana === 'number') character.maxmana = eff.maxmana;
        } else {
            const level = character.level || 1;
            const str = (character.stats && character.stats.str) || 0;
            const int = (character.stats && character.stats.int) || 0;
            character.maxhp = Math.max(1, Math.floor(100 + level * 10 + (str * 10)));
            character.maxmana = Math.max(0, Math.floor(50 + level * 5 + (int * 10)));
        }
        if (typeof character.hp !== 'number' || character.hp > character.maxhp) character.hp = character.maxhp;
        if (typeof character.mana !== 'number' || character.mana > character.maxmana) character.mana = character.maxmana;
    }
    return leveled;
}

export function getQuestObjectiveState(character, questId) {
    if (!character) return [];
    const quest = getQuestById(questId);
    if (!quest) return [];
    const activeQuest = character.activeQuests?.find(q => q.id === questId);
    const progressEntries = Array.isArray(activeQuest?.progress) ? activeQuest.progress : [];

    return quest.objectives.map(obj => {
        // Find the stored progress entry for this objective
        const stored = progressEntries.find(p => {
            if (!p || p.type !== obj.type) return false;
            if (!obj.target) return true; // Objectives without a target match by type only
            return p.target === obj.target;
        });

        // Single source of truth: only use stored progress
        const current = stored && typeof stored.current === 'number' ? stored.current : 0;
        const required = obj.required || 1;

        return {
            type: obj.type,
            target: obj.target || null,
            description: obj.description || '',
            current,
            required
        };
    });
}

export function checkQuestCompletion(character, questId) {
    if (!character) return false;
    const statuses = getQuestObjectiveState(character, questId);
    if (statuses.length === 0) return false;
    return statuses.every(obj => obj.current >= (obj.required || 1));
}

import { ensureCharTalents, onCharacterLevelUp, onSkillLevelUp } from './talents.js';

export function completeQuest(character, questId) {
    const quest = getQuestById(questId);
    if (!quest) return false;

    const activeIndex = character.activeQuests?.findIndex(q => q.id === questId);
    if (activeIndex === undefined || activeIndex < 0) return false;

    // Remove from active
    character.activeQuests.splice(activeIndex, 1);

    // Add to completed
    character.completedQuests = character.completedQuests || [];
    character.completedQuests.push(questId);

    // Grant rewards
    if (quest.rewards.items) {
        character.inventory = character.inventory || [];
        const sharedUi = (typeof window !== 'undefined' && window.__shared_ui) ? window.__shared_ui : null;
        const initSlots = sharedUi && typeof sharedUi.initSlots === 'function' ? sharedUi.initSlots : null;
        const addToSlots = sharedUi && typeof sharedUi.addItemToSlots === 'function' ? sharedUi.addItemToSlots : null;
        const itemDefs = (typeof window !== 'undefined' && window.ITEM_DEFS) ? window.ITEM_DEFS : {};

        if (initSlots && addToSlots) {
            character.inventory = initSlots(character.inventory);
            quest.rewards.items.forEach(item => {
                const qty = Math.max(1, item.qty || 1);
                addToSlots(character.inventory, item.id, qty);
            });
        } else {
            quest.rewards.items.forEach(item => {
                const qty = Math.max(1, item.qty || 1);
                const existing = character.inventory.find(i => i && i.id === item.id);
                if (existing) {
                    existing.qty = (existing.qty || 0) + qty;
                } else {
                    const def = itemDefs ? itemDefs[item.id] : null;
                    character.inventory.push({ id: item.id, name: (def && def.name) || item.id, qty });
                }
            });
        }
    }

    if (quest.rewards.xp) {
        Object.keys(quest.rewards.xp).forEach(skill => {
            const amount = quest.rewards.xp[skill] || 0;
            if (!amount) return;
            if (skill === 'character') {
                try {
                    const before = (character && character.level) || 0;
                    applyCharacterExperience(character, amount);
                    const gained = ((character && character.level) || 0) - before;
                    if (gained > 0) {
                        try { onCharacterLevelUp && onCharacterLevelUp(null, character, gained); } catch (e) {}
                    }
                } catch (e) { /* ignore */ }
                return;
            }
            character[skill] = character[skill] || { level: 1, exp: 0, expToLevel: 100 };
            const beforeSkill = character[skill].level || 0;
            character[skill].exp += amount;
            while (character[skill].exp >= character[skill].expToLevel) {
                character[skill].exp -= character[skill].expToLevel;
                character[skill].level += 1;
                character[skill].expToLevel = Math.floor(character[skill].expToLevel * 1.25);
            }
            const afterSkill = character[skill].level || 0;
            const gainedSkill = afterSkill - beforeSkill;
            if (gainedSkill > 0) {
                try { onSkillLevelUp && onSkillLevelUp(null, character, skill, gainedSkill); } catch (e) {}
            }
        });
    }

    if (quest.rewards.gold) {
        character.gold = (character.gold || 0) + quest.rewards.gold;
    }

    // Do NOT auto-start follow-up quests automatically; the player should accept
    // new quests from the NPC as usual. We only refresh the quest UI so any newly
    // unlocked quests are visible at their givers.
    try {
        try { if (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.refreshQuestLogModal) window.__shared_ui.refreshQuestLogModal(null); } catch (e) {}
        try { if (typeof window !== 'undefined' && window.__shared_ui && window.__shared_ui.updateQuestTracker) window.__shared_ui.updateQuestTracker(null); } catch (e) {}
    } catch (e) {}

    return true;
}

// Expose quest module functions to window for use by shared/ui.js
if (typeof window !== 'undefined') {
    window.__questModule = {
        updateQuestProgress,
        getQuestById,
        getAvailableQuests,
        canStartQuest,
        startQuest,
        checkQuestCompletion,
        completeQuest,
        getQuestObjectiveState
    };
}

export default QUEST_DEFS;
