import { initPage as initBigCirclePage, releasePage as  releaseBigCirclePage } from "./bigCircle.ts";
import { initPage as initSnakesInCubePage } from "./snakeInCube";

function initPages() {
    let bigCirclePage = initBigCirclePage();
    let snakesInCubePage = initSnakesInCubePage();
    let result = [];
    result.push(bigCirclePage);
    result.push(snakesInCubePage);
    return result;
}

function renderPages() {
    // renderBigCirclePage(); // Removed call, as renderPage is no longer used/exported from bigCircle.ts
}

function releasePages() {
    releaseBigCirclePage();
}

export {initPages, renderPages, releasePages};