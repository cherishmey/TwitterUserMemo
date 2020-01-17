window.addEventListener("load", createMemoOnCard, false);

function createMemoOnCard(evt) {
    let selectorString = "div.css-1dbjc4n.r-1r5jyh0.r-1ipicw7 div.css-1dbjc4n.r-1oqcu8e div.css-1dbjc4n.r-18u37iz.r-1wtj0ep a[href]"

    setInterval(createTextArea, 100);
    function createTextArea() {
        if (document.getElementById("memoCardInput") === null && document.querySelector(selectorString) !== null) { // card appeared but no memoInput
            let textArea = document.createElement("div");
            textArea.setAttribute("id", "memoDiv")
            textArea.innerHTML = "<textarea id='memoCardInput'>"
            document.querySelector(selectorString).insertAdjacentElement("afterEnd", textArea);
            let screenName = getScreenNameOnCard()
            if (screenName === null) {
                console.log("Selector string has changed. Please contact developers.")
            } else {
                getUserIDInCard(screenName).then(userId => {
                    console.log("userId: " + userId)
                    loadCardData(userId) // and fill data
                });

                // and add an event listener
                document.getElementById("memoCardInput").addEventListener("input", function () {
                    let note = {}
                    getUserIDInCard(screenName).then(userID => {
                        if (document.getElementById("memoCardInput")) {
                            let value = document.getElementById("memoCardInput").value;
                            note[userID] = { "memo": value };
                            saveCardData(note)
                        }
                    });
                });
            }
        }
    }
}
function getScreenNameOnCard() {
    let selectorString = "div.css-1dbjc4n.r-1r5jyh0.r-1ipicw7 div.css-1dbjc4n.r-1oqcu8e div.css-1dbjc4n.r-18u37iz.r-1wtj0ep a[href]"
    if (document.querySelector(selectorString) !== null) {
        return document.querySelector(selectorString).getAttribute("href").slice(1);
    } else {
        return null;
    }
}

function getUserIDInCard(currentScreenName) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                contentScriptQuery: "getUserId",
                screenName: currentScreenName,
                csrfToken: document.cookie.split("ct0=")[1].split(";")[0]
            },
            id_str => resolve(id_str))
    });
}

function saveCardData(items) {
    chrome.storage.sync.set(items, function (items) {
    });
}

function loadCardData(key) {
    chrome.storage.sync.get([key], function (result) {
        let tag = '';
        let memo = '';
        try {
            memo = result[key].memo
        }
        catch (TypeError) {
            memo = ''
        }
        try {
            tag = result[key].tag
        }
        catch (TypeError) {
            tag = ''
        }
        document.getElementById("memoCardInput").value = memo
        console.log(`${key}: { memo: ${memo}, tag: ${tag}}`);
    });
}
