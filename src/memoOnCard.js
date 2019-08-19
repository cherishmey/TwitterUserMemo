window.addEventListener("load", updateScreenName, false);

function updateScreenName(evt) {
    setInterval(getScreenNameOnCard, 100);

    let currentScreenName = null;
    let selectorString = "div.css-1dbjc4n.r-1r5jyh0.r-1ipicw7 div.css-1dbjc4n.r-1oqcu8e div.css-1dbjc4n.r-18u37iz.r-1wtj0ep a[href]"
    function getScreenNameOnCard() {
        if (document.querySelector(selectorString) !== null && 
            currentScreenName !== document.querySelector(selectorString).getAttribute("href").slice(1)) {
            console.log("mouse in", currentScreenName = document.querySelector(selectorString).getAttribute("href").slice(1))
            var textArea = document.createElement("textarea");
            document.querySelector(selectorString).insertAdjacentElement("afterEnd",textArea);
        } else if (document.querySelector(selectorString) === null && currentScreenName !== null) {
            currentScreenName = null;
            console.log("mouse out")
        }
    }
}