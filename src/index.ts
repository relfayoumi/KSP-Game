import { Game } from './game';

window.onload = () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    // Game constructor now starts with main menu by default
    new Game(canvas);
};