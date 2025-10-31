// Lightweight metadata for Phaser scenes to expose world zones to the website
// This intentionally avoids importing Phaser or scene classes.

export type SceneMeta = {
  key: string;
  label: string;
  kind: 'system' | 'world';
  description?: string;
};

export const SCENE_META: SceneMeta[] = [
  { key: 'Boot', label: 'Boot', kind: 'system' },
  { key: 'Tutorial', label: 'Tutorial', kind: 'system' },
  { key: 'Login', label: 'Login', kind: 'system' },
  { key: 'CharacterSelect', label: 'Character Select', kind: 'system' },
  { key: 'Start', label: 'Start', kind: 'system' },
  { key: 'Town', label: 'Town', kind: 'world', description: 'Hub for crafting, storage, and planning. Access furnaces, workbenches, and portals.' },
  { key: 'Cave', label: 'Cave', kind: 'world', description: 'Intro mining and early combat. Risk scales with how deep you wander.' },
  { key: 'InnerField', label: 'Inner Field', kind: 'world', description: 'Open fields for early leveling and testing builds.' },
  { key: 'OuterField', label: 'Outer Field', kind: 'world', description: 'Wider hunting grounds with increased pacing and density.' },
  { key: 'GoblinCamp', label: 'Goblin Camp', kind: 'world', description: 'Hostile pocket with coordinated enemies and burst checks.' },
  { key: 'GloamwayBastion', label: 'Gloamway Bastion', kind: 'world', description: 'Defensive layouts with vision pressure. Talent synergy matters.' },
  { key: 'GraveForest', label: 'Grave Forest', kind: 'world', description: 'Damage-over-time threats and pathing discipline checks.' },
  { key: 'BrokenDock', label: 'Broken Dock', kind: 'world', description: 'Edge-of-world pocket. Expect environmental hazards and tight windows.' },
];

export const WORLD_SCENES = SCENE_META.filter(s => s.kind === 'world');
