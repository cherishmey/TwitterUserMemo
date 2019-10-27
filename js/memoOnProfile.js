window.addEventListener("load", createMemoOnProfile, false);

function createMemoOnProfile(evt) {
    let currentURL = window.location.href;
    let selectorString = "div.css-1dbjc4n.r-obd0qt.r-18u37iz.r-1w6e6rj.r-1h0z5md.r-dnmrzs"

    setInterval(updateCurrentURL, 100);
    function updateCurrentURL() { // Update memo on URL change. This is for profile -> profile
        if (currentURL !== window.location.href) {
            currentURL = window.location.href;
            if (document.getElementById("memoInput") !== null && document.querySelector(selectorString) !== null) { // has memoInput
                loadData(getUserIDInProfilePage());
            }
        }
    }

    setInterval(createTextArea, 100);
    function createTextArea() { // Update memo on the creation of memoInput
        if (document.getElementById("memoInput") === null && document.querySelector(selectorString) !== null) { // profile page but no memoInput
            let textArea = document.createElement("div");
            textArea.innerHTML = "<textarea id='memoInput'>"
            document.querySelector(selectorString).insertAdjacentElement("beforeBegin", textArea); // then create one
            loadData(getUserIDInProfilePage()) // and fill data
            document.getElementById("memoInput").addEventListener("focusout", function () {
                let note = {}
                let userID = getUserIDInProfilePage();
                let value = document.getElementById("memoInput").value;
                note[userID] = { "memo": value };
                console.log(note)
                saveData(note)
            });
        }
    }
}

function getUserIDInProfilePage() {
    return "DummyID"
}

function saveData(items) {
    chrome.storage.sync.set(items, function (items) {
        console.log(items);
    });
}

function loadData(key) {
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
        document.getElementById("memoInput").value = memo
        console.log(`${key}: { memo: ${memo}, tag: ${tag}}`);
    });
}
