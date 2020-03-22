window.addEventListener("load", createMemoOnProfile, false);

function createMemoOnProfile(evt) {
    let currentURL = window.location.href;

    let selectorString = "div.css-1dbjc4n.r-ku1wi2.r-1j3t67a.r-m611by"

    setInterval(updateCurrentURL, 100);
    function updateCurrentURL() { // Update memo on URL change. This is for profile -> profile
        if (currentURL !== window.location.href) {
            currentURL = window.location.href;
            if (document.getElementById("memoProfileInput") !== null && document.querySelector(selectorString) !== null) { // has memoInput
                getUserIDInProfilePage(getScreenNameOnProfile()).then(
                    (userID) => loadProfileData(userID));
            }
        }
    }

    setInterval(createTextArea, 100);
    function createTextArea() { // Update memo on the creation of memoInput
        if (document.getElementById("memoProfileInput") === null && document.querySelector(selectorString) !== null) { // profile page but no memoInput
            let textArea = document.createElement("div");
            textArea.setAttribute("id", "memoDiv");
            textArea.innerHTML = "<textarea id='memoProfileInput'>";
            document.querySelector(selectorString).insertAdjacentElement("afterEnd", textArea); // then create one
            if (getScreenNameOnProfile() === null) {
                console.log("Selector string has changed. Please contact developers.")
            } else {
                getUserIDInProfilePage(getScreenNameOnProfile()).then(userId => {
                    loadProfileData(userId) // and fill data
                });

                document.getElementById("memoProfileInput").addEventListener("input", function () {
                    let note = {}

                    //console.log("page of ", screenName);
                    getUserIDInProfilePage(getScreenNameOnProfile()).then(userID => {
                        if (document.getElementById("memoProfileInput")) {
                            let value = document.getElementById("memoProfileInput").value;
                            note[userID] = { "memo": value };
                            saveProfileData(note)
                        }
                    });
                });
            }
        }
    }
}

function getScreenNameOnProfile() {
    let profileAreaSelectorString = ["div.css-1dbjc4n.r-ku1wi2.r-1j3t67a.r-m611by"]
    let screenNameSelectorString = ["div.css-901oao.css-bfa6kz.r-111h2gw.r-18u37iz.r-1qd0xha.r-a023e6.r-16dba41.r-ad9z0x.r-bcqeeo.r-qvutc0",  // dark theme
        "div.css-901oao.css-bfa6kz.r-1re7ezh.r-18u37iz.r-1qd0xha.r-a023e6.r-16dba41.r-ad9z0x.r-bcqeeo.r-qvutc0",  // light theme
        "div.css-901oao.css-bfa6kz.r-9ilb82.r-18u37iz.r-1qd0xha.r-a023e6.r-16dba41.r-ad9z0x.r-bcqeeo.r-qvutc0"]  // black theme
    let spanClassName = "css-901oao css-16my406 r-1qd0xha r-ad9z0x r-bcqeeo r-qvutc0"
    profileArea = document.querySelector(profileAreaSelectorString)
    if (profileArea.querySelector(screenNameSelectorString) !== null) {
        return profileArea.querySelector(screenNameSelectorString).getElementsByClassName(spanClassName)[0].innerHTML.toString();
    } else {
        return null;
    }
}

function getUserIDInProfilePage(currentScreenName) {
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

function saveProfileData(items) {
    chrome.storage.sync.set(items, function (items) {
    });
}

function loadProfileData(key) {
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
        document.getElementById("memoProfileInput").value = memo
    });
}
