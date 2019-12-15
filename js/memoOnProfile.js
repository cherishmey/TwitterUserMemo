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
            textArea.setAttribute("id", "memoDiv")
            textArea.innerHTML = "<textarea id='memoInput'>"
            document.querySelector(selectorString).insertAdjacentElement("beforeBegin", textArea); // then create one
            let screenName = getScreenNameOnProfile()
            getUserIDInProfilePage(screenName).then(userId => {
                console.log("userId: "+userId)
                loadData(userId) // and fill data
            });

            document.getElementById("memoInput").addEventListener("focusout", function () {
                let note = {}
                
                //console.log("page of ", screenName);
                getUserIDInProfilePage(screenName).then(userID => {
                    let value = document.getElementById("memoInput").value;
                    note[userID] = { "memo": value };
                    console.log(note)
                    saveData(note)
                });
            });
        }
    }
}

function getScreenNameOnProfile(){
    let screenNameSelectorString = "div.css-901oao.css-bfa6kz.r-111h2gw.r-18u37iz.r-1qd0xha.r-a023e6.r-16dba41.r-ad9z0x.r-bcqeeo.r-qvutc0"
    let spanClassName = "css-901oao css-16my406 r-1qd0xha r-ad9z0x r-bcqeeo r-qvutc0"
    if (document.querySelector(screenNameSelectorString) !== null){
        return document.querySelector(screenNameSelectorString).getElementsByClassName(spanClassName)[0].innerHTML.toString();
    }
}

function getUserIDInProfilePage(currentScreenName) {
    const bearerToken = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
    fd = new URLSearchParams()
    fd.append("input", currentScreenName)
    return fetch(`https://api.twitter.com/1.1/users/show.json?screen_name=${currentScreenName}`,
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
        .then(response => response.json())
        .then(json => json.id_str)
        .catch(err => console.log(`[${document.domain}] error : `+err));
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
