import { initPage as initBigCirclePage, releasePage as  releaseBigCirclePage, renderPage as renderBigCirclePage} from "./bigCircle.ts";
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
    renderBigCirclePage();
}

function releasePages() {
    releaseBigCirclePage();
}

export {initPages, renderPages, releasePages};