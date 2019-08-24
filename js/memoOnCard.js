window.addEventListener("load", updateScreenName, false);

function updateScreenName(evt) {
    setInterval(getScreenNameOnCard, 100);

    let currentScreenName = null;
    let selectorString = "div.css-1dbjc4n.r-1r5jyh0.r-1ipicw7 div.css-1dbjc4n.r-1oqcu8e div.css-1dbjc4n.r-18u37iz.r-1wtj0ep a[href]"
    function getScreenNameOnCard() {
        if (document.querySelector(selectorString) !== null &&
            currentScreenName !== document.querySelector(selectorString).getAttribute("href").slice(1)) {
            console.log("mouse in", currentScreenName = document.querySelector(selectorString).getAttribute("href").slice(1))
            fetch("https://us-central1-true-ability-250610.cloudfunctions.net/get-user-ids-from-display-names-usc",
                {
                    method: "POST",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ display_names: [currentScreenName] })
                })
                .then(response => response.json()).then(data => console.log(data))
            var textArea = document.createElement("div");
            textArea.innerHTML = "<textarea id='memoInput'>"
            document.querySelector(selectorString).insertAdjacentElement("afterEnd", textArea);
        } else if (document.querySelector(selectorString) === null && currentScreenName !== null) {
            currentScreenName = null;
            console.log("mouse out")
        }
    }
}