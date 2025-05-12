import {initPage, releasePage, renderPage} from "./bigCircle.ts";

function initPages() {
    let bigCirclePage = initPage();
    let result = [];
    result.push(bigCirclePage);
    return result;
}

function renderPages() {
    renderPage();
}

function releasePages() {
    releasePage();
}

export {initPages, renderPages, releasePages};