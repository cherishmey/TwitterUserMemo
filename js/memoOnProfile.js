window.addEventListener("load", updateScreenName, false);

function updateScreenName(evt) {
    setInterval(showTextareaOnProfile, 100);

    let selectorString = "div.css-1dbjc4n.r-obd0qt.r-18u37iz.r-1w6e6rj.r-1h0z5md.r-dnmrzs"
    let memoAdded = false
    function showTextareaOnProfile() {
        if (document.querySelector(selectorString) !== null && !memoAdded) {
            console.log("Hello")
            let textArea = document.createElement("textarea");
            document.querySelector(selectorString).insertAdjacentElement("beforeBegin",textArea);
            memoAdded = true
        }
    }
}