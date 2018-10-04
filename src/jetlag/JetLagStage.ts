import { JetLagManager } from "./JetLagManager"
import { WorldScene } from "./scenes/WorldScene"
import { OverlayScene } from "./scenes/OverlayScene"
import { OverlayApi } from "./api/OverlayApi"
import { ParallaxScene } from "./scenes/ParallaxScene"
import { Score } from "./misc/Score"
import { Logger } from "./misc/Logger";
import { JetLagRenderer, JetLagDevice, JetLagSound } from "./misc/JetLagDevice";
import { JetLagConfig } from "./JetLagConfig";
import { ProjectilePool } from "./misc/ProjectilePool";

/**
 * JetLagStage is the container for all of the functionality for the playable
 * portion of a game.  JetLagStage has several components:
 * - The WorldScene, where all the action of the game happens
 * - The heads-up display (HUD), where the user interface of the game is drawn.
 * - The Score object
 * - The background music and background color
 * - The background and foreground parallax layers
 * - The code for building, managing, and dismissing the win/lose/pause/welcome
 *   scenes
 *
 * JetLagStage is effectively a singleton: we re-use it for every stage that
 * gets displayed.
 *
 * JetLagStage is also the unit that receives all gestures, and forwards them to
 * either the hud, the world, or one of the overlay scenes.  (Note: strictly
 * speaking, the HUD is just an overlay scene.)
 *
 * JetLagStage does not manage transitions between stages on its own. Instead,
 * it has mechanisms (onScreenChange and endLevel) for resetting itself at the
 * beginning of a stage, and cleaning itself up at the end of a stage.
 */
export class JetLagStage {
    /** The physics world in which all actors exist */
    private world: WorldScene;

    /** A heads-up display */
    private hud: OverlayScene;

    /** Any pause, win, or lose scene that supercedes the world and hud */
    private overlay: OverlayScene;

    /** Should gestures route to the HUD first, or to the WORLD first? */
    private gestureHudFirst = true;

    /** Background color for the stage being drawn; defaults to black */
    private backgroundColor = 0xFFFFFF;

    /** The function for creating this level's pre-scene */
    private welcomeSceneBuilder: (overlay: OverlayApi) => void = null;

    /** The function for creating this level's win scene */
    private winSceneBuilder: (overlay: OverlayApi) => void = null;

    /** The function for creating this level's lose scene */
    private loseSceneBuilder: (overlay: OverlayApi) => void = null;

    /** The function for creating this level's pause scene */
    private pauseSceneBuilder: (overlay: OverlayApi) => void = null;

    /** Track all the scores */
    private score: Score;

    /** The background layers */
    private background: ParallaxScene;

    /** The foreground layers */
    private foreground: ParallaxScene;

    /** The music, if any */
    private music: JetLagSound = null;

    /** Whether the music is playing or not */
    private musicPlaying = false;

    /** A pool of projectiles for use by the hero */
    private projectilePool: ProjectilePool;

    /** Getter for the projectile pool */
    public getProjectilePool() { return this.projectilePool; }

    /** Getter for the WorldScene */
    public getWorld() { return this.world; }

    /** Getter for the HUD */
    public getHud() { return this.hud; }

    /** Getter for the background layers */
    public getBackground() { return this.background; }

    /** Getter for the foreground layers */
    public getForeground() { return this.foreground; }

    /** Set the code to run to build the welcome scene */
    public setWelcomeSceneBuilder(builder: (overlay: OverlayApi) => void) { this.welcomeSceneBuilder = builder; }

    /** Set the code to run to build the win scene */
    public setWinSceneBuilder(builder: (overlay: OverlayApi) => void) { this.winSceneBuilder = builder; }

    /** Set the code to run to build the lose scene */
    public setLoseSceneBuilder(builder: (overlay: OverlayApi) => void) { this.loseSceneBuilder = builder; }

    /** Set the code to run to build the pause scene */
    public setPauseSceneBuilder(builder: (overlay: OverlayApi) => void) { this.pauseSceneBuilder = builder; }

    /** Should gestures go to the HUD first (true), or to the world first (false) */
    public setGestureHudFirst(val: boolean) { this.gestureHudFirst = val; }

    /** Set the background color (i.e., #FFFFFF) */
    public setBackgroundColor(color: number) { this.backgroundColor = color; }

