const express = require('express');
const router = express.Router();
const request = require('request');
const _ = require('underscore');
const rp = require('request-promise');

//user data
const userDate = require('./../config.json');


//TODO: переписать на класс, добавить es6 , ts
function setHttpHeaders(serverDomain, cookie){

    return {
        'content-type' : 'application/x-www-form-urlencoded',
        'Cookie' : cookie,
        'Host': serverDomain+'.kingdoms.com',
        'Origin': 'http://'+serverDomain+'.kingdoms.com',
        'Pragma':'no-cache',
        'Referer': 'http://'+serverDomain+'.kingdoms.com',
        'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
    }
}
function fixedTimeGenerator(seconds) {
    //Точное кол-во seconds секунд
    return parseInt(1000 * seconds);
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomTimeGenerator(seconds) {
    //Рандом число в пределах seconds секунд
    return parseInt(getRandomInt(-1000, 1000) * seconds);
}
function httpRequest(obj, serverDomain){
    console.log('http://' + serverDomain + '.kingdoms.com/api/?c='+ obj.controller +'&a='+ obj.action +'&' + timeForGame)
    console.log(JSON.stringify(obj));
    // rp();


    let options = {
        headers: setHttpHeaders(serverDomain),
        method: obj.method || 'GET',
        uri: 'http://' + serverDomain + '.kingdoms.com/api/?c='+ obj.controller +'&a='+ obj.action +'&' + timeForGame,
        body: JSON.stringify(obj),
        json: true // Automatically stringifies the body to JSON
    };

    return rp(options);
}
//fixedTime - фиксированное время
//randomTime - разброс
function autoFarmList(fixedTime, randomTime, listPayload, serverDomain, init) {

        var lastDataFromList = {
            "action": "get",
            "controller": "cache",
            "params": {
                "names": [
                    "Kingdom:undefined",
                    "Collection:FarmList:"
                ]
            },
            "session": listPayload.session
        };
        //
        //for (var i = 0; i < listPayload.params.listIds.length; i++) {
        //  var obj = "Collection:FarmListEntry:" + listPayload.params.listIds[i];
        //  lastDataFromList.params.names.push(obj);
        //}

        var percentLose = 0.75;

        var startFarmListRaid = function () {

            request
            .post({
                headers: setHttpHeaders(),
                url: 'http://' + serverDomain + '.kingdoms.com/api/?c=troops&a=send&' + timeForGame,
                body: JSON.stringify(listPayload)
            }, function (error, response, body) {
                console.info('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] отправлен');
                //console.info(body);
            })
        };


        var checkList = function () {
            console.log('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] проверка');

            function start(counter, countMax, timeout, clearTimer, func, obj) {

                if (counter < countMax){

                    setTimeout(function () {

                        if (func){func(obj, counter);}

                        counter++;
                        start(counter, countMax, timeout, clearTimer, func, obj);

                    }, timeout);

                } else{

                    console.log('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] проверка закончена');

                    var now = new Date();
                    var rand = fixedTimeGenerator(fixedTime) + randomTimeGenerator(randomTime);

                    //console.log(now+rand);

                    var tempTime = now.valueOf() + rand;
                    var dateNext = new Date(tempTime);
                    //запуск сразу
                    if (init) {
                        console.log('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] запуск: [' + now.toString()+']');
                        startFarmListRaid();
                    }

                    console.log('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] следующий запуск: [' + dateNext.toString()+']');


                    init = true;

                    setTimeout(checkList, rand);

                }
            }

            function rowInListChanger(body, i, j){
                console.log(JSON.stringify(body.cache[j]));
                var objFromCache = body.cache[j].data.cache[i],
                    lastReport = objFromCache.data.lastReport;

                // console.log(j, i);

                var newObjUnits = {
                    "controller": "farmList",
                    "action": "editTroops",
                    "params": {
                        "entryIds": [objFromCache.data.entryId],
                        "units": objFromCache.data.units
                    },
                    "session": listPayload.session
                };

                //TODO: переписывать в зависимости от рассы
                var romeTroops = {
                    1: 50,
                    2: 20,
                    3: 50,
                    4: 0,
                    5: 100,
                    6: 70
                };

                if (!lastReport) return false;
                // console.log(lastReport);
                if (lastReport.notificationType == '1') {
                    var sum = 0;

                    for (var unitKey in objFromCache.data.units) {
                        sum += parseInt(objFromCache.data.units[unitKey]);
                    }

                    //Если полный хабар то увеличиваем счётчик юнита
                    if (lastReport.capacity === lastReport.raidedResSum) {
                        for (var unitKey in objFromCache.data.units) {

                            if (objFromCache.data.units[unitKey] != 0) {
                                objFromCache.data.units[unitKey]++;
                            }

                            // console.log('Зелёный лог: увеличилось на 1 юнита');

                        }
                    }

                    //Если хабар не полный, то грузподъемность пополам
                    else if (lastReport.capacity / 2 > lastReport.raidedResSum || sum > 10) {
                        if (objFromCache.data.units[unitKey] != 0) {
                            objFromCache.data.units[unitKey]--;
                        }

                        // console.log('Зелёный лог: уменьшилось на 1 юнита');

                    }

                    else {
                        //console.log('Зелёный лог: оставить без изменений');
                        return false;
                    }

                }
                else if (lastReport.notificationType == '2') {
                    var capacity = 0;

                    for (var unitKey in objFromCache.data.units) {
                        // console.log(parseInt(objFromCache.data.units[unitKey]));
                        // console.log(romeTroops[unitKey]);
                        capacity += parseInt(objFromCache.data.units[unitKey]) * romeTroops[unitKey];
                    }

                    //Если потери будут меньше чем указанный процент, то кол-во юнитов увеличивается в два раза

                    // console.log('Capacity: ' + capacity);
                    // console.log('LastReport: ' + lastReport.capacity * percentLose);
                    if (capacity > lastReport.capacity * percentLose && capacity/4 < lastReport.capacity * percentLose) {
                        for (var unitKey in objFromCache.data.units) {
                            objFromCache.data.units[unitKey] *= 2
                        }
                        // console.log('Жёлтый лог: отправлен запрос');
                    } else {

                        for (var unitKey in objFromCache.data.units) {
                            sum += parseInt(objFromCache.data.units[unitKey]);
                            objFromCache.data.units[unitKey] = 0;
                        }

                        objFromCache.data.units[1] = 1;

                        // console.log('Жёлтый лог: убран');
                    }
                }
                else if (lastReport.notificationType == '3'){

                    var sum = 0;

                    for (var unitKey in objFromCache.data.units) {
                        sum += parseInt(objFromCache.data.units[unitKey]);
                        objFromCache.data.units[unitKey] = 0;
                    }

                    objFromCache.data.units[2] = 1;

                    if (sum == 1) {
                        // console.log('Красный лог: оставлен без изменения');
                        return false;
                    } else {
                        // console.log('Название деревни' + objFromCache.data.villageName);
                        // console.log('Красный лог: отправлен запрос');
                    }
                }

                // console.log(newObjUnits);

                httpRequest(newObjUnits, serverDomain).then(
                    function (body) {
                        console.log(body);
                    },
                    function (err) {
                        console.log(err);
                    }
                );
            }

            function listTimer(body, i){
                var j = 1;
                var diffI = 0;
                var sum = body.cache[1].data.cache.length;

                for (var k = 1; k < body.cache.length;k++ ) {
                    if (i >= sum){
                        diffI = sum;
                        sum += body.cache[k].data.cache.length;
                        j++;
                    }
                }

                // console.log(sum);
                // console.log(sum);

                //+1 от Kingdom:undefined
                // var rowInListChangerTimerObj = rowInListChanger(body, i-diffI+1 , j);
            }

            httpRequest(lastDataFromList, serverDomain)
                .then(function (body) {
                    console.log(JSON.stringify(body));
                    var counter = 0;
                    var countMax = 0;

                    if (body && body.error){
                        console.log(body.error.message + " " + listPayload.session);
                    }

                    for (var i = 0; i < body.cache.length; i++) {
                        if (body.cache[i].name === "Kingdom:undefined"){
                            continue;
                        }
                        countMax += body.cache[i].data.cache.length;
                    }

                    //console.log(countMax);

                    var listTimerObj = start(counter, countMax,  1000, listTimerObj, listTimer, body);


                })
                .catch(function (err) {
                    //console.log(err);
                    console.log(err);
                    // POST failed...
                });

        };

        checkList();


    };
function getMapInfo(type, token, serverDomain, timeForGame) {
        type = type || 'animal';
        request
            .get({
                headers: {'content-type': 'application/x-www-form-urlencoded'},
                url: 'http://' + serverDomain + '.kingdoms.com/api/external.php?action=requestApiKey&email=allin.nikita@yandex.ru&siteName=borsch&siteUrl=http://borsch-label.com&public=true'
            }, function (error, response, body) {

                apiKey = JSON.parse(body);
                console.log('Получили токен');
                //console.log(apiKey);

                request
                    .get({
                        headers: {'content-type': 'application/x-www-form-urlencoded'},
                        url: 'http://' + serverDomain + '.kingdoms.com/api/external.php?action=getMapData&privateApiKey=' + apiKey.response.privateApiKey
                    }, function (error, response, body) {
                        var toJson = JSON.parse(body);
                        apiData.players = JSON.stringify(toJson.response.players);
                        apiData.alliances = JSON.stringify(toJson.response.alliances);
                        apiData.gameworld = JSON.stringify(toJson.response.gameworld);
                        apiData.crop = {};


                        function oasis() {

                            var oasisArr = [];
                            var oasisObj = JSON.parse(JSON.stringify(toJson.response.map.cells));
                            var j = 0;
                            for (var i = 0; i < oasisObj.length; i++) {
                                if (oasisObj[i].oasis != 0) {
                                    oasisArr[j] = 'MapDetails:' + oasisObj[i].id;
                                    j++;
                                }
                            }

                            var oasisAnimal = [];
                            var k = 0;
                            console.log('Сформировали массив');

                            var session = {"controller": "cache", "action": "get", "params": {"names": oasisArr}, "session": token};

                            request
                                .post({
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    url: 'http://' + serverDomain + '.kingdoms.com/api/?c=cache&a=get&' + timeForGame,
                                    body: JSON.stringify(session)
                                }, function (error, response, body) {
                                    //console.log(body);
                                    var jsonBody = JSON.parse(body);

                                    var map = [];
                                    var defenseTable = [
                                        {Infantry: 25, Mounted: 20},
                                        {Infantry: 35, Mounted: 40},
                                        {Infantry: 40, Mounted: 60},
                                        {Infantry: 66, Mounted: 55},
                                        {Infantry: 70, Mounted: 33},
                                        {Infantry: 80, Mounted: 70},
                                        {Infantry: 140, Mounted: 200},
                                        {Infantry: 380, Mounted: 240},
                                        {Infantry: 170, Mounted: 250},
                                        {Infantry: 440, Mounted: 520},
                                        {Infantry: 1000, Mounted: 1000}
                                    ];
                                    var l = 0;


                                    //console.log(jsonBody.cache);

                                    for (var m = 0; m < jsonBody.cache.length; m++) {
                                        for (var k = 0; k < toJson.response.map.cells.length; k++) {
                                            if (toJson.response.map.cells[k].id == jsonBody.cache[m].data.troops.villageId) {

                                                var avgMaxDpsInfantry = 0;
                                                var avgAllDpsInfantry = 0;
                                                var avgMaxDpsMounted = 0;
                                                var avgAllDpsMounted = 0;
                                                var troopsCounter = 0;
                                                var minTroopsCounter = 1000000;
                                                var toIntUnits = 0;
                                                var counterAnimalType = 0;

                                                for (var counterUnits in jsonBody.cache[m].data.troops.units) {
                                                    if (jsonBody.cache[m].data.troops.units.hasOwnProperty(counterUnits)) {
                                                        toIntUnits = parseInt(jsonBody.cache[m].data.troops.units[counterUnits], 10);
                                                        if (toIntUnits != 0 &&
                                                            minTroopsCounter > toIntUnits) {
                                                            minTroopsCounter = toIntUnits;
                                                        }
                                                        if (toIntUnits) {
                                                            counterAnimalType++
                                                        }
                                                        troopsCounter += toIntUnits;
                                                        avgAllDpsInfantry += jsonBody.cache[m].data.troops.units[counterUnits] * defenseTable[counterUnits - 1].Infantry;
                                                        avgAllDpsMounted += jsonBody.cache[m].data.troops.units[counterUnits] * defenseTable[counterUnits - 1].Mounted;
                                                    }
                                                }

                                                avgAllDpsInfantry = (avgAllDpsInfantry / troopsCounter).toFixed(1);
                                                avgAllDpsMounted = (avgAllDpsMounted / troopsCounter).toFixed(1);

                                                if (avgAllDpsInfantry.length < 5) {
                                                    avgAllDpsInfantry = '0' + avgAllDpsInfantry
                                                }

                                                if (avgAllDpsMounted.length < 5) {
                                                    avgAllDpsMounted = '0' + avgAllDpsMounted
                                                }

                                                if (troopsCounter === 0) {
                                                    break;
                                                }

                                                map[l] = {
                                                    x: toJson.response.map.cells[k].x,
                                                    y: toJson.response.map.cells[k].y,
                                                    animal: jsonBody.cache[m].data.troops.units,
                                                    counterAnimalType: counterAnimalType,
                                                    avgAllDps: avgAllDpsInfantry + '/' + avgAllDpsMounted,
                                                    avgAllDpsInfantry: avgAllDpsInfantry,
                                                    avgAllDpsMounted: avgAllDpsMounted
                                                };

                                                l++;
                                                break;
                                            }
                                        }
                                    }

                                    map = _.sortBy(map, 'avgAllDpsInfantry').reverse();


                                    apiData.map = map;
                                    //console.log(apiData.map);
                                    //console.log(jsonBody.cache);
                                    //console.log(toJson.response.map.cells);
                                    console.log('Создали объект');

                                });
                        }
                        function crop(map){

                            var cropArray = [];

                            custom = {
                                x: 0,
                                y: 0
                            };

                            for (var i = 0; i < map.length; i++) {
                                var obj = map[i];
                                if(obj.resType == '3339' && obj.oasis == 0 && obj.kingdomId == 0){
                                    obj.path = Math.sqrt(Math.pow((obj.x-custom.x),2) + Math.pow((obj.y-custom.y), 2));
                                    obj.path = obj.path.toFixed(3);
                                    if(obj.path.length==5){obj.path='0'+obj.path}
                                    cropArray.push(obj);
                                }
                            }

                            cropArray = _.sortBy(cropArray, 'path');

                            apiData.crop = cropArray;
                            console.log('Создали объект 15-ек');

                        }

                        switch (type){
                            case 'animal':
                                oasis();
                                break;
                            case 'crop':
                                crop(toJson.response.map.cells);
                                break;
                        }
                    });
            });
    };
function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function() {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },

        break: function() {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}
function searchEnemy(xCor, yCor) {

    //http://rux3.kingdoms.com/api/?c=troops&a=send&t1486071488668

    request
        .get({
                headers: {'content-type' : 'application/x-www-form-urlencoded'},
                url:     'http://'+serverDomain+'.kingdoms.com/api/external.php?action=requestApiKey&email=allin.nikita@yandex.ru&siteName=borsch&siteUrl=http://borsch-label.com&public=true'
            }, function(error, response, body){

                apiKey = JSON.parse(body);
                console.log('Получили токен');

                request
                    .get({
                            headers: {'content-type' : 'application/x-www-form-urlencoded'},
                            url:     'http://'+serverDomain+'.kingdoms.com/api/external.php?action=getMapData&privateApiKey='+apiKey.response.privateApiKey
                        }, function(error, response, body) {

                            var jsonBody = JSON.parse(body);
                            var players = _.pluck(jsonBody.response.players, 'playerId');

                            for (var i = 0; i < players.length; i++) {
                                players[i] = 'Player:'+players[i];
                            }

                            var payload = {
                                controller: "cache",
                                action: "get",
                                params: {names: players},
                                session: token
                            };
                            console.log('Сфоримировали массив игроков');

                            request
                                .post({

                                    headers: {
                                        'content-type' : 'application/x-www-form-urlencoded',
                                        'Cookie' : 't5mu=YBnM550V5tEbE9UM; gl5SessionKey=%7B%22key%22%3A%221a936d1acfe5bac9f4a5%22%2C%22id%22%3A%22166540%22%7D; gl5PlayerId=166540; t5SessionKey=%7B%22key%22%3A%22e0a9610f253ef9814ada%22%2C%22id%22%3A%22124%22%7D; _ga=GA1.2.1502737351.1484125044; _gat=1; t5socket=%22client588d54d17b8f4%22; msid=ci7d1tr76t4br93dqodgu4c3h5',
                                        'Host': serverDomain+'.kingdoms.com',
                                        'Origin': 'http://'+serverDomain+'.kingdoms.com',
                                        'Pragma':'no-cache',
                                        'Referer': 'http://'+serverDomain+'.kingdoms.com',
                                        'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                                    },
                                    url:     'http://'+serverDomain+'.kingdoms.com/api/?c=cache&a=get&'+timeForGame,
                                    body:    JSON.stringify(payload)
                                }, function(error, response, body) {
                                    var allVillages = JSON.parse(body);
                                    var allSortedVillages = [];

                                    //Условия
                                    allVillages.cache.forEach(function(item, i, arr){
                                        if (item.data.kingdomId == 6){
                                            // if (item.data.active == 0){
                                            for (var j = 0; j < item.data.villages.length; j++) {
                                                var obj = item.data.villages[j];
                                                // console.log(obj);
                                                allSortedVillages.push(obj);
                                            }
                                        }
                                    });


                                    var sortedAllSortedVillages = _.sortBy(allSortedVillages, function(villages){
                                        var len = Math.sqrt(Math.pow(villages.coordinates.x - xCor, 2) + Math.pow(villages.coordinates.y - yCor, 2));
                                        return len;
                                    });

                                    console.log('Количество ' + sortedAllSortedVillages.length);

                                    asyncLoop(
                                        sortedAllSortedVillages.length,
                                        function (loop) {


                                            var i = loop.iteration();

                                            var villageId = sortedAllSortedVillages[i].villageId;
                                            //console.log(listIndex);

                                            //TODO: villageID это номер деревни из которой отправляют !

                                            var requestPayload = {
                                                "controller":"troops",
                                                "action":"send",
                                                "params":{
                                                    "destVillageId":villageId,
                                                    "villageId":536723454,
                                                    "movementType":6,
                                                    "redeployHero":false,
                                                    "units":{
                                                        "1":0,
                                                        "2":0,
                                                        "3":0,
                                                        "4":1,
                                                        "5":0,
                                                        "6":0,
                                                        "7":0,
                                                        "8":0,
                                                        "9":0,
                                                        "10":0,
                                                        "11":0
                                                    },
                                                    "spyMission":"resources"
                                                },
                                                "session":token
                                            };
                                            // http://rux3.kingdoms.com/api/?c=troops&a=send&t1486071488668

                                            var lastReportPayload = {
                                                "controller":"reports",
                                                "action":"getLastReports",
                                                "params":{
                                                    "collection":"search",
                                                    "start":0,
                                                    "count":10,
                                                    "filters":[
                                                        "15","16","17",
                                                        {"villageId":villageId}
                                                    ],
                                                    "alsoGetTotalNumber":true
                                                },
                                                "session":token
                                            };

                                            request
                                                .post({
                                                    headers: {
                                                        'content-type' : 'application/x-www-form-urlencoded',
                                                        'Cookie' : 't5mu=YBnM550V5tEbE9UM; gl5SessionKey=%7B%22key%22%3A%221a936d1acfe5bac9f4a5%22%2C%22id%22%3A%22166540%22%7D; gl5PlayerId=166540; t5SessionKey=%7B%22key%22%3A%22e0a9610f253ef9814ada%22%2C%22id%22%3A%22124%22%7D; _ga=GA1.2.1502737351.1484125044; _gat=1; t5socket=%22client588d54d17b8f4%22; village=536723453; msid=ci7d1tr76t4br93dqodgu4c3h5',
                                                        'Host': serverDomain+'.kingdoms.com',
                                                        'Origin': 'http://'+serverDomain+'.kingdoms.com',
                                                        'Pragma':'no-cache',
                                                        'Referer': 'http://'+serverDomain+'.kingdoms.com',
                                                        'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                                                    },
                                                    url:     'http://'+serverDomain+'.kingdoms.com/api/?c=reports&a=getLastReports&'+timeForGame,
                                                    body:    JSON.stringify(lastReportPayload)
                                                }, function(error, response, body) {
                                                    body = JSON.parse(body);
                                                    //15 - чистый лог
                                                    //16 - с потерями
                                                    //17 - всё проёбано блеать :(
                                                    if (body.response && body.response.reports && body.response.reports.length > 0 && body.response.reports[0].notificationType === 15){
                                                        scanNow();
                                                        // console.log('body.response.reports > 0');
                                                        // console.log(body.response.reports[0]);
                                                    } else if (body.response && body.response.reports && body.response.reports.length === 0) {
                                                        // console.log('body.response.reports === 0')
                                                        scanNow();
                                                    } else {
                                                        // if (body.response && body.response.reports){
                                                        //     console.log(body.response.reports[0].notificationType);
                                                        // } else {
                                                        //     console.log(body.response)
                                                        // }
                                                        loop.next();
                                                    }

                                                });

                                            function scanNow(){

                                                request
                                                    .post({
                                                        headers: {
                                                            'content-type' : 'application/x-www-form-urlencoded',
                                                            'Cookie' : 't5mu=YBnM550V5tEbE9UM; gl5SessionKey=%7B%22key%22%3A%221a936d1acfe5bac9f4a5%22%2C%22id%22%3A%22166540%22%7D; gl5PlayerId=166540; t5SessionKey=%7B%22key%22%3A%22e0a9610f253ef9814ada%22%2C%22id%22%3A%22124%22%7D; _ga=GA1.2.1502737351.1484125044; _gat=1; t5socket=%22client588d54d17b8f4%22; village=536723453; msid=ci7d1tr76t4br93dqodgu4c3h5',
                                                            'Host': serverDomain+'.kingdoms.com',
                                                            'Origin': 'http://'+serverDomain+'.kingdoms.com',
                                                            'Pragma':'no-cache',
                                                            'Referer': 'http://'+serverDomain+'.kingdoms.com',
                                                            'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                                                        },
                                                        url:     'http://'+serverDomain+'.kingdoms.com/api/?c=troops&a=send&'+timeForGame,
                                                        body:    JSON.stringify(requestPayload)
                                                    }, function(error, response, body) {
                                                        var rand = fixedTimeGenerator(6) + randomTimeGenerator(3);
                                                        setTimeout(function(){
                                                            console.log('Рандомное время ' + i + ': ' + rand);
                                                            loop.next();
                                                        }, rand);
                                                        //console.log(body);
                                                    });
                                            }
                                        },
                                        function(){console.log('Search ended')}
                                    );



                                    // return false;


                                });
                            //console.log(toJson.response.alliances);
                            //console.log(JSON.stringify(toJson.response.gameworld));
                        }
                    )
            }
        )
}
function autoFarmFinder(xCor, yCor, name){
    request
        .get({
                headers: {'content-type' : 'application/x-www-form-urlencoded'},
                url:     'http://'+serverDomain+'.kingdoms.com/api/external.php?action=requestApiKey&email=allin.nikita@yandex.ru&siteName=borsch&siteUrl=http://borsch-label.com&public=true'
            }, function(error, response, body){

                apiKey = JSON.parse(body);
                console.log('Получили токен');

                request
                    .get({
                            headers: {'content-type' : 'application/x-www-form-urlencoded'},
                            url:     'http://'+serverDomain+'.kingdoms.com/api/external.php?action=getMapData&privateApiKey='+apiKey.response.privateApiKey
                        }, function(error, response, body) {

                            var jsonBody = JSON.parse(body);
                            var players = _.pluck(jsonBody.response.players, 'playerId');

                            for (var i = 0; i < players.length; i++) {
                                players[i] = 'Player:'+players[i];
                            }

                            var payload = {
                                controller: "cache",
                                action: "get",
                                params: {names: players},
                                session: token
                            };

                            console.log('Сфоримировали массив игроков');

                            request
                                .post({

                                    headers: {
                                        'content-type' : 'application/x-www-form-urlencoded',
                                        'Cookie' : 't5mu=YBnM550V5tEbE9UM; gl5SessionKey=%7B%22key%22%3A%221a936d1acfe5bac9f4a5%22%2C%22id%22%3A%22166540%22%7D; gl5PlayerId=166540; t5SessionKey=%7B%22key%22%3A%22e0a9610f253ef9814ada%22%2C%22id%22%3A%22124%22%7D; _ga=GA1.2.1502737351.1484125044; _gat=1; t5socket=%22client588d54d17b8f4%22; msid=ci7d1tr76t4br93dqodgu4c3h5',
                                        'Host': serverDomain+'.kingdoms.com',
                                        'Origin': 'http://'+serverDomain+'.kingdoms.com',
                                        'Pragma':'no-cache',
                                        'Referer': 'http://'+serverDomain+'.kingdoms.com',
                                        'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                                    },
                                    url:     'http://'+serverDomain+'.kingdoms.com/api/?c=cache&a=get&'+timeForGame,
                                    body:    JSON.stringify(payload)
                                }, function(error, response, body) {
                                    var allVillages = JSON.parse(body);
                                    var allGreyVillages = [];

                                    //Условия
                                    allVillages.cache.forEach(function(item, i, arr){
                                        // if (item.data.kingdomId == 6){
                                        if (item.data.active == 0){
                                            for (var j = 0; j < item.data.villages.length; j++) {
                                                var obj = item.data.villages[j];
                                                // console.log(obj);
                                                allGreyVillages.push(obj);
                                            }
                                        }
                                    });

                                    // return false;

                                    var sortedAllGreyVillages = _.sortBy(allGreyVillages, function(villages){
                                        var len = Math.sqrt(Math.pow(villages.coordinates.x - xCor, 2) + Math.pow(villages.coordinates.y - yCor, 2));
                                        return len;
                                    });

                                    console.log('Количество ' + sortedAllGreyVillages.length);



                                    var listLength = Math.ceil(sortedAllGreyVillages.length/100);

                                    // Если нужен только первые 100 целей
                                    // listLength = 1;
                                    var listIndex = 0;
                                    var listId = [];

                                    var count = 0;

                                    for (var i = 0; i < listLength; i++) {

                                        var listObj = {
                                            "controller":"farmList",
                                            "action":"createList",
                                            "params":{"name":name + ' ' + i},
                                            "session":token
                                        };

                                        // console.log(listObj);

                                        request
                                            .post({

                                                headers: {
                                                    'content-type' : 'application/x-www-form-urlencoded',
                                                    'Cookie' : 't5mu=YBnM550V5tEbE9UM; gl5SessionKey=%7B%22key%22%3A%221a936d1acfe5bac9f4a5%22%2C%22id%22%3A%22166540%22%7D; gl5PlayerId=166540; t5SessionKey=%7B%22key%22%3A%22e0a9610f253ef9814ada%22%2C%22id%22%3A%22124%22%7D; _ga=GA1.2.1502737351.1484125044; _gat=1; t5socket=%22client588d54d17b8f4%22; village=536723453; msid=ci7d1tr76t4br93dqodgu4c3h5',
                                                    'Host': serverDomain+'.kingdoms.com',
                                                    'Origin': 'http://'+serverDomain+'.kingdoms.com',
                                                    'Pragma':'no-cache',
                                                    'Referer': 'http://'+serverDomain+'.kingdoms.com',
                                                    'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                                                },
                                                url:     'http://'+serverDomain+'.kingdoms.com/api/?c=farmList&a=createList&'+timeForGame,
                                                body:    JSON.stringify(listObj)
                                            }, function(error, response, body)
                                            {
                                                // console.log(body);
                                                // Если возникает ошибка, значит не оплачен травиан плюс
                                                // console.error('Оплати травиан плюс');
                                                listId.push(JSON.parse(body).cache[0].data.cache[0].data.listId);
                                                count++;

                                                if (listId.length == listLength){
                                                    addToFarmList();
                                                }
                                            });

                                    }

                                    function addToFarmList(){
                                        console.log(listId);


                                        asyncLoop(
                                            sortedAllGreyVillages.length,
                                            function(loop){

                                                var i = loop.iteration();
                                                if (i%100 == 0  && i!=0){
                                                    listIndex++
                                                }

                                                var villageId = sortedAllGreyVillages[i].villageId;
                                                //console.log(listIndex);

                                                var farmListPayload = {
                                                    "action":"toggleEntry",
                                                    "controller":"farmList",
                                                    "params":{
                                                        "villageId":villageId,
                                                        "listId":listId[listIndex]
                                                    },
                                                    "session": token
                                                };

                                                request
                                                    .post({
                                                        headers: {
                                                            'content-type' : 'application/x-www-form-urlencoded',
                                                            'Cookie' : 't5mu=YBnM550V5tEbE9UM; gl5SessionKey=%7B%22key%22%3A%221a936d1acfe5bac9f4a5%22%2C%22id%22%3A%22166540%22%7D; gl5PlayerId=166540; t5SessionKey=%7B%22key%22%3A%22e0a9610f253ef9814ada%22%2C%22id%22%3A%22124%22%7D; _ga=GA1.2.1502737351.1484125044; _gat=1; t5socket=%22client588d54d17b8f4%22; village=536723453; msid=ci7d1tr76t4br93dqodgu4c3h5',
                                                            'Host': serverDomain+'.kingdoms.com',
                                                            'Origin': 'http://'+serverDomain+'.kingdoms.com',
                                                            'Pragma':'no-cache',
                                                            'Referer': 'http://'+serverDomain+'.kingdoms.com',
                                                            'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                                                        },
                                                        url:     'http://'+serverDomain+'.kingdoms.com/api/?c=farmList&a=moveEntry&'+timeForGame,
                                                        body:    JSON.stringify(farmListPayload)
                                                    }, function(error, response, body) {

                                                        var rand = fixedTimeGenerator(6) + randomTimeGenerator(3);
                                                        setTimeout(function(){
                                                            console.log('Рандомное время ' + i + ': ' + rand);
                                                            loop.next();
                                                        }, rand);
                                                    });
                                            },
                                            function(){console.log('cycle ended')}
                                        )
                                        //TODO: доделать таймаут

                                    }

                                });
                            //console.log(toJson.response.alliances);
                            //console.log(JSON.stringify(toJson.response.gameworld));
                        }
                    )
            }
        )
}


let troops = {
    "controller": "troops",
    "action": "send",
    "params": {
        "catapultTargets": [99],
        "destVillageId": "537247789",
        "villageId": 537346086,
        "movementType": 3,
        "redeployHero": false,
        "units": {
            "1": 340,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 10,
            "9": 0,
            "10": 0,
            "11": 0
        },
        "spyMission": "resources"
    },
    "session": token
};
let listPayload = {
    Wahlberg:  {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[1929],"villageId":536920052},"session":"596ac03e8e8a1699301a"},
    Wahlberg2: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[1929],"villageId":536723453},"session":"596ac03e8e8a1699301a"},
    cheetah_1: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2184,2185,2186],"villageId":536887285},"session":"add658b5ae0f9aa35a11"},
    cheetah_2: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2185],"villageId":536887285},"session":"add658b5ae0f9aa35a11"},
    cheetah_3: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2186],"villageId":536887285},"session":"add658b5ae0f9aa35a11"}
};
let cookie = 'optimizelyEndUserId=oeu1483022429340r0.5058971660807878; zarget_user_id=1484139929928r0.5542546391271013; t5mu=4skeC5WZnVlW1hUM; desktopNotifications=%7B%22action%22%3A%22accept%22%2C%22timestamp%22%3A1484144302234%7D; optimizelySegments=%7B%227502571397%22%3A%22referral%22%2C%227527560310%22%3A%22false%22%2C%227527342140%22%3A%22true%22%2C%227504900734%22%3A%22none%22%2C%227502401695%22%3A%220%22%2C%227524975010%22%3A%220%22%2C%227535741642%22%3A%223%22%2C%227529072853%22%3A%22ru%22%7D; optimizelyBuckets=%7B%7D; gl5SessionKey=%7B%22key%22%3A%229a51521ec8a3a3151742%22%2C%22id%22%3A%221229510%22%7D; gl5PlayerId=1229510; t5SessionKey=%7B%22key%22%3A%2264084c89e9f70688cb2e%22%2C%22id%22%3A%22138%22%7D; _gat=1; _ga=GA1.2.207116386.1483022340; t5socket=%22client589a5629a6629%22; zarget_visitor_info=%7B%224251525756514A415B575C55454C5E585F565F59%22%3A245058%7D; village=536887285; msid=np1r3k0f4883j40drm03t395i1';
let apiData = {
    gameworld: null,
    players: null,
    alliances: null,
    map: null,
    fromGame: null,
    crop: null
};
let apiKey = {};
let timeForGame = 't' + Date.now();
let token = "add658b5ae0f9aa35a11";
let serverDomain = 'rux3';

