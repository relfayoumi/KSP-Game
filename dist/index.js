"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("./game");
window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    new game_1.Game(canvas);
};
