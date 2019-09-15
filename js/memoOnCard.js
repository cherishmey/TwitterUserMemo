window.addEventListener("load", updateScreenName, false);

function updateScreenName(evt) {
    setInterval(getScreenNameOnCard, 100);

    let currentScreenName = null;
    const bearerToken = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
    let selectorString = "div.css-1dbjc4n.r-1r5jyh0.r-1ipicw7 div.css-1dbjc4n.r-1oqcu8e div.css-1dbjc4n.r-18u37iz.r-1wtj0ep a[href]"
    function getScreenNameOnCard() {
        if (document.querySelector(selectorString) !== null &&
            currentScreenName !== document.querySelector(selectorString).getAttribute("href").slice(1)) {
            console.log("mouse in", currentScreenName = document.querySelector(selectorString).getAttribute("href").slice(1))
            fd = new URLSearchParams()
            fd.append("input", currentScreenName)
            fetch(`https://api.twitter.com/1.1/users/show.json?screen_name=${currentScreenName}`,
                {
                    method: "GET",
                    headers: {
                        'Accept': "*/*",
                        'Authorization': `Bearer ${bearerToken}`,
                        'Accept-Encoding': 'gzip, deflate',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'x-csrf-token': document.cookie.split("ct0=")[1].split(";")[0],
                    },
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