//autoFarmFinder('-11', '0', 'Мертвые');
// searchEnemy('-2', '-5');


//Вынести это в файл инцирования
// autoFarmList(3600, 300, listPayload.Sobol, 'rux3', false);
// autoFarmList(1500, 300, listPayload.GreedyKs1, 'ks1-com', true);
// autoFarmList(1500, 600, listPayload.GROM, 'ks1-com', true);
// autoFarmList(3600, 1200, listPayload.Wahlberg, 'rux3', true);
autoFarmList(3600, 800, listPayload.cheetah_1, 'rux3', true);
//autoFarmList(3600, 1200, listPayload.cheetah_2, 'rux3', true);
//autoFarmList(3600, 2400, listPayload.cheetah_3, 'rux3', true);

// var repeatFn = function(){
//  getMapInfo('animal', token, serverDomain, timeForGame);
//  //getMapInfo('crop', token, serverDomain, timeForGame);
//  setTimeout(repeatFn, 600000);
// };
//
// getMapInfo('animal', token, serverDomain, timeForGame);
// // getMapInfo('crop', token, serverDomain, timeForGame);
// setTimeout(repeatFn, 600000);



/* GET home page. */
router.get('/animal2/', function (req, res, next) {

    res.render('animal', {
        title: 'Animal finder',
        gameworld: apiData.gameworld,
        players: apiData.players,
        alliances: apiData.alliances,
        map: JSON.stringify(apiData.map)
    });

});

router.get('/animal/', function (req, res, next) {

    res.json(apiData.map);

});

/* GET home page. */
router.get('/crop/', function (req, res, next) {

    res.render('crop', {
        title: 'Crop finder',
        crop: JSON.stringify(apiData.crop)
    });

});

module.exports = router;
