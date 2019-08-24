let btn_save = document.getElementById('btn_save');
let btn_load = document.getElementById('btn_load');

function saveData(items){
    btn_save.addEventListener('click', function save(){
        chrome.storage.sync.set(items, function(items) {
            console.log(items+"이 저장되었습니다");
        });
    });
}

function loadData(key){
    btn_load.addEventListener('click', function load(){
        chrome.storage.sync.get([key], function(result){
            var tag = result[key].tag
            var memo = result[key].memo
            console.log(key + ": { memo: " +memo +", tag: "
            + tag +"}");
        });
    });
}