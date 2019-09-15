window.addEventListener("load", updateScreenName, false);

function updateScreenName(evt) {
    setInterval(showTextareaOnProfile, 100);

    let selectorString = "div.css-1dbjc4n.r-obd0qt.r-18u37iz.r-1w6e6rj.r-1h0z5md.r-dnmrzs"
    let textAreaAdded = false
    function showTextareaOnProfile() {
        let textArea = document.createElement("div");
        textArea.innerHTML = "<textarea id='memoInput'>"
        if (document.querySelector(selectorString) !== null && !textAreaAdded) {
            console.log("Hello")
            document.querySelector(selectorString).insertAdjacentElement("beforeBegin",textArea);
            textAreaAdded = true
        } else if (document.querySelector(selectorString) !== null && textAreaAdded) {
            document.getElementById("memoInput").addEventListener("focusout", function() {
                let note = {}
                let userID = getUserIDInProfilePage();
                let value = document.getElementById("memoInput").value;
                note[userID] = {"memo" : value}
                console.log(note)
                //note[userID].memo = value
                saveData(note)
            });
        }
    }
}

function getUserIDInProfilePage() {
    return "DummyID"
}

function saveData(items){
    chrome.storage.sync.set(items, function(items) {
        console.log(items);
    });
}

function loadData(key){
    chrome.storage.sync.get([key], function(result){
        var tag = result[key].tag
        var memo = result[key].memo
        console.log(key + ": { memo: " +memo +", tag: "
        + tag +"}");
    });
}