    /** Setter for the projectile pool */
    public setProjectilePool(pool: ProjectilePool) { this.projectilePool = pool; }

    /**
     * Construct a basic stage.  Note that there is a mutual dependency between
     * a stage and a score.  Do not use a stage until after calling setScore()
     * with a non-null value.  Note, too, that a stage is not usable until
     * onScreenChange() has been called.
     *
     * @param manager The JetLagManager that navigates among stages
     */
    constructor(private manager: JetLagManager, private device: JetLagDevice, private config: JetLagConfig) { }

    /** Set the score object */
    setScore(score: Score) { this.score = score; }

    /** Set the music for the stage */
    setMusic(music: JetLagSound) { this.music = music; }

    /**
     * Handle a TAP event
     * 
     * @param screenX The x coordinate of the tap, in pixels
     * @param screenY The y coordinate of the tap, in pixels
     */
    tap(screenX: number, screenY: number) {
        // If we have an overlay scene right now, let it handle the tap
        if (this.overlay != null) {
            this.overlay.tap(screenX, screenY);
            return;
        }

        if (this.config.debugMode) {
            let worldcoord = this.world.camera.screenToMeters(screenX, screenY);
            let hudcoord = this.hud.camera.screenToMeters(screenX, screenY);
            Logger.info("World Touch: (" + worldcoord.x + ", " + worldcoord.y + ")");
            Logger.info("HUD Touch: (" + hudcoord.x + ", " + hudcoord.y + ")");
        }
        if (this.gestureHudFirst) {
            if (this.hud.tap(screenX, screenY))
                return;
            else
                this.world.tap(screenX, screenY);
        }
        else {
            if (this.world.tap(screenX, screenY))
                return;
            else
                this.hud.tap(screenX, screenY);
        }
    }

    /** Handle the start of a pan */
    panStart(screenX: number, screenY: number) {
        if (this.overlay != null) {
            this.overlay.panStart(screenX, screenY);
            return;
        }
        this.hud.panStart(screenX, screenY);
    }

    /** 
     * Handle pan move
     */
    panMove(screenX: number, screenY: number) {
        if (this.overlay != null) {
            this.overlay.panMove(screenX, screenY);
            return;
        }
        this.hud.panMove(screenX, screenY);
    }

    /** 
     * Handle the end of a pan
     */
    panStop(screenX: number, screenY: number) {
        if (this.overlay != null) {
            this.overlay.panStop(screenX, screenY);
            return;
        }
        this.hud.panStop(screenX, screenY);
    }

    /** 
     * Handle a touch down event
     */
    touchDown(screenX: number, screenY: number) {
        if (this.overlay != null) {
            this.overlay.touchDown(screenX, screenY);
            return;
        }
        this.hud.touchDown(screenX, screenY);
    }

    /** Handle when a touch ends (is released) */
    touchUp(screenX: number, screenY: number) {
        if (this.overlay != null) {
            this.overlay.touchUp(screenX, screenY);
            return;
        }
        this.hud.touchUp(screenX, screenY);
    }

    /** Handle swipe events */
    swipe(screenX0: number, screenY0: number, screenX1: number, screenY1: number, time: number) {
        this.hud.swipe(screenX0, screenY0, screenX1, screenY1, time);
    }

    /** Hide the current overlay scene that is showing */
    clearOverlayScene() {
        this.overlay = null;
    }

