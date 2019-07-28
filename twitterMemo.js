// TODO find username
chrome.webRequest.onCompleted.addListener(
    (detail) => { console.log(detail) },
    ["https://api.twitter.com/*/UserByScreenName"]
);
// TODO find unique ids
// TODO map dictionaries