chrome.runtime.onInstalled.addListener(function () {
    // Replace all rules ...
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        // With a new rule ...
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { hostEquals: 'twitter.com', schemes: ['https'] },
                    })
                ],
                // And shows the extension's page action.
                actions: [new chrome.declarativeContent.ShowPageAction()]
            }
        ]);
    });
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.contentScriptQuery == "getUserId") {
            const bearerToken = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
            var url = "https://api.twitter.com/1.1/users/show.json?screen_name=" +
                encodeURIComponent(request.screenName);
            fetch(url,
                {
                    method: "GET",
                    headers: {
                        'Accept': "application/json",
                        'Authorization': `Bearer ${bearerToken}`,
                        'Accept-Encoding': 'gzip, deflate',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'x-csrf-token': request.csrfToken,
                    },
                })
                .then(response => response.json())
                .then(json => sendResponse(json.id_str))
                .catch(err => console.log(`[${document.domain}] error : ` + err));
            return true;
        }
    });

chrome.webRequest.onBeforeRequest.addListener(
    function (detail) {
        if (detail.method === "GET") {
            console.log(detail.url.split('profile/')[1].split('.json')[0])
        }
    },
    { urls: ["https://api.twitter.com/2/timeline/profile/*"], types: ['xmlhttprequest'] },
    ["requestBody"]
)