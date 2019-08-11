let btn_save = document.getElementById('btn_save');
let btn_load = document.getElementById('btn_load');

let memo_zone = document.getElementById('memo');

var items = {"test_user_id":{"memo" : "트친1", "tag" : "팦14"}};

btn_save.addEventListener('click', function saveData(){
    chrome.storage.sync.set(items, function(items) {
        console.log(items+"이 저장되었습니다");
    });
});

btn_load.addEventListener('click', function loadData(){
    chrome.storage.sync.get(["test_user_id"], function(result){
        var value = result["test_user_id"].tag
        memo_zone.innerHTML = "내 트친은 " + value +"입니다.";
    });
});