    /**
     * This code is called every 1/45th of a second to update the game state and re-draw the screen
     * 
     * @param elapsedTime The milliseconds since the previous render
     */
    render(renderer: JetLagRenderer, elapsedTime: number) {
        // Handle pauses due to pre, pause, or post scenes.  Note that these handle their own screen
        // touches, and that win and lose scenes should come first.
        if (this.welcomeSceneBuilder) {
            this.overlay = new OverlayScene(this.config, this.device);
            this.welcomeSceneBuilder(new OverlayApi(this.overlay, this.device, this));
            this.welcomeSceneBuilder = null;
        }
        if (this.pauseSceneBuilder) {
            this.overlay = new OverlayScene(this.config, this.device);
            this.pauseSceneBuilder(new OverlayApi(this.overlay, this.device, this));
            this.pauseSceneBuilder = null;
        }
        if (this.overlay) {
            this.overlay.render(renderer, elapsedTime);
            return;
        }

        renderer.setFrameColor(this.backgroundColor);

        // Make sure the music is playing... Note that we start music before the PreScene shows
        this.playMusic();

        // Update the win/lose timers
        // Check the countdown timers
        if (this.score.loseCountDownRemaining != -100) {
            this.score.loseCountDownRemaining -= elapsedTime / 1000;
            if (this.score.loseCountDownRemaining < 0) {
                this.endLevel(false);
            }
        }
        if (this.score.winCountRemaining != -100) {
            this.score.winCountRemaining -= elapsedTime / 1000;
            if (this.score.winCountRemaining < 0) {
                // TODO:
                this.endLevel(true);
            }
        }
        if (this.score.stopWatchProgress != -100) {
            this.score.stopWatchProgress += elapsedTime / 1000;
        }

        // handle accelerometer stuff... note that accelerometer is effectively disabled during a
        // popup... we could change that by moving this to the top, but that's probably not going to
        // produce logical behavior
        this.world.handleTilt(this.device.getAccelerometer().get().x, this.device.getAccelerometer().get().y);

        // Advance the physics world by 1/45 of a second.
        //
        // NB: in Box2d, This is the recommended rate for phones, though it seems like we should be
        //     using /elapsedTime/ instead of 1/45f
        this.world.advanceWorld(1 / 45, 8, 3);

        // Execute any one time events, then clear the list
        for (let e of this.world.oneTimeEvents)
            e();
        this.world.oneTimeEvents.length = 0;

        // handle repeat events
        for (let e of this.world.repeatEvents)
            e();

        // Determine the center of the camera's focus
        this.world.adjustCamera();

        // The world is now static for this time step... we can display it!
        // draw parallax backgrounds
        this.background.render(renderer, this.world.camera, elapsedTime);
        // draw the world
        this.world.render(renderer, elapsedTime);
        // draw parallax foregrounds
        this.foreground.render(renderer, this.world.camera, elapsedTime);
        // draw Controls
        this.hud.render(renderer, elapsedTime);
    }

    /**
     * Before we call programmer code to load a new scene, we call this to
     * ensure that everything is in a clean state.
     */
    onScreenChange(): void {
        this.stopMusic();
        this.music = null;
        this.projectilePool = null;

        this.score.reset();
        this.device.getStorage().clearLevelFacts();

        // Reset default values
        this.gestureHudFirst = true;
        this.backgroundColor = 0xFFFFFF;
        this.welcomeSceneBuilder = null;
        this.winSceneBuilder = null;
        this.loseSceneBuilder = null;
        this.pauseSceneBuilder = null;

        // Create the main scene and hud
        this.world = new WorldScene(this.config, this.device);
        this.hud = new OverlayScene(this.config, this.device);
        // Set up the parallax scenes
        this.background = new ParallaxScene(this.config);
        this.foreground = new ParallaxScene(this.config);
    }

    /**
     * When a level ends, we run this code to shut it down, print a message, and
     * then let the user resume play
     *
     * @param win true if the level was won, false otherwise
     */
    endLevel(win: boolean): void {
        if (win) {
            if (this.winSceneBuilder) {
                this.overlay = new OverlayScene(this.config, this.device);
                this.winSceneBuilder(new OverlayApi(this.overlay, this.device, this));
                this.winSceneBuilder = null;
            }
            else {
                this.manager.advanceLevel();
            }
        }
        else {
            if (this.loseSceneBuilder) {
                this.overlay = new OverlayScene(this.config, this.device);
                this.loseSceneBuilder(new OverlayApi(this.overlay, this.device, this));
                this.loseSceneBuilder = null;
            }
            else {
                this.manager.repeatLevel();
            }
        }
    }

    /** If the level has music attached to it, this starts playing it */
    playMusic(): void {
        if (!this.musicPlaying && this.music) {
            this.musicPlaying = true;
            this.music.play();
        }
    }

    /** If the level has music attached to it, this pauses it */
    pauseMusic(): void {
        if (this.musicPlaying) {
            this.musicPlaying = false;
            this.music.stop();
        }
    }

    /** If the level has music attached to it, this stops it */
    stopMusic(): void {
        if (this.musicPlaying) {
            console.log("stopping music");
            this.musicPlaying = false;
            this.music.stop();
        }
    }
}