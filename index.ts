import './style.css';
import { GameConfig } from "./src/game/GameConfig";
import { runGameAsHtml } from "./src/jetlag/launcher"

// call the function that kicks off the game
runGameAsHtml('game-player', new GameConfig());