// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class Town extends Phaser.Scene {
    constructor() {
        super('Town');
    }

    init() {
        // Initialize scene
    }

    preload() {
    // Load assets
    this.load.image('town_bg', 'assets/town_bg.png');
    }

    create() {
        // Remove default black background
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // Add background image, scaled to fill
        const bg = this.add.image(400, 300, 'town_bg');
        bg.setDisplaySize(800, 600);
        bg.setDepth(0);

        // Add platform (simple rectangle for now)
        const platform = this.add.rectangle(400, 550, 600, 40, 0x222222, 0.8);
        platform.setStrokeStyle(4, 0xa00);
        platform.setDepth(1);

        // Add character sprite
        const character = this.add.sprite(400, 500, 'character');
        character.setDisplaySize(64, 64);
        character.setDepth(2);

        // Redesigned HUD Overlay (dark horror anime theme)
        const hud = document.createElement('div');
        hud.id = 'town-hud';
        hud.style.position = 'fixed';
    hud.style.top = '8px';
    hud.style.left = '8px';
    hud.style.transform = '';
    hud.style.width = '200px';
    hud.style.padding = '2px 4px 2px 4px';
        hud.style.zIndex = '100';
        hud.style.pointerEvents = 'none';
        hud.style.display = 'flex';
        hud.style.flexDirection = 'column';
        hud.style.alignItems = 'flex-start';
        hud.style.justifyContent = 'flex-start';
        hud.style.background = 'rgba(20,10,30,0.55)';
        hud.style.backdropFilter = 'blur(8px)';
        hud.style.boxShadow = '0 0 48px 0 #111, 0 0 0 2px #a00 inset';
        hud.style.borderRadius = '16px';
        hud.style.fontFamily = 'UnifrakturCook, cursive';
        hud.style.color = '#eee';
        hud.style.padding = '8px 8px 8px 8px';
        hud.innerHTML = `
            <div style="font-size:1em; font-weight:700; color:#e44; margin-bottom:2px; letter-spacing:1px;">Character Name <span style='color:#fff; font-size:0.9em;'>- Lv 1</span></div>
            <div style="display:flex; flex-direction:column; gap:2px; width:100%;">
                <div style="height:12px; background:#2a0a16; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:100%; background:#e44; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">100/100</span>
                </div>
                <div style="height:12px; background:#181a2a; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:100%; background:#44e; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">50/50</span>
                </div>
                <div style="height:12px; background:#222a18; border-radius:6px; overflow:hidden; position:relative;">
                    <div style="height:100%; width:20%; background:#ee4; border-radius:6px; position:absolute; left:0; top:0;"></div>
                    <span style="position:absolute; right:6px; top:0; color:#fff; font-size:0.8em;">20/100</span>
                </div>
            </div>
        `;
        document.body.appendChild(hud);

        // Remove HUD on scene shutdown
        this.events.once('shutdown', () => {
            if (hud.parentNode) hud.remove();
        });
    }

}
