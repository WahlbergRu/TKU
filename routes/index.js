const express = require('express');
const router = express.Router();
const request = require('request');
const _ = require('underscore');
const rp = require('request-promise');
const colors = require('colors');

const fs = require('fs');
const fetch = require('node-fetch');
const moment = require('moment');

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

//user data
const userDate = require('./../config.json');

const debug = 1;
// debug - 1, идут только необходимые логи, которые показывают процессы запуска.
// debug - 2, идут логи из основных функций
// debug - 3, идут полные логи

/** Генераторы времени
 * @param seconds
 * @returns {Number}
 */
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

/**
 * Проставляет заголовки из конфига, требуется для защиты
 * @param serverDomain
 * @param cookie
 * @returns {{content-type: string, Cookie: *, Host: string, Origin: string, Pragma: string, Referer: string, User-Agent: string}}
 */
function setHttpHeaders(serverDomain, cookie, contentLength) {

  return {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json;charset=UTF-8',
    'Content-Length': contentLength,
    'Cookie': cookie,
    'Host': serverDomain + '.kingdoms.com',
    'Origin': 'https://' + serverDomain + '.kingdoms.com',
    'Pragma': 'no-cache',
    'Referer': 'https://' + serverDomain + '.kingdoms.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
  }
}

/**
 * Для асинх операций
 * @param ms
 * @returns {Promise<any>}
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * http request для травиан кингдомса, возвращает колбек ответа
 * @param opt
 */
function httpRequest(opt) {
  let timeForGame = 't' + Date.now();


  //TODO: разобраться с тем нужно ли body или как
  let options = {
    headers: setHttpHeaders(opt.serverDomain, opt.cookie || cookie, JSON.stringify(opt.body).length),
    method: opt.method || 'POST',
    uri: `http://${opt.serverDomain}.kingdoms.com/api/?c=${opt.body.controller}&a=${opt.body.action}&${timeForGame}`,
    body: opt.body,
    json: true, // Automatically stringifies the body to JSON,
  };

  // console.log(options)

  //RP - request promise, return deffered object.


  // console.log(JSON.stringify(options));

  return rp(options)
    .then(
      (data) => data,
      (error) => {
        console.log('Ошибка в HTTPRequest')
        console.log(error.debug)
        console.log(error)
        console.log(opt)
      }
    )
    .catch((error) => {
      console.log('Ошибка в HTTPRequest')
      console.log(error.debug)
      console.log(error)
      console.log(opt)
    });
}

//fixedTime - фиксированное время
//randomTime - разброс

/**
 * для асинх-авейт
 * @param opt
 * @returns {Promise<*>}
 */
async function httpRequestAsync(opt){
    let timeForGame = 't' + Date.now();


    //TODO: разобраться с тем нужно ли body или как
    let options = {
        headers: setHttpHeaders(opt.serverDomain, opt.cookie || cookie, JSON.stringify(opt.body).length),
        method: opt.method || 'GET',
        body: JSON.stringify(opt.body)
    };

    return fetch(
        `https://${opt.serverDomain}.kingdoms.com/api/?c=${opt.body.controller}&a=${opt.body.action}&${timeForGame}`,
        options
    ).then((response) => {
        return response.json();
    });
}


function autoExtendLists(playerFarmList, filter, coor) {

  //TODO: выпилить хардкод координат
  let xCor = coor.x,
    yCor = coor.y;

  let bodyFL = {
    "controller": "cache",
    "action": "get",
    "params": {
      "names": []
    },
    "session": playerFarmList.session
  };

  playerFarmList.params.listIds.forEach((item) => {
    bodyFL.params.names.push(`Collection:FarmListEntry:${item}`)
  });

  let optionsFL = {
    method: 'POST',
    json: true,
    body: bodyFL,
    serverDomain: serverDomain
  };


  httpRequest(optionsFL)
    .then(
      (farmListEntry) => {
        console.log(playerFarmList.session)
        console.log(farmListEntry)
        asyncLoop(
          farmListEntry.cache && farmListEntry.cache.length || 0,
          (loop)  => {
            let i = loop.iteration();
            asyncLoop(
              farmListEntry.cache[i].data.cache.length,
              (loopCollection) => {
                let j = loopCollection.iteration();
                let sumTroops = 0;

                for (let unit in farmListEntry.cache[i].data.cache[j].data.units) {
                  sumTroops += parseInt(farmListEntry.cache[i].data.cache[j].data.units[unit]);
                }

                if (!sumTroops) {

                  let toggleBody = {
                    "controller": "farmList",
                    "action": "toggleEntry",
                    "params": {
                      "villageId": farmListEntry.cache[i].data.cache[j].data.villageId,
                      "listId": farmListEntry.cache[i].name.split(':')[2]
                    },
                    "session": playerFarmList.session
                  };

                  let options = {
                    method: 'POST',
                    json: true,
                    body: toggleBody,
                    serverDomain: serverDomain
                  };

                  httpRequest(options)
                    .then(
                      (body) => {
                        let rand = fixedTimeGenerator(6) + randomTimeGenerator(3);
                        setTimeout(() => {
                          loopCollection.next();
                        }, rand);
                      },
                      (error) => {
                        console.log('toggleEntry');
                        console.log(error);
                      }
                    )
                    .catch((error) => {
                      console.log(error)
                    })
                } else {
                  loopCollection.next();
                }
              },
              () => {
                console.log('Отчищение из фармлиста закончено')
                loop.next();
              }
            );
          },
          () => {
            console.log(`Все фармлисты отчищены ${playerFarmList.session}`);
            // autoFarmList(fixedTime, randomTime, playerFarmList, server, true);
            return httpRequest(optionsFL)
              .then(
                (farmListEntry) => {
                  if (farmListEntry && farmListEntry.error) {
                    console.log(farmListEntry.error.message);
                    return false;
                  }
                  let villagesFromLists = [];

                  farmListEntry.cache.forEach((collection) => {
                    collection.data.cache.forEach((farmListEntryId) => {
                      villagesFromLists.push(farmListEntryId.data);
                    })
                  });

                  searchEnemy((villages) => {
                    let listLength = Math.ceil(villages.length / 100);
                    let listMassive = [];

                    // let diff = _.difference(_.pluck(villages, "villageId"), _.pluck(villagesFromLists, "villageId"));
                    // let diffCapturingVillageInList = _.difference(_.pluck(villagesFromLists, "villageId"), _.pluck(villages, "villageId"));
                    // let capturingVillageInList = _.filter(villages, (obj) => { return diffCapturingVillageInList.indexOf(obj.villageId) >= 0; });

                    // //TODO: добавить авто удаление с помощью второго прогона диф списков.
                    // console.log(capturingVillageInList);
                    // console.log(capturingVillageInList.length);

                    //TODO: ЗАТЕСТИТЬ
                    // capturingVillageInList.forEach(item =>{
                    //
                    //     let farmListEntryId;
                    //
                    //     villagesFromLists.forEach(village=>{
                    //         if (village.villageId == item.villageId){
                    //             farmListEntryId = village.indexOf(item.villageId);
                    //         }
                    //     });
                    //
                    //     if (!farmListEntryId){
                    //         console.log(`${item.villageId} деревня не найдена`.error);
                    //     } else {
                    //         let toggleBody = {
                    //             "controller":"farmList",
                    //             "action":"toggleEntry",
                    //             "params":{
                    //                 "villageId":item.villageId,
                    //                 "listId":   farmListEntryId
                    //             },
                    //             "session":listPayload.session
                    //         };
                    //
                    //         let options = {
                    //             method: 'POST',
                    //             headers: {
                    //                 'content-type' : 'application/json;charset=UTF-8'
                    //             },
                    //             json: true,
                    //             body: toggleBody,
                    //             serverDomain: serverDomain
                    //         };
                    //
                    //         console.log(toggleBody)
                    //
                    //
                    //         httpRequest(options)
                    //             .then(
                    //                 (body) => {
                    //                     console.log(body);
                    //                 },
                    //                 (error) => {
                    //                     console.log(error);
                    //                 }
                    //             )
                    //     }
                    // });

                    let grayIteration = 0;
                    let lengthOfFL = 0;

                    let diff = _.difference(_.pluck(villages, "villageId"), _.pluck(villagesFromLists, "villageId"));
                    let grayDiffVillage = _.filter(villages, (village) => {
                      return diff.indexOf(village.villageId) >= 0;
                    });

                    console.log(villages.length)
                    
                    //TODO: улушчить эту часть
                    asyncLoop(
                      farmListEntry.cache.length,
                      (loop) => {
                        let i = loop.iteration();
                        asyncLoop(
                          grayDiffVillage.length,
                          (loopCollection) => {
                            let j = loopCollection.iteration();

                            console.log(farmListEntry.cache[i].data.cache.length);
                            // console.log(grayDiffVillage.length);

                            if (farmListEntry.cache[i].data.cache.length + lengthOfFL < 100 && grayDiffVillage[grayIteration]) {
                              
                              let bodyReq = {
                                "action": "toggleEntry",
                                "controller": "farmList",
                                "params": {
                                  "villageId": grayDiffVillage[grayIteration].villageId,
                                  "listId": farmListEntry.cache[i].name.split(':')[2]
                                },
                                "session": playerFarmList.session
                              };

                              let options = {
                                method: 'POST',
                                headers: {
                                  'content-type': 'application/json;charset=UTF-8'
                                },
                                serverDomain: serverDomain,
                                json: true,
                                body: bodyReq
                              };

                              httpRequest(options)
                                .then(
                                  (body) => {
                                    let rand = fixedTimeGenerator(6) + randomTimeGenerator(3);
                                    setTimeout(() => {
                                      // console.log('Рандомное время ' + i + ': ' + rand);
                                      grayIteration++;
                                      lengthOfFL++;
                                      loopCollection.next();
                                    }, rand);
                                  },
                                  (error) => {
                                    grayIteration++;
                                    lengthOfFL++;
                                    loopCollection.next();
                                  }
                                );

                            }
                            else if (farmListEntry.cache[i].data.cache.length + lengthOfFL >= 100) {
                              console.log('Добавление в фармлист закончен');
                              lengthOfFL = 0;
                              loop.next();
                            }
                            else {
                              lengthOfFL = 0;
                              loop.next();
                            }
                          },
                          () => {
                            console.log('Добавление в фармлист закончен')
                          }
                        )
                      },
                      () => {
                        console.log(`Все фармлисты заполнены ${playerFarmList.session}`);

                        // autoFarmList(fixedTime, randomTime, playerFarmList, server, true);
                      }
                    );

                    // let sortedAllGreyVillages
                  }, xCor, yCor, filter)
                }
              )
              .catch((error) => {
                console.log(error)
              });
          }
        );

      },
      (err) => {
        console.error('Произошла ошибка autoExtendLists');
        console.log(err);
      }
    )
    .catch((error) => {
      console.log(error)
    })
}


function checkOnStatus(farmListsResponse, listPayload, now, fn, serverDomain) {
  asyncLoop(
    farmListsResponse.cache.length,
    (loopList) => {
      let i = loopList.iteration();
      let FarmListEntry = farmListsResponse.cache[i].name.split(":")[2];
      // //console.log(`Подан фармлист с Айди ${FarmListEntry}`.info);

      // console.log(FarmListEntry)
      asyncLoop(
        farmListsResponse.cache[i].data.cache.length,
        (loop) => {

          let j = loop.iteration();

          let villageLog = farmListsResponse.cache[i].data.cache[j];

          // console.log(`Чек этого  ${JSON.stringify(villageLog).green}`);


          if (!villageLog || !villageLog.data || !villageLog.data.lastReport) {
            //console.log(`Чек этого  ${JSON.stringify(villageLog.data).green}`);
            loop.next();
          } else if (villageLog.data.lastReport.notificationType == 1) {

            let toggleBody = {
              "controller": "reports",
              "action": "getLastReports",
              "params": {
                "collection": "search",
                "start": 0,
                "count": 10,
                "filters": ["124", {"villageId": villageLog.data.villageId}],
                "alsoGetTotalNumber": true
              },
              "session": listPayload.session
            };

            let options = {
              method: 'POST',
              headers: {
                'content-type': 'application/json;charset=UTF-8'
              },
              json: true,
              body: toggleBody,
              serverDomain: serverDomain,
            };

            httpRequest(options)
              .then(
                (body) => {

                  let capacity = 0, bounty = 0;

                  if (body.errors) {
                    console.log(body)
                  }

                  // console.log(body.response)
                  if (body && body.response && body.response.reports){

                    body.response.reports.forEach((item, index, array) => {
                      bounty += item.bounty;
                      capacity += item.capacity;
                    });

                    let rel = bounty / capacity;

                    if (rel >= 1) {

                      for (let unitKey in villageLog.data.units) {
                        let unit = villageLog.data.units[unitKey];
                        if (unit == 0) {
                          //nothing?
                        } else if (unit < 30) {
                          villageLog.data.units[unitKey] = parseInt(villageLog.data.units[unitKey]) + 1;
                        } else {
                          //nothing?
                        }
                      }

                      let unitBody = {
                        "controller": "farmList",
                        "action": "editTroops",
                        "params": {
                          "entryIds": [parseInt(villageLog.data.entryId)],
                          "units": villageLog.data.units
                        },
                        "session": listPayload.session
                      };

                      let changeUnitOption = {
                        method: 'POST',
                        json: true,
                        body: unitBody,
                        serverDomain: serverDomain
                      };


                      httpRequest(changeUnitOption).then(
                        resolve => {
                          // console.log('Кол-во войнов увеличено'.info);
                          loop.next();
                        },
                        reject => {
                          // console.log(JSON.stringify(reject).warn);
                          loop.next();
                        }
                      )
                    } else if (rel < 0.5) {

                      for (let unitKey in villageLog.data.units) {
                        let unit = villageLog.data.units[unitKey];
                        if (unit > 1) {
                          villageLog.data.units[unitKey]--;
                        }
                      }

                      let unitBody = {
                        "controller": "farmList",
                        "action": "editTroops",
                        "params": {
                          "entryIds": [parseInt(villageLog.data.entryId)],
                          "units": villageLog.data.units
                        },
                        "session": listPayload.session
                      };

                      let changeUnitOption = {
                        method: 'POST',
                        json: true,
                        body: unitBody,
                        serverDomain: serverDomain
                      };

                      httpRequest(changeUnitOption).then(
                        resolve => {
                          // console.log('Кол-во войнов уменьшено'.info);
                          loop.next();
                        },
                        reject => {
                          // console.log(JSON.stringify(reject).warn);
                          loop.next();
                        }
                      )
                      .catch((error) => {
                        console.log(error)
                      })
                      //    Добавить уменьшение войнов
                    } else {
                      //nothing now
                      loop.next();
                    }
                  } else {
                    loop.next();
                  }

                },
                (error) => {
                  //console.log(error);
                }
              )
              .catch((error) => {
                console.log(error)
              })

          } else if (villageLog.data.lastReport.notificationType == 2) {
            if (debug === 2 || debug === 3) {
              //console.log('yellow log')
            }
            let toggleBody = {
              "controller": "farmList",
              "action": "toggleEntry",
              "params": {
                "villageId": villageLog.data.villageId,
                "listId": FarmListEntry
              },
              "session": listPayload.session
            };

            let options = {
              method: 'POST',
              headers: {
                'content-type': 'application/json;charset=UTF-8'
              },
              json: true,
              body: toggleBody,
              serverDomain: serverDomain
            };

            //console.log(options.info)


            httpRequest(options)
              .then(
                (body) => {
                  //console.log(body);
                  return httpRequest(options);
                },
                (error) => {
                  //console.log(error);
                }
              )
              .then(
                (body) => {
                  //console.log(body);
                  if (debug === 3) {
                    console.log(body);
                  }
                  // console.log('Жёлтый лог обработан.'.silly)
                  loop.next();
                },
                (error) => {
                  console.log(error);
                }
              )
              .catch((error) => {
                console.log(error)
              })
          } else if (villageLog.data.lastReport.notificationType == 3) {
            if (debug === 2 || debug === 3) {
              console.log('red log'.debug)
            };
            //TODO: вынести в отдельную функцию
            let toggleBody = {
              "controller": "farmList",
              "action": "toggleEntry",
              "params": {
                "villageId": villageLog.data.villageId,
                "listId": FarmListEntry
              },
              "session": listPayload.session
            };

            let options = {
              method: 'POST',
              headers: {
                'content-type': 'application/json;charset=UTF-8'
              },
              json: true,
              body: toggleBody,
              serverDomain: serverDomain
            };

            console.log(options.info)


            httpRequest(options)
              .then(
                (body) => {
                  // console.log(body);
                  return httpRequest(options);
                },
                (error) => {
                  console.log(error);
                }
              )
              .then(
                (body) => {
                  // console.log(body);
                  if (debug === 3) {
                    // console.log(body);
                  }
                  console.log('Красный лог обработан.'.silly)
                  loop.next();
                },
                (error) => {
                  console.log(error);
                }
              )
          } else {
            console.log(`Странный лог ${villageLog.lastReport.notificationType}`);
          }
        },
        () => {
          loopList.next();
        }
      );

    },
    () => {
      let now = new Date();
      console.log('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session + '] запуск: [' + now.toString() + ']');
      fn(listPayload);
    }
  )
}

/**
 * Требуется рефакторинг и доработка
 * Фармлисты
 * @param fixedTime - основное время через которое должно повторяться
 * @param randomTime - случайный разброс, что бы не спалили
 * @param listPayload - запрос который шлётся из ПСа, требуется ТК+
 * @param serverDomain - домен сервера, требуется рефакторинг и вынос этого гавна
 * @param init - инцилизировать сразу, или запустить через fixedTime+randomTime
 */
function autoFarmList(fixedTime, randomTime, listPayload, serverDomain, init, optionsParams) {

  let workTime = 0;

  console.info('Фарм лист listIds[' + listPayload.params.listIds + '], ' +
    'villageId[' + listPayload.params.villageId + '], ' +
    'session[' + listPayload.session +'] начат');

  let startFarmListRaid = (listPayload) => {
    //console.log(listPayload);

    let options = {
      serverDomain: serverDomain,
      body: listPayload
    };

    return httpRequest(options).then(
      (body) => {

        if (body && body.response && body.response.errors){
          /**
           * Возможные баги
           * 1) деревня перенесена
           * 2) список удалён
           * 3) отправлено больше 1000
           * 4) отпуск у чела
           */
          console.log('ОШИБКА'.error);
          // console.log(options.body);
          console.log(body.response.errors);
        }

      },
      (err) => {
        //console.error('Произошла ошибка');
        //console.log(err);
        //console.info('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] отправлен');

      }
    )
    .catch((error) => {
      console.log(error)
    });

  };

  let checkList = (listPayload, optionsParams) => {
    // console.log('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] проверка');

    function start() {


      let now = new Date();
      let rand = fixedTimeGenerator(fixedTime) + randomTimeGenerator(randomTime);

      //console.log(now+rand);

      let tempTime = now.valueOf() + rand;
      let dateNext = new Date(tempTime);
      //запуск сразу
      if (init) {

        if (debug === 2 || debug === 3) {
          //console.log(listPayload)
        }

        let checkBodyObj = {
          "controller": "cache",
          "action": "get",
          "params": {
            names: []
          },
          "session": listPayload.session
        };


        // console.log(listPayload.params.listIds);
        for (let i = 0; i < listPayload.params.listIds.length; i++) {
          let list = listPayload.params.listIds[i];
          checkBodyObj.params.names.push("Collection:FarmListEntry:" + list);
        };

        let options = {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=UTF-8'
          },
          json: true,
          body: checkBodyObj,
          serverDomain: serverDomain
        };

        //console.log('Сформировали массив фарм листов');

        httpRequest(options)
          .then(
            (body) => {
              // console.log(listPayload);
              if (!body.cache) {
                // console.log(body);
              } else {
                //TODO: add callback on checkOnStatus
                // callback(body);

                if (optionsParams.checkList === true){
                  checkOnStatus(body, listPayload, now, startFarmListRaid.bind(null, listPayload), serverDomain);
                } else {
                  startFarmListRaid(listPayload);
                }

                workTime += rand;

                console.log(workTime);

                if (workTime > 3600 * 1000 * 8) {
                  let stopTime = 10 * rand;
                  console.log(`Остановочка ${stopTime}`);
                  setTimeout(() => {
                    // console.log(rand);
                    start();
                  }, stopTime);
                  workTime = 0;
                } else {
                  setTimeout(() => {
                    // console.log(rand);
                    start();
                  }, rand);
                }



              }

            },
            (error) => {
              console.log(error);
            }
          )
          .catch((error) => {
            console.log(error)
          })
      }

      init = true;
      

    };

    start();

    console.log('Фарм лист listIds[' + listPayload.params.listIds + '], ' +
      'villageId[' + listPayload.params.villageId + '], ' +
      'session[' + listPayload.session + '] ' );
  };

  checkList(listPayload, optionsParams);
};

/**
 * Получаем опенапи токен
 * @param callback
 */
function getToken(callback) {
  let options = {
    method: 'GET',
    uri: `http://${serverDomain}.kingdoms.com/api/external.php?action=requestApiKey&email=allin.nikita@yandex.ru&siteName=borsch&siteUrl=http://borsch-label.com&public=true`,
    json: true // Automatically stringifies the body to JSON
  };

  rp(options).then(
    (body) => {
      //console.log('Токен ' + body.response.privateApiKey);
      callback(body);
    },
    (error) => {
      //console.log(error);
    }
  )
}

/**
 * Получение карты
 * @param callback
 */
function getMap(callback) {
  getToken(
    (token) => {
      let options = {
        method: 'GET',
        headers: {
          'content-type': 'application/json;charset=UTF-8'
        },
        uri: `http://${serverDomain}.kingdoms.com/api/external.php?action=getMapData&privateApiKey=${token.response.privateApiKey}`,
        json: true // Automatically stringifies the body to JSON
      };

      //TODO: ТУТ ОСТАНОВИЛСЯ

      rp(options)
        .then(
          (body) => {


            const file = `./json/getMap/data${+Date.now()}.json` ;

            fs.writeFile(file, `${JSON.stringify(body)}`, function (err) {
              if(err) {
                return console.log(err);
              }
            });

            callback(body);
          },
          (error) => {
            //console.log(error);
          }
        )
    }
  );
  // token = await getToken().response.privateApiKey;
  //
}

/**
 * Получние информации о юзерах
 * @param callback
 */
function getPlayers(callback) {
  getMap((body) => {
    // console.log(body);

    let players = _.pluck(body.response.players, 'playerId');

    let divineI = 1000;
    let playersRequestLength = parseInt(players.length/divineI);
    let payloadArray = [];
    // console.log(players.length);

    for (let i = 0; i <= playersRequestLength; i++) {

      let playersBody = [];

      for (let j = 0; j < divineI; j++) {
        playersBody[j] = 'Player:' + players[i*divineI+j];
      }

      let payload = {
        controller: "cache",
        action: "get",
        params: {names: playersBody},
        session: token
      };

      let options = {
        method: 'POST',
        headers: {
          'content-type': 'application/json;charset=UTF-8',
          'Accept':'application/json, text/plain, */*',
          'Accept-Encoding':'gzip, deflate',
          'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4'
        },
        json: true,
        body: payload,
        serverDomain: serverDomain
      };


      payloadArray.push(options);
    }
    console.log('Сформировали массив игроков');

    let bodyAll = [];

    asyncLoop(
      payloadArray.length,
      (loop)=>{
        let i = loop.iteration();
        httpRequest(payloadArray[i]).then(
          (body) => {
            console.log(body);
            bodyAll.push(body);
            loop.next();
          },
          (error) => {
            console.log(error);
            loop.next();
          }
        )
        .catch((error) => {
          console.log(error)
        })
      },
      ()=>{
        let unionCache = {
          cache: []
        };

        console.log(bodyAll)

        for (let i = 0; i < bodyAll.length; i++) {
          unionCache.cache = [...unionCache.cache, ...bodyAll[i].cache];
        }
        

        callback(unionCache);
      }
    );

  })
}

/**
 * Получаем карту по условиям.
 * Скрипт требует переработки, ибо код гавно, которому 1.5 года
 * @param type
 * @param token
 * @param serverDomain
 * @param timeForGame
 */
function getMapInfo(type, token, serverDomain, timeForGame, ownerId) {
  type = type || 'animal';
  request
    .get({
      headers: {'content-type': 'application/json;charset=UTF-8'},
      url: 'http://' + serverDomain + '.kingdoms.com/api/external.php?action=requestApiKey&email=allin.nikita@yandex.ru&siteName=borsch&siteUrl=http://borsch-label.com&public=true'
    }, (error, response, body) => {

      apiKey = JSON.parse(body);
      // console.log('Получили токен');
      // console.log(apiKey);

      request
        .get({
          headers: {'content-type': 'application/json;charset=UTF-8'},
          url: 'http://' + serverDomain + '.kingdoms.com/api/external.php?action=getMapData&privateApiKey=' + apiKey.response.privateApiKey
        },  (error, response, body) => {
          //TODO: холишит блять
          //Переделай, стыдно же людям такое показывать. 
          console.log('получили данные с опенапи')
          if (!body){
            console.log(`Проиозшла ошибка с получением данных: ${body}`);
            return false;
          }

          apiData = JSON.parse(body);
          // console.log(JSON.parse(body));

          function oasis() {

            let oasisArr = [];
            let oasisObj = apiData.response.map.cells;
            let j = 0;
            for (let i = 0; i < oasisObj.length; i++) {
              if (oasisObj[i].oasis != 0) {
                oasisArr[j] = 'MapDetails:' + oasisObj[i].id;
                j++;
              }
            }

            // console.log(apiData.response.map);

            console.log('Сформировали массив');

            let session = {"controller": "cache", "action": "get", "params": {"names": oasisArr}, "session": token};

            request
              .post({
                headers: {
                  'Content-Type': 'application/json'
                },
                url: 'http://' + serverDomain + '.kingdoms.com/api/?c=cache&a=get&' + timeForGame,
                body: JSON.stringify(session)
              },  (error, response, body) => {
                console.log(body);
                let jsonBody = JSON.parse(body);

                let map = [];
                let defenseTable = [
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
                let l = 0;



                for (let m = 0; m < jsonBody.cache.length; m++) {
                  for (let k = 0; k < apiData.response.map.cells.length; k++) {

                    // console.log(jsonBody.cache[m].data);
                    if (apiData.response.map.cells[k].id == jsonBody.cache[m].data.troops.villageId) {

                      let avgMaxDpsInfantry = 0;
                      let avgAllDpsInfantry = 0;
                      let avgMaxDpsMounted = 0;
                      let avgAllDpsMounted = 0;
                      let troopsCounter = 0;
                      let minTroopsCounter = 1000000;
                      let toIntUnits = 0;
                      let counterAnimalType = 0;

                      for (let counterUnits in jsonBody.cache[m].data.troops.units) {
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
                        x: apiData.response.map.cells[k].x,
                        y: apiData.response.map.cells[k].y,
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
                //console.log(apiData.map.cells);
                console.log('Создали объект');

              });
          }

          function crop(map) {

            let cropArray = [];

            // console.log(map);

            // console.log(map.length);

            // obj.path = Math.sqrt(Math.pow((obj.x-custom.x),2) + Math.pow((obj.y-custom.y), 2));
            // obj.path = obj.path.toFixed(3);
            // if(obj.path.length==5){obj.path='0'+obj.path}
            // cropArray.push(obj);

            asyncLoop(
              map.length,
               (loop) => {

                let i = loop.iteration();

                let obj = map[i];

                if (obj.resType == '3339' && obj.oasis == 0 && obj.kingdomId == 0) {

                  //9ka добавлена
                  console.log('9ka')

                  //TODO: owner ID make is variable
                  let listObj = {
                    "controller": "map",
                    "action": "editMapMarkers",
                    "params": {
                      "markers": [
                        {
                          "owner": 1,
                          "type": 3,
                          "color": 3,
                          "editType": 3,
                          "ownerId": ownerId,
                          "targetId": obj.id
                        }
                      ],
                      "fieldMessage": {
                        "text": "",
                        "type": 5,
                        "duration": 12,
                        "cellId": obj.id,
                        "targetId": ownerId
                      }
                    },
                    "session": token
                  };

                  let options = {
                    method: 'POST',
                    headers: {
                      'content-type': 'application/json;charset=UTF-8'
                    },
                    serverDomain: serverDomain,
                    json: true,
                    body: listObj
                  };

                  httpRequest(options)
                    .then(
                       (body) => {
                         console.log(body)
                        setTimeout(loop.next, 10);
                      },
                       (error) => {
                        console.log(error)
                      }
                    )
                    .catch((error) => {
                      console.log(error)
                    });

                } else if (obj.resType == '11115' && obj.oasis == 0 && obj.kingdomId == 0) {

                  console.log('15ka')

                  //15ka добавлена
                  let listObj = {
                    "controller": "map",
                    "action": "editMapMarkers",
                    "params": {
                      "markers": [
                        {
                          "owner": 1,
                          "type": 3,
                          "color": 10,
                          "editType": 3,
                          "ownerId": ownerId,
                          "targetId": obj.id
                        }
                      ],
                      "fieldMessage": {
                        "text": "",
                        "type": 5,
                        "duration": 12,
                        "cellId": obj.id,
                        "targetId": ownerId
                      }
                    },
                    "session": token
                  };

                  let options = {
                    method: 'POST',
                    headers: {
                      'content-type': 'application/json;charset=UTF-8'
                    },
                    serverDomain: serverDomain,
                    json: true,
                    body: listObj
                  };

                  httpRequest(options)
                    .then(
                       (body) => {
                        console.log(body);
                        setTimeout(loop.next, 10);
                      },
                       (error) => {
                        console.log(error)
                      }
                    )
                    .catch((error) => {
                      console.log(error)
                    });

                } else {
                  loop.next();
                }

              },
               () => {
                console.log('Добавление точек заверешено :)')
              }
            );


          }

          switch (type) {
            case 'animal':
              oasis();
              break;
            case 'crop':
              crop(apiData.response.map.cells);
              break;
          }
        });
    });
};

/**
 * Rome
 * 1 - Legioner
 * 2 - Pretorian
 * 3 - Imperian
 * 4 - Scouts
 * 5 - Imperator
 * 6 - Ceserian
 *
 * Germany
 * 11 - Clubswinger
 * 12 - Spearfighter
 * 13 - Axefighter
 * 14 - Scout
 * 15 - Paladin
 * 16 - Teutonic knight
 *
 * Gauls
 * 21 - Phalanx
 * 22 - Swordsman
 * 23 - Scout
 * 24 - Thunder T
 * 25 - Druids
 * 26 - Eduins
 */


//TODO: rewrite to cred
function autoUnitsBuild(villageId, unitsBarack, unitsStable, fixedTime, randomTime, session) {
  let rand = fixedTimeGenerator(fixedTime) + randomTimeGenerator(randomTime);

  let getAllOptions = {
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8'
    },
    json: true,
    body: {"controller": "player", "action": "getAll", "params": {deviceDimension: "1920:1080"}, "session": session},
    serverDomain: serverDomain
  };

  httpRequest(getAllOptions)
    .then(
      (body) => {
        let location = {};
        body.cache.forEach((item, i, arr) => {
          if (item.name === `Collection:Building:${villageId}`) {
            item.data.cache.forEach( (building, i, arr) => {
              //Конюшня
              if (building.data.buildingType == "20") {
                location.stable = building.data.locationId;
              }
              //Казарма
              if (building.data.buildingType == "19") {
                location.barack = building.data.locationId;
              }
            })
          }
        });

        let barackOptions = {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=UTF-8'
          },
          json: true,
          body: {
            "controller": "building",
            "action": "recruitUnits",
            "params": {"villageId": villageId, "locationId": location.barack, "buildingType": 19, "units": unitsBarack},
            "session": session
          },
          serverDomain: serverDomain
        };

        let stableOptions = {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=UTF-8'
          },
          json: true,
          body: {
            "controller": "building",
            "action": "recruitUnits",
            "params": {"villageId": villageId, "locationId": location.stable, "buildingType": 20, "units": unitsStable},
            "session": session
          },
          serverDomain: serverDomain
        };

        function build() {
          if (location.barack) {
            httpRequest(barackOptions)
              .then(
                (body) => {
                  if (body.response && body.response.errors) {
                    console.log(body.response.errors)
                  } else {
                    console.log(`Бараки успешно загружены`)
                  }
                },
                (error) => {
                  console.log(error);
                }
              );
          }

          if (location.stable) {
            httpRequest(stableOptions)
              .then(
                (body) => {
                  if (body.response && body.response.errors) {
                    console.log(body.response.errors)
                  } else {
                    console.log(`Конюшни успешно загружены`)
                  }

                },
                (error) => {
                  console.log(error);
                }
              );
          }
        }

        build();
        setInterval(build, rand);
      },
      (error) => {
        console.log(error);
      }
    )
    .catch((error) => {
      console.log(error)
    });
}

/**
 * Асинх луп, служит для итераций после колбека. Важно для эмуляции действий пользователя - так как есть возможность добавить 400 деревней за 2 секунду, но это немного палевно
 * @param iterations
 * @param func
 * @param callback
 * @returns {{next: loop.next, iteration: loop.iteration, break: loop.break}}
 */
function asyncLoop(iterations, func, callback) {
  let index = 0;
  let done = false;
  let loop = {
    next:  () => {
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

    iteration:  () => {
      return index - 1;
    },

    break:  () => {
      done = true;
      callback();
    }
  };
  loop.next();
  return loop;
}

/**
 * Функция для добавление в фарм лист. Передаём массив ID с листами и список деревень
 * @param listMassive
 * @param villages
 */
function addToFarmList(listMassive, villages) {
  if (debug === 3) {
    console.log(listMassive);
    console.log(villages);
  }

  let listIndex = 0;

  asyncLoop(
    villages.length,
     (loop) => {

      let i = loop.iteration();
      if (i % 100 == 0 && i != 0) {
        listIndex++
      }

      let villageId = villages[i].villageId;
      // console.log(listIndex);
      // console.log(listMassive[listIndex]);

      let bodyReq = {
        "action": "toggleEntry",
        "controller": "farmList",
        "params": {
          "villageId": villageId,
          "listId": listMassive[listIndex]
        },
        "session": token
      };

      let options = {
        method: 'POST',
        headers: {
          'content-type': 'application/json;charset=UTF-8'
        },
        serverDomain: serverDomain,
        json: true,
        body: bodyReq
      };

      httpRequest(options)
        .then(
           (body) => {
            // console.log(body);
            let rand = fixedTimeGenerator(6) + randomTimeGenerator(3);
            setTimeout( () => {
              // console.log('Рандомное время ' + i + ': ' + rand);
              loop.next();
            }, rand);
          },
           () => {

          }
        )
        .catch((error) => {
          console.log(error)
        });
    },
     () => {
      // console.log('cycle addToFarmList ended')
    }
  )

}


/**
 * Находит деревни согласно заданным условиям.
 * Есть настроенные фильтры -
 *      deathsFilter - является фильтром для мертвяков
 *      withoutKingdomsFilter - фильтр для игроков без королевства
 * @param xCor
 * @param yCor
 * @param filters - IFilters {
 *      players: IPlayers,
 *      villages: IVillages
 * }
 * IPlayers {
 *      active: number {"0", "1"}
 *      filterInformation: boolean
 *      hasNoobProtection:boolean
 *      isKing: boolean
 *      kingId: number
 *      kingdomId: number
 *      kingdomRole: number
 *      kingdomTag: string
 *      kingstatus: number
 *      level: number
 *      name: string
 *      nextLevelPrestige: number
 *      playerId: number
 *      population: number
 *      prestige: number
 *      stars:{bronze: 0, silver: 0, gold: 3}
 *      tribeId: number{ "1", 2", "3" }
 * }
 *
 * IVillages{
 *      allowTributeCollection:"1" //hz
 *      belongsToKing: number
 *      belongsToKingdom: number
 *      coordinates:{x: "-6", y: "-1"}
 *      isMainVillage:boolean
 *      isTown:boolean
 *      name: string
 *      playerId:number
 *      population:number
 *      protectionGranted:"0"//hz
 *      realTributePercent:0.2 //hz, % dani mb
 *      treasures:"0" //hz
 *      treasuresUsable:"0" // hz
 *      tribeId: number {"1", "2", "3"}
 *      tributeCollectorPlayerId: number
 *      type:"2" //hz
 *      villageId: number
 * }
 */

function searchEnemy(fn, xCor, yCor, filtersParam) {
  getPlayers( (players) => {


    let allPlayers = players;
    let sortedPlayers;
    let sortedVillages;


    console.log(players);
    //Условия
    for (let filter in filtersParam.players) {
      sortedPlayers = {
        cache: []
      };

      if (filtersParam.players[filter].different === 'equal') {
        allPlayers.cache.forEach( (item, i, arr) => {
          if (item.data[filter] == filtersParam.players[filter].value) {
            sortedPlayers.cache.push(item);
          }
        });
      }


      else if (filtersParam.players[filter].different === 'notEqual') {
        allPlayers.cache.forEach( (item, i, arr) => {
          if (item.data[filter] != filtersParam.players[filter].value) {
            sortedPlayers.cache.push(item);
          }
        });
      }

      else if (filtersParam.players[filter].different === 'less') {
        allPlayers.cache.forEach( (item, i, arr) => {
          if (parseInt(item.data[filter]) <= parseInt(filtersParam.players[filter].value)) {
            sortedPlayers.cache.push(item);
          }
        });
      }

      else if (filtersParam.players[filter].different === 'more') {
        allPlayers.cache.forEach( (item, i, arr) => {
          if (parseInt(item.data[filter]) > parseInt(filtersParam.players[filter].value)) {
            //     console.log(`
            //     item.data[filter]: ${item.data[filter]}
            //     filtersParam.players[filter].value: ${filtersParam.players[filter].value}
            //     boolean: ${item.data[filter] > filtersParam.players[filter].value}
            // `);
            sortedPlayers.cache.push(item);
          }
        });
      }
      else if (filtersParam.players[filter].different === 'between') {
        allPlayers.cache.forEach( (item, i, arr) => {
          if (
            parseInt(item.data[filter]) > parseInt(filtersParam.players[filter].valueBottom) &&
            parseInt(item.data[filter]) <= parseInt(filtersParam.players[filter].valueTop)
          ) {
            //     console.log(`
            //     item.data[filter]: ${item.data[filter]}
            //     filtersParam.players[filter].value: ${filtersParam.players[filter].value}
            //     boolean: ${item.data[filter] > filtersParam.players[filter].value}
            // `);
            sortedPlayers.cache.push(item);
          }
        });
      }

      allPlayers = Object.assign({}, sortedPlayers);
    }

    // console.log(allPlayers);

    sortedPlayers = allPlayers;

    if (debug === 2) {
      console.log("Подготовили список игроков подходящим условиям")
    }

    let hackPlayer = {
      cache: [
        {
          data: {
            villages: []
          }
        }
      ]
    }

    //TODO: проверить мультифильтры
    for (let filter in filtersParam.villages) {

      sortedVillages = {
        cache: []
      };

      if (filtersParam.villages[filter].different === 'equal') {
        sortedPlayers.cache.forEach( (item, i, arr) => {
          for (let j = 0; j < item.data.villages.length; j++) {
            let obj = item.data.villages[j];
            if (obj[filter] == filtersParam.villages[filter].value) {
              sortedVillages.cache.push(obj);
            }
          }
        });
      }

      else if (filtersParam.villages[filter].different === 'notEqual') {
        sortedPlayers.cache.forEach( (item, i, arr) => {
          for (let j = 0; j < item.data.villages.length; j++) {
            let obj = item.data.villages[j];
            if (obj[filter] != filtersParam.villages[filter].value) {
              sortedVillages.cache.push(obj);
            }
          }
        });
      }

      else if (filtersParam.villages[filter].different === 'less') {
        sortedPlayers.cache.forEach( (item, i, arr) => {
          for (let j = 0; j < item.data.villages.length; j++) {
            let obj = item.data.villages[j];
            if (parseInt(obj[filter]) < parseInt(filtersParam.villages[filter].value)) {
              sortedVillages.cache.push(obj);
            }
          }
        });
      }

      else if (filtersParam.villages[filter].different === 'more') {
        sortedPlayers.cache.forEach( (item, i, arr) => {
          for (let j = 0; j < item.data.villages.length; j++) {
            let obj = item.data.villages[j];
            if (parseInt(obj[filter]) > parseInt(filtersParam.villages[filter].value)) {
              sortedVillages.cache.push(obj);
            }
          }
        });
      }

      else if (filtersParam.villages[filter].different === 'between') {
        sortedPlayers.cache.forEach( (item, i, arr) => {
          for (let j = 0; j < item.data.villages.length; j++) {
            let obj = item.data.villages[j];
            console.log(
              parseInt(obj[filter]) >  parseInt(filtersParam.villages[filter].valueBottom) &&
              parseInt(obj[filter]) <= parseInt(filtersParam.villages[filter].valueTop)
            )

            if (
              parseInt(obj[filter]) >  parseInt(filtersParam.villages[filter].valueBottom) &&
              parseInt(obj[filter]) <= parseInt(filtersParam.villages[filter].valueTop)
            ) {
              sortedVillages.cache.push(obj);
            }
          }
        });
      }

      hackPlayer.cache[0].data.villages = sortedVillages;
      sortedPlayers = Object.assign({}, hackPlayer);
    }

    // console.log(hackPlayer.cache[0].data.villages[0])

    let villages = hackPlayer.cache[0].data.villages.cache;
    let sortedVillagesByCoor = _.sortBy(villages,  (village) => {
      let len = Math.sqrt(Math.pow(village.coordinates.x - xCor, 2) + Math.pow(village.coordinates.y - yCor, 2));
      return len;
    });
    sortedVillagesByCoor.map((village, index, array) => {
      let len = Math.sqrt(Math.pow(village.coordinates.x - xCor, 2) + Math.pow(village.coordinates.y - yCor, 2));
      village.lenToPoint = len;
    });

    console.log(`Количество ${sortedVillagesByCoor.length}`);
    fn(sortedVillagesByCoor);

  })
}

/**
 * Добавляет список по фильтрам.
 * @param name - имя листа
 * @param xCor
 * @param yCor
 * @param filter - фильтр, интерфейс к фильтрам находится над сёрч энеми
 */

function farmListCreator(name, xCor, yCor, filter) {
  searchEnemy( (villages) => {

    console.log('farmListCreator')
    let listLength = Math.ceil(villages.length / 100);
    let listMassive = [];

    // Если нужен только первые 100 целей
    // listLength = 3;
    asyncLoop(
      listLength,
       (loop) => {
        let i = loop.iteration();

        let listObj = {
          "controller": "farmList",
          "action": "createList",
          "params": {"name": `${name} ${i}`},
          "session": token
        };

        let options = {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=UTF-8'
          },
          serverDomain: serverDomain,
          json: true,
          body: listObj
        };

        console.log(options);

        httpRequest(options)
          .then(
             (body) => {
              if (body && body.error) {
                console.log(body.error);
              }



               let listObjEdit = {
                 "controller":"farmList",
                 "action":"editList",
                 "params": {"name": name+body.cache[0].data.cache[0].data.listId,"listId":body.cache[0].data.cache[0].data.listId},
                 "session":token
               };


               let optionsEdit = {
                 method: 'POST',
                 headers: {
                   'content-type': 'application/json;charset=UTF-8'
                 },
                 serverDomain: serverDomain,
                 json: true,
                 body: listObjEdit
               };


               httpRequest(optionsEdit)
               .then(
                   (body) => {
                     console.log(body)
                   }
               );

              // console.log(options)
              // console.log(body)
              //Добавляем полученный массив в лист массивов
              listMassive.push(body.cache[0].data.cache[0].data.listId);

              if (listMassive.length == listLength) {
                addToFarmList(listMassive, villages);
              }

              loop.next();

            },
             (error) => {
              // console.log(error)
            }
          )
          .catch((error) => {
            console.log(error)
          });
      },
       () => {
        // console.log('cycle farmListCreator ended')
      }
    );


    // let sortedAllGreyVillages
  }, xCor, yCor, filter);
}


/**
 *
 * @param villages - список айди деревень
 * @param count - кол-во раз сколько послать
 * @param session - ключ, с акка котороого будут слать
 * @param villageId - айди деревни, с которого идёт отсыл
 */
function heroChecker(villages, count, session, villageId, troops) {

  asyncLoop(
    count,
     (loopHero) => {
      asyncLoop(
        villages.length,
         (loop) => {
          let i = loop.iteration();

          /*
          * проверить
          * 3: 1 - для галлов или немцев
          * 4: 1 - для римлян
          * */
          let requestPayload = {
            "controller": "troops",
            "action": "send",
            "params":
              {
                "destVillageId": villages[i],
                "villageId": villageId,
                "movementType": 6,
                "redeployHero": false,
                "units": troops,
                "spyMission": "defence"
              },
            "session": session
          };

          console.log(requestPayload)

          let options = {
            method: 'POST',
            headers: {
              'content-type': 'application/json;charset=UTF-8'
            },
            serverDomain: serverDomain,
            json: true,
            body: requestPayload
          };

          // http://rux3.kingdoms.com/api/?c=troops&a=send&t1486071488668

         let rand = fixedTimeGenerator(60) + randomTimeGenerator(30);

          httpRequest(options).then(
            (body) => {
              if (body && body.response && body.response.errors || body && body.error && body.error.message) {
                console.log(body.response.errors || body.error.message);
              }

              console.log(body)

              console.log('scaner sent')

              setTimeout(loop.next, rand);
              //console.info('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] отправлен');
            },
            (err) => {
              console.error('Произошла ошибка');
              // console.log(err);
              setTimeout(loop.next, rand);
              //console.info('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] отправлен');
            }
          )
            .catch((error) => {
              console.log(error)
            });
        },
         () => {
          // console.log('cycle heroChecker is end')
          let rand = fixedTimeGenerator(0) + randomTimeGenerator(0);
          setTimeout(loopHero.next, rand)
        }
      )
    },
     () => {
      console.log('heroChecker is end')
    }
  )

}

/**
 * Рассыл атак по условиям.
 * @param name - имя листа
 * @param xCor
 * @param yCor
 * @param filter - фильтр, интерфейс к фильтрам находится над сёрч энеми
 */

function attackList(filter, xCor, yCor, paramsAttack) {
  //'>100', '33', '-28', deathsFilter
  searchEnemy( (villages) => {
    asyncLoop(
      villages.length,
      (loop) => {
        let i = loop.iteration();

        let requestPayload = {
          "controller": "troops",
          "action": "send",
          "params":
            {
              "destVillageId": villages[i].villageId,
              "villageId": paramsAttack.villageId,
              "movementType": 6,
              "redeployHero": false,
              "units": paramsAttack.units,
              "spyMission": "resources"
            },
          "session": paramsAttack.session
        }

        let options = {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=UTF-8'
          },
          serverDomain: serverDomain,
          json: true,
          body: requestPayload
        };

        // http://rux3.kingdoms.com/api/?c=troops&a=send&t1486071488668

        let lastReportPayload = {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=UTF-8'
          },
          serverDomain: serverDomain,
          json: true,
          body: {
            "controller": "reports",
            "action": "getLastReports",
            "params": {
              "collection": "search",
              "start": 0,
              "count": 10,
              "filters": [
                "15", "16", "17",
                {"villageId": villages[i].villageId}
              ],
              "alsoGetTotalNumber": true
            },
            "session": paramsAttack.session
          }
        };

        httpRequest(lastReportPayload).then(
          (body) => {
            console.log(body);
            let rand = fixedTimeGenerator(6) + randomTimeGenerator(3);

            if (body && body.response && body.response.errors){
              console.log("Выход так как закончилась разведка".warn);
              loop.break();
            }

            //15 - чистый лог
            //16 - с потерями
            //17 - всё проёбано блеать :(
            if (body.response && body.response.reports && body.response.reports.length > 0 && body.response.reports[0].notificationType === 15) {
              httpRequest(options).then(
                (log) => {
                  setTimeout(function () {
                    // console.log('Рандомное время ' + i + ': ' + rand);
                    loop.next();
                  }, rand);
                },
                (err) => {
                  console.log(err)
                }
              );
              // console.log('body.response.reports > 0');
              // console.log(body.response.reports[0]);
            } else if (body.response && body.response.reports && body.response.reports.length === 0) {
              // console.log('body.response.reports === 0')
              httpRequest(options).then(
                (log) => {
                  setTimeout(function () {
                    // console.log('Рандомное время ' + i + ': ' + rand);
                    loop.next();
                  }, rand);
                },
                (err) => {
                  console.log(err)
                }
              )
            } else {
              // if (body.response && body.response.reports){
              //     console.log(body.response.reports[0].notificationType);
              // } else {
              //     console.log(body.response)
              // }
              setTimeout(loop.next, rand)
            }

            //console.info('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] отправлен');
          },
          (err) => {
            console.error('Произошла ошибка');
            console.log(err);
            //console.info('Фарм лист listIds[' + listPayload.params.listIds + '], villageId[' + listPayload.params.villageId + '], session[' + listPayload.session +'] отправлен');

          }
        )
        .catch((error) => {
          console.log(error)
        });
      },
      function () {
        console.log('Search ended')
      }
    );
    // let sortedAllGreyVillages
  }, xCor, yCor, filter);
}

/**
 *
 * @param object
 * attackList object
 *
 */

function scanAndShareInSS(object){

  setInterval(() => {
    attackList(object.attackList.filter, object.attackList.x, object.attackList.y, object.attackList.paramsAttack);
    setTimeout(() => {
      shareReports(
        {
          session: "9c3e553cacf981fe633b",
          start: 0,
          maxCount: 50,
          filters: ["15"]
        }
      );
    }, 3600 * 1000);

    setTimeout(() => {
      shareReports(
        {
          session: "9c3e553cacf981fe633b",
          start: 0,
          maxCount: 50,
          filters: ["15"]
        }
      );
    }, 3600 * 2000);

    setTimeout(() => {
      shareReports(
        {
          session: "9c3e553cacf981fe633b",
          start: 0,
          maxCount: 50,
          filters: ["15"]
        }
      );
    }, 3600 * 3000);

    setTimeout(() => {
      shareReports(
        {
          session: "fb19e77c6732b2fa5bda",
          start: 0,
          maxCount: 50,
          filters: ["15"]
        }
      );
    }, 3600 * 4000);
  }, 4 * 3600 * 1000);
  attackList(withoutKingdomsFilter2, 20, -32, {
    villageId: 535871508
  });

}

/**
 * Передаём параметры мерчантсов для того что бы зациклить
 * @param merchantPlayers
 */

function merchants(merchantPlayers) {
    let i = 0;
    for (let player in merchantPlayers) {
        i++;
        setTimeout(() => {
            autoMerchants(merchantPlayers[player].params, merchantPlayers[player].cred);
        }, i * 1000 * 20)
    }

    setInterval(() => {
        i = 0;
        for (let player in merchantPlayers) {
            i++;
            setTimeout(() => {
                autoMerchants(merchantPlayers[player].params, merchantPlayers[player].cred);
            }, i * 1000 * 20)
        }
    }, 777 * 1000);
}

/**
 * Автоматический рынок при амбаре меньше процента
 * @param params - объект с данными
 * @param params.percent - процент кропа в амбаре, ниже которого начинается покупка кропа - имя деревни, которую смотрим
 * @param params.villageId - id деревни, которую смотрим (наверняка можно обойтись без одного из этих параметров)
 * @param params.playerId - id игрока, чтобы запросить данные
 *
 * @param cred
 * @param cred.session - уникальный индификатор
 * @param cred.serverDomain - сервер
 */

//TODO: check on ===
function autoMerchants(params, cred) {
    let options = {
        method: 'POST',
        json: true,
        body: {
            "controller": "cache",
            "action": "get",
            "params": {
                "names": ["Merchants:" + params.villageId, "Player:" + params.playerId]
            },
            "session": cred.session
        },
        serverDomain: cred.serverDomain
    };

    httpRequest(options)
      .then(
          (body) => {
              if(body.error) {
                console.log(options)
                console.log(body);
                console.log(body.error.message.help);
              }

              let data = body.cache.find(x => x.name.split(':')[0] == 'Merchants').data;
              params.countOfMerchants = data.max - data.inOffers - data.inTransport;
              params.merchants = data.carry;
              // console.log(data);
              let cache = body.cache;
              let village = cache.find(x => x.name.split(':')[0] == 'Player').data.villages.find(x => x.villageId == params.villageId);
              // console.log(village);
              // console.log(params);
              params.storage = village.storage;
              params.storageCapacity = village.storageCapacity;
              params.wood = params.storage['1'];
              params.clay = params.storage['2'];
              params.iron = params.storage['3'];
              params.crop = params.storage['4'];
              params.cropPercent = params.crop / (params.storageCapacity['4'] / 100);
              params.maxResource = findMaxResourseId(params.wood, params.clay, params.iron);
              params.minResource = findMinResourseId(params.wood, params.clay, params.iron);
              // console.log(params)
              // console.log(params);
              if (params.maxResource != 0 && params.minResource != 0){

                  if (params.cropPercent <= params.percent) {
                      sendTradesForCrop(params, cred);
                  }
              }

            // else {
                  //     sendTradesForResources(params, cred);
                  // }
          },
          (error) => {
              // TODO: debug if have error
              console.log(error);
              console.log(options.body);
          }
      )
      .catch((error) => {
        console.log(error)
      });
}

function sendTradesForResources(params, cred) {
    for (let i = 0; i < params.countOfMerchants; i++) {

        if (params.maxResource == 1 && params.wood < params.merchants){ break; }
        if (params.maxResource == 2 && params.clay < params.merchants){ break; }
        if (params.maxResource == 3 && params.iron < params.merchants){ break; }

        let tradeOptions = {
            method: 'POST',
            headers: {
                'content-type': 'application/json;charset=UTF-8'
            },
            json: true,
            body: {
                "controller": "trade",
                "action": "createOffer",
                "params": {
                    "villageId": params.villageId,
                    "offeredResource": params.maxResource,
                    "offeredAmount": params.merchants,
                    "searchedResource": params.minResource,
                    "searchedAmount": parseInt(params.merchants * 1.33),
                    "kingdomOnly": false
                },
                "session": cred.session
            },
            serverDomain: cred.serverDomain
        };

        switch (params.minResource) {
            case 1:
                params.wood += parseInt(params.merchants * 1.33);
                break;
            case 2:
                params.clay += parseInt(params.merchants * 1.33);
                break;
            case 3:
                params.iron += parseInt(params.merchants * 2);
                break;
            default:
                break;
        }
        switch (params.maxResource) {
            case 1:
                params.wood -= params.merchants;
                break;
            case 2:
                params.clay -= params.merchants;
                break;
            case 3:
                params.iron -= params.merchants;
                break;
            default:
                break;
        }
        params.maxResource = findMaxResourseId(params.wood, params.clay, params.iron);
        params.minResource = findMinResourseId(params.wood, params.clay, params.iron);

        if (params.minResource != params.maxResource)
            httpRequest(tradeOptions)
              .then(
                  (body) => {
                      let max = tradeOptions.body.params.offeredResource == 1 ? 'wood' : tradeOptions.body.params.offeredResource == 2 ? 'clay' : 'iron';
                      let min = tradeOptions.body.params.searchedResource == 1 ? 'wood' : tradeOptions.body.params.searchedResource == 2 ? 'clay' : 'iron';
                      // console.log('Posted ' + params.merchants + ' ' + max + ' for ' + parseInt(params.merchants * 1.33) + ' ' + min);
                  }, (error) => {
                      console.log(error);
                  }
              )
              .catch((error) => {
                console.log(error)
              });
    }
}

function sendTradesForCrop(params, cred) {
    for (let i = 0; i < params.countOfMerchants; i++) {

        //1.77778

        if (params.maxResource == 1 && params.wood < params.merchants){ break; }
        if (params.maxResource == 2 && params.clay < params.merchants){ break; }
        if (params.maxResource == 3 && params.iron < params.merchants){ break; }

        let tradeOptions = {
            method: 'POST',
            headers: {
                'content-type': 'application/json;charset=UTF-8'
            },
            json: true,
            body: {
                "controller": "trade",
                "action": "createOffer",
                "params": {
                    "villageId": params.villageId,
                    "offeredResource": params.maxResource,
                    "offeredAmount": params.merchants,
                    "searchedResource": 4,
                    "searchedAmount": params.merchants * 2,
                    "kingdomOnly": false
                },
                "session": cred.session
            },
            serverDomain: cred.serverDomain
        };

        switch (params.maxResource) {
            case 1:
                params.wood -= params.merchants;
                break;
            case 2:
                params.clay -= params.merchants;
                break;
            case 3:
                params.iron -= params.merchants;
                break;
            default:
                break;
        }
        params.maxResource = findMaxResourseId(params.wood, params.clay, params.iron);

        httpRequest(tradeOptions)
            .then(
                (body) => {
                  // console.log(body)
                    let max = tradeOptions.body.params.offeredResource == 1 ? 'wood' : tradeOptions.body.params.offeredResource == 2 ? 'clay' : 'iron';
                    console.log('Posted ' + params.merchants + ' ' + max + ' for ' + (params.merchants * 2) + ' crop');                }, (error) => {
                  // console.log(error);
                }
            )
          .catch((error) => {
            console.log(error)
          });
    }
}

function findMaxResourseId(wood, clay, iron) {
    if (wood > clay && wood > iron)
        return 1;
    else if (clay > wood && clay > iron)
        return 2;
    else if (iron > clay && iron > wood)
        return 3;
    else
        return 0;
}

function findMinResourseId(wood, clay, iron) {
    if (wood < clay && wood < iron)
        return 1;
    else if (clay < wood && clay < iron)
        return 2;
    else if (iron < clay && iron < wood)
        return 3;
    else
        return 0;
}



/**
 * Копирует зелёные атаки из аккаунта from в аккаунт to
 * @param donor - listPayload
 * @param to - listPayload
 * @returns {Promise<void>}
 */
async function copyLists(donor, to, listName) {

    let greenAttacks = [];

    for (let i = 0; i < donor.params.listIds.length; i++) {
        let toggleBody = {
            "controller": "cache",
            "action": "get",
            "params": {"names": ["Collection:FarmListEntry:" + donor.params.listIds[i]]},
            "session": donor.session
        };
        let options = {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            json: true,
            body: toggleBody,
            serverDomain: donor.server
        };
        await httpRequestAsync(options).then(
            (body) => {
                console.log("\nList: " + donor.params.listIds[i]);
                let entriesCache = body.cache[0].data.cache;
                for (let i = 0; i < entriesCache.length; i++) {
                    let entry = entriesCache[i];
                    if (entry.data.lastReport && entry.data.lastReport.notificationType == 1) {
                        greenAttacks.push(entry.data);
                        // console.log(entry.data.villageName + " - green")
                    }
                }
                // console.log(entriesCache[0].data);
            },
            (error) => {
                console.log(error);
            }
        )
        .catch((error) => {
          console.log(error)
        });
    }
    await sleep(1000);

    let createdListIds = [];
    console.log("\nCount of green attacks: " + greenAttacks.length);
    let countOfLists = greenAttacks.length / 100;
    if (greenAttacks.length - countOfLists * 100 > 0)
        countOfLists++;

    for (let i = 0; i < countOfLists; i++) {

        let name = "Green attacks " + i;

        let toggleBody = {
            "controller": "farmList",
            "action": "createList",
            "params": {"name": name},
            "session": to.session
        };

        let options = {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            json: true,
            body: toggleBody,
            serverDomain: to.server
        };

        await httpRequestAsync(options).then(
            (body) => {
                // createdListIds.push(body.cache[0].data.cache[0].data.listId);
                // console.log("Created list:");
                // console.log(body.cache[0].data.cache[0].data);
                let name = listName + " " + body.cache[0].data.cache[0].data.listId;
                let toggleBody = {
                    "controller": "farmList",
                    "action": "editList",
                    "params": {
                        "name": name,
                        "listId": body.cache[0].data.cache[0].data.listId
                    },
                    "session": to.session
                };
                let options = {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json'
                    },
                    json: true,
                    body: toggleBody,
                    serverDomain: to.server
                };
                httpRequest(options).then(
                    (body) => {
                        // console.log("List renamed");
                    },
                    (error) => {
                        console.log(error);
                    }
                );
            },
            (error) => {
                console.log(error);
            }
        );

        await sleep(1000);
    }

    let list = 0;

    for (let i = 0; i < greenAttacks.length; i++) {
        let toggleBody = {
            "controller": "farmList",
            "action": "toggleEntry",
            "params": {"villageId": greenAttacks[i].villageId, "listId": createdListIds[list]},
            "session": to.session
        };
        let options = {
            method: 'POST',
            headers: {
                'content-type': 'application/json;charset=UTF-8'
            },
            json: true,
            body: toggleBody,
            serverDomain: to.server
        };

        // console.log(createdListIds)
        // console.log(toggleBody)


        await httpRequestAsync(options)
        .then(
          (body) => {
            // console.log(body);
            if (body && body.response && body.response.errors || body.error){
              console.log(options)
              console.log(body.response);
              console.log()

            } else {
                // console.log(body.cache[0].data.cache[0].data.villageName + ": added");
            }
          },
          (error) => {
              console.log(error);
          }
        );

        await sleep(1000);

        if (parseInt((i + 1) / 100) == list + 1) {
            list++;
        }
    }

    // console.log(createdListIds)
    console.log(`{"controller":"troops","action":"startFarmListRaid","params":{"listIds":[${to.params.listIds.toString()}],"villageId":${to.params.villageId},"session":${to.session}, "server": ${to.server}}`)

}

async function copyListsToAll(from, to, listName) {
    for (let i = 0; i < to.length; i++) {
        await copyLists(from, to[i], listName);
    }
}

async function growNewVillage(payloadData) {
  let payload = payloadData;
  const villageWhichGrowId = payload.villageWhichGrowId;
  const villageToGrowId = payload.villageToGrowId;
  const percent = payload.percentWarehouse;
  const levelCap = payload.slotsLvlCap;
  const warehouseLvl = payload.warehouse;
  const granaryLvl = payload.granary;
  const playerId = payload.playerId;
  const token = payload.token;
  let date = Date.now() / 1000;
  date = date - (date % 1);
  console.log("NOW        : " + new Date(date * 1000));
  let options = {
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8'
    },
    json: true,
    body: {
      "controller": "cache",
      "action": "get",
      "params": {
        "names": [
          "Collection:Building:" + villageWhichGrowId,
          "Collection:Building:" + villageToGrowId,
          "BuildingQueue:" + villageToGrowId,
          "Player:" + playerId,
          "Merchants:" + villageWhichGrowId
        ]
      },
      "session": token
    },
    serverDomain: payload.serverDomain
  };
  httpRequest(options).then(async (body) => {
    let villageWhichGrow = body.cache.find(x => x.name == "Player:" + playerId).data.villages.find(x => x.villageId == villageWhichGrowId);
    let villageToGrow = body.cache.find(x => x.name == "Player:" + playerId).data.villages.find(x => x.villageId == villageToGrowId);
    let merchants = body.cache.find(x => x.name.startsWith("Merchants:")).data;
    let buildingsOfVillageToGrow = body.cache.find(x => x.name == "Collection:Building:" + villageToGrowId).data.cache;
    let buildingQueue = body.cache.find(x => x.name.startsWith("BuildingQueue:")).data;
    let buildingHouses = buildingQueue.queues['1'][0];
    let buildingResources = buildingQueue.queues['2'][0];
    if (!buildingHouses && !buildingResources) {
      let warehouse = body.cache.find(x => x.name == "Collection:Building:" + villageToGrowId).data.cache.find(x => x.data.buildingType == "10");
      if (warehouse) {
        console.log("Warehouse lvl: " + warehouse.data.lvl);
        if (warehouse.data.lvlNext <= warehouseLvl) {
          if (checkIfEnoughResources(warehouse.data.upgradeCosts, villageToGrow.storage)) {
            console.log("Enough resources to lvl up warehouse:");
            let options = {
              method: 'POST',
              headers: {
                'content-type': 'application/json;charset=UTF-8'
              },
              json: true,
              body: {
                "controller": "building",
                "action": "upgrade",
                "params": {
                  "buildingType": warehouse.data.buildingType,
                  "locationId": warehouse.data.locationId,
                  "villageId": villageToGrowId
                },
                "session": token
              },
              serverDomain: payload.serverDomain
            };
            httpRequest(options).then(body => {
              console.log("Warehouse building started");
              let building = body.cache[0].data.queues['1'][0];
              let finish = building.finished;
              console.log("Time finish: " + finish);
              let dateNow = Date.now() / 1000;
              dateNow = dateNow - (dateNow % 1);
              console.log("Now        : " + dateNow);
              console.log("Check in   : " + new Date(finish * 1000));
              let timeToSleep = ((finish - dateNow) * 1000) + 1000;
              console.log(timeToSleep);
              sleep(timeToSleep).then(() => {
                console.log("Starting script again");
                growNewVillage(payload);
              });
            })
            .catch((error) => {
              console.log(error)
            });
          } else {
            console.log("Not enough resources to lvl up warehouse:");
            sendResourcesForGrowing(villageWhichGrow, merchants, villageToGrow, percent, payloadData.token).then(async result => {
              if (result === 0)
                await sleep(300 * 1000);
              console.log("Starting script again");
              growNewVillage(payload);
            });
          }
        } else {
          let granary = body.cache.find(x => x.name == "Collection:Building:" + villageToGrowId).data.cache.find(x => x.data.buildingType == "11");
          if (granary) {
            console.log("Granary lvl: " + granary.data.lvl);
            if (granary.data.lvlNext <= granaryLvl) {
              if (checkIfEnoughResources(granary.data.upgradeCosts, villageToGrow.storage)) {
                console.log("Enough resources to lvl up granary:");
                let options = {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json;charset=UTF-8'
                  },
                  json: true,
                  body: {
                    "controller": "building",
                    "action": "upgrade",
                    "params": {
                      "buildingType": 11,
                      "locationId": granary.data.locationId,
                      "villageId": villageToGrowId
                    },
                    "session": token
                  },
                  serverDomain: payload.serverDomain
                };
                httpRequest(options).then(body => {
                  console.log("Granary building up started");
                  let building = body.cache[0].data.queues['1'][0];
                  let finish = building.finished;
                  console.log("Time finish: " + finish);
                  console.log("Check in   : " + new Date(finish * 1000));
                  let dateNow = Date.now() / 1000;
                  dateNow = dateNow - (dateNow % 1);
                  let timeToSleep = ((finish - dateNow) * 1000) + 1000;
                  console.log(timeToSleep)
                  sleep(timeToSleep).then(() => {
                    let dateNow = Date.now() / 1000;
                    dateNow = dateNow - (dateNow % 1);
                    console.log("Starting script again, " + new Date(dateNow * 1000));
                    growNewVillage(payload);
                  });
                })
                .catch((error) => {
                  console.log(error)
                });
              } else {
                console.log("Not enough resources to lvl up granary:");
                sendResourcesForGrowing(villageWhichGrow, merchants, villageToGrow, percent, payloadData.token).then(async result => {
                  if (result === 0)
                    await sleep(300 * 1000);
                  console.log("Starting script again");
                  growNewVillage(payload);
                });
              }
            } else {
              let resourceSlots = [];
              let groupedBuildingsOfVillageToGrow = groupBuildings(buildingsOfVillageToGrow);
              let minRes = findMinResourseId(villageToGrow.storage['1'], villageToGrow.storage['2'], villageToGrow.storage['3']);
              switch (minRes) {
                case 1:
                  resourceSlots = resourceSlots.concat(groupedBuildingsOfVillageToGrow.woods);
                  break;
                case 2:
                  resourceSlots = resourceSlots.concat(groupedBuildingsOfVillageToGrow.clays);
                  break;
                case 3:
                  resourceSlots = resourceSlots.concat(groupedBuildingsOfVillageToGrow.irons);
                  break;
                default:
                  resourceSlots = resourceSlots.concat(groupedBuildingsOfVillageToGrow.woods, groupedBuildingsOfVillageToGrow.clays, groupedBuildingsOfVillageToGrow.irons, groupedBuildingsOfVillageToGrow.crops);
                  break;
              }
              let minLvlSlot = resourceSlots[0];
              for (let i = 1; i < resourceSlots.length; i++) {
                if (parseInt(resourceSlots[i].data.lvl) < parseInt(minLvlSlot.data.lvl) && resourceSlots[i].data.buildingType != 4)
                  minLvlSlot = resourceSlots[i];
              }
              if (minLvlSlot.data.lvl < levelCap) {
                if (checkIfEnoughResources(minLvlSlot.data.upgradeCosts, villageToGrow.storage)) {
                  let options = {
                    method: 'POST',
                    headers: {
                      'content-type': 'application/json;charset=UTF-8'
                    },
                    json: true,
                    body: {
                      "controller": "building",
                      "action": "upgrade",
                      "params": {
                        "buildingType": minLvlSlot.data.buildingType,
                        "locationId": minLvlSlot.data.locationId,
                        "villageId": villageToGrowId
                      },
                      "session": token
                    },
                    serverDomain: payload.serverDomain
                  };
                  httpRequest(options).then(body => {
                    console.log("Slot building started");
                    let building = body.cache[0].data.queues['2'][0];
                    let finish = building.finished;
                    console.log("Time finish: " + finish);
                    let dateNow = Date.now() / 1000;
                    dateNow = dateNow - (dateNow % 1);
                    console.log("Now        : " + dateNow);
                    console.log("Check in   : " + new Date(finish * 1000));
                    let timeToSleep = ((finish - dateNow) * 1000) + 1000;
                    console.log(timeToSleep);
                    sleep(timeToSleep).then(() => {
                      console.log("Starting script again");
                      growNewVillage(payload);
                    });
                  })
                  .catch((error) => {
                    console.log(error)
                  });
                } else {
                  resourceSlots = [];
                  resourceSlots = resourceSlots.concat(groupedBuildingsOfVillageToGrow.woods, groupedBuildingsOfVillageToGrow.clays, groupedBuildingsOfVillageToGrow.irons, groupedBuildingsOfVillageToGrow.crops);
                  let checkResult = checkIfEnoughForAny(villageToGrow.storage, resourceSlots);
                  if (checkResult.result) {
                    let options = {
                      method: 'POST',
                      headers: {
                        'content-type': 'application/json;charset=UTF-8'
                      },
                      json: true,
                      body: {
                        "controller": "building",
                        "action": "upgrade",
                        "params": {
                          "buildingType": checkResult.slot.data.buildingType,
                          "locationId": checkResult.slot.data.locationId,
                          "villageId": villageToGrowId
                        },
                        "session": token
                      },
                      serverDomain: payload.serverDomain
                    };
                    httpRequest(options).then(body => {
                      console.log("Slot building started");
                      let building = body.cache[0].data.queues['2'][0];
                      let finish = building.finished;
                      console.log("Time finish: " + finish);
                      let dateNow = Date.now() / 1000;
                      dateNow = dateNow - (dateNow % 1);
                      console.log("Now        : " + dateNow);
                      console.log("Check in   : " + new Date(finish * 1000));
                      let timeToSleep = ((finish - dateNow) * 1000) + 1000;
                      console.log("Time to sleep: " + timeToSleep);
                      sleep(timeToSleep).then(() => {
                        console.log("Starting script again");
                        growNewVillage(payload);
                      });
                    })
                    .catch((error) => {
                      console.log(error)
                    });
                  } else {
                    console.log("Not enough resources to lvl up any slot:");
                    sendResourcesForGrowing(villageWhichGrow, merchants, villageToGrow, percent, payloadData.token).then(async result => {
                      if (result === 0)
                        await sleep(300 * 1000);
                      console.log("Starting script again");
                      growNewVillage(payload);
                    });
                  }
                }
              } else {
                resourceSlots = [];
                resourceSlots = resourceSlots.concat(groupedBuildingsOfVillageToGrow.woods, groupedBuildingsOfVillageToGrow.clays, groupedBuildingsOfVillageToGrow.irons, groupedBuildingsOfVillageToGrow.crops);
                let minLvlSlot = resourceSlots[0];
                for (let i = 1; i < resourceSlots.length; i++) {
                  if (parseInt(resourceSlots[i].data.lvl) < parseInt(minLvlSlot.data.lvl))
                    minLvlSlot = resourceSlots[i];
                }
                if (minLvlSlot.data.lvl < levelCap) {
                  if (checkIfEnoughResources(minLvlSlot.data.upgradeCosts, villageToGrow.storage)) {
                    let options = {
                      method: 'POST',
                      headers: {
                        'content-type': 'application/json;charset=UTF-8'
                      },
                      json: true,
                      body: {
                        "controller": "building",
                        "action": "upgrade",
                        "params": {
                          "buildingType": minLvlSlot.data.buildingType,
                          "locationId": minLvlSlot.data.locationId,
                          "villageId": villageToGrowId
                        },
                        "session": token
                      },
                      serverDomain: payload.serverDomain
                    };
                    httpRequest(options).then(body => {
                      console.log("Slot building started");
                      let building = body.cache[0].data.queues['2'][0];
                      let finish = building.finished;
                      console.log("Time finish: " + finish);
                      let dateNow = Date.now() / 1000;
                      dateNow = dateNow - (dateNow % 1);
                      console.log("Now        : " + dateNow);
                      console.log("Check in   : " + new Date(finish * 1000));
                      let timeToSleep = ((finish - dateNow) * 1000) + 1000;
                      console.log(timeToSleep)
                      sleep(timeToSleep).then(() => {
                        console.log("Starting script again");
                        growNewVillage(payload);
                      });
                    })
                    .catch((error) => {
                      console.log(error)
                    });
                  } else {
                    let checkResult = checkIfEnoughForAny(villageToGrow.storage, resourceSlots);
                    if (checkResult.result) {
                      let options = {
                        method: 'POST',
                        headers: {
                          'content-type': 'application/json;charset=UTF-8'
                        },
                        json: true,
                        body: {
                          "controller": "building",
                          "action": "upgrade",
                          "params": {
                            "buildingType": checkResult.slot.data.buildingType,
                            "locationId": checkResult.slot.data.locationId,
                            "villageId": villageToGrowId
                          },
                          "session": token
                        },
                        serverDomain: payload.serverDomain
                      };
                      httpRequest(options).then(body => {
                        console.log("Slot building started");
                        let building = body.cache[0].data.queues['2'][0];
                        let finish = building.finished;
                        console.log("Time finish: " + finish);
                        let dateNow = Date.now() / 1000;
                        dateNow = dateNow - (dateNow % 1);
                        console.log("Now        : " + dateNow);
                        console.log("Check in   : " + new Date(finish * 1000));
                        let timeToSleep = ((finish - dateNow) * 1000) + 1000;
                        console.log("Time to sleep: " + timeToSleep);
                        sleep(timeToSleep).then(() => {
                          console.log("Starting script again");
                          growNewVillage(payload);
                        });
                      });
                    } else {
                      console.log("Not enough resources to lvl up any slot:");
                      sendResourcesForGrowing(villageWhichGrow, merchants, villageToGrow, percent, payloadData.token).then(async result => {
                        if (result === 0)
                          await sleep(300 * 1000);
                        console.log("Starting script again");
                        growNewVillage(payload);
                      });
                    }
                  }
                } else {
                  console.log("All resource slots reached " + levelCap + " lvl");
                }
              }
            }
          } else {
            console.log("Granary lvl: 0");
            let locationId = buildingsOfVillageToGrow.find(x => x.data.buildingType === 0).data.locationId;
            let options = {
              method: 'POST',
              headers: {
                'content-type': 'application/json;charset=UTF-8'
              },
              json: true,
              body: {
                "controller": "building",
                "action": "upgrade",
                "params": {
                  "buildingType": 11,
                  "locationId": locationId,
                  "villageId": villageToGrowId
                },
                "session": token
              },
              serverDomain: payload.serverDomain
            };
            httpRequest(options).then(body => {
              console.log("Granary building started");
              let building = body.cache[0].data.queues['1'][0];
              let finish = building.finished;
              console.log("Time finish: " + finish);
              let dateNow = Date.now() / 1000;
              dateNow = dateNow - (dateNow % 1);
              console.log("Now        : " + dateNow);
              console.log("Check in   : " + new Date(finish * 1000));
              let timeToSleep = ((finish - dateNow) * 1000) + 1000;
              console.log(timeToSleep);
              sleep(timeToSleep).then(() => {
                console.log("Starting script again");
                growNewVillage(payload);
              });
            });
          }
        }
      } else {
        console.log("Warehouse lvl: 0");
        let locationId = buildingsOfVillageToGrow.find(x => x.data.buildingType === 0).data.locationId;
        let options = {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=UTF-8'
          },
          json: true,
          body: {
            "controller": "building",
            "action": "upgrade",
            "params": {
              "buildingType": buildingTypes.warehouse,
              "locationId": locationId,
              "villageId": villageToGrowId
            },
            "session": token
          },
          serverDomain: payload.serverDomain
        };
        httpRequest(options).then(body => {
          console.log("Warehouse building started");
          let building = body.cache[0].data.queues['1'][0];
          let finish = building.finished;
          console.log("Time finish: " + finish);
          let dateNow = Date.now() / 1000;
          dateNow = dateNow - (dateNow % 1);
          console.log("Now        : " + dateNow);
          console.log("Check in   : " + new Date(finish * 1000));
          let timeToSleep = ((finish - dateNow) * 1000) + 1000;
          console.log(timeToSleep)
          sleep(timeToSleep).then(() => {
            console.log("Starting script again");
            growNewVillage(payload);
          });
        });
      }
    } else {
      console.log("Already builds.");
      let finish;
      if (buildingHouses && buildingResources)
        finish = buildingHouses.finished > buildingResources.finished ? buildingHouses.finished : buildingResources.finished;
      else if (buildingHouses)
        finish = buildingHouses.finished;
      else
        finish = buildingResources.finished;
      console.log("Time finish: " + finish);
      let dateNow = Date.now() / 1000;
      dateNow = dateNow - (dateNow % 1);
      console.log("Now        : " + dateNow);
      console.log("Check in   : " + new Date(finish * 1000));
      let timeToSleep = ((finish - dateNow) * 1000) + 1000;
      console.log(timeToSleep);
      sleep(timeToSleep).then(() => {
        console.log("Starting script again");
        growNewVillage(payload);
      });
    }
  });
}

function findBuildingByBuildingType(buildingsList, buildingType) {
  for (let building in buildingsList) {
    if (building.data.buildingType === buildingType)
      return building;
  }
}

/**
 * Returns an object that contains sorted and filtered arrays of buildings
 * @param slots
 * @returns {{crops: Array, woods: Array, clays: Array, irons: Array, houses: Array, empty_slots: Array}}
 */

function groupBuildings(slots) {
  let groupedBildings = {
    crops: [],
    woods: [],
    clays: [],
    irons: [],
    houses: [],
    empty_slots: []
  };
  for (let i = 0; i < slots.length; i++) {
    let slot = slots[i];
    if (slot.data.buildingType === '1')
      groupedBildings.woods.push(slot);
    else if (slot.data.buildingType === '2')
      groupedBildings.clays.push(slot);
    else if (slot.data.buildingType === '3')
      groupedBildings.irons.push(slot);
    else if (slot.data.buildingType === '4')
      groupedBildings.crops.push(slot);
    else if (slot.data.buildingType !== '0')
      groupedBildings.houses.push(slot);
    else groupedBildings.empty_slots.push(slot);
  }
  return groupedBildings;
}

function checkIfEnoughForAny(storage, slots) {
  let result = {
    result: false
  };
  for (let i = 0; i < slots.length; i++) {
    let slot = slots[i];
    if (slot.data.buildingType !== 4 && checkIfEnoughResources(slot.data.upgradeCosts, storage)) {
      result.result = true;
      result.slot = slot;
      return result;
    }
  }
  return result;
}

async function sendResourcesForGrowing(villageWhichGrow, merchants, villageToGrow, percent, token) {
  return new Promise((resolve) => {
    if (villageWhichGrow.villageId == villageToGrow.villageId) {
      resolve(0);
    } else if (
      villageWhichGrow.storage['1'] / villageWhichGrow.storageCapacity['1'] > percent / 100 &&
      villageWhichGrow.storage['2'] / villageWhichGrow.storageCapacity['2'] > percent / 100 &&
      villageWhichGrow.storage['3'] / villageWhichGrow.storageCapacity['3'] > percent / 100 &&
      villageWhichGrow.storage['4'] / villageWhichGrow.storageCapacity['4'] > percent / 100
    ) {
      let howMuchToSend = calculateHowMuchToSend(villageToGrow);
      let totalNeed = howMuchToSend[0] + howMuchToSend[1] + howMuchToSend[2] + howMuchToSend[3];
      let ableToSend = (merchants.max - merchants.inOffers - merchants.inTransport) * merchants.carry;
      if (ableToSend > 0) {
        if (totalNeed > ableToSend) {
          let coef = ableToSend / totalNeed;
          for (let i = 0; i < howMuchToSend.length; i++)
            howMuchToSend[i] = cutFloat(howMuchToSend[i] * coef);
        }
        totalNeed = howMuchToSend[0] + howMuchToSend[1] + howMuchToSend[2] + howMuchToSend[3];
        if (totalNeed <= ableToSend) {
          let forComparing = {
            '1': howMuchToSend[0],
            '2': howMuchToSend[1],
            '3': howMuchToSend[2],
            '4': howMuchToSend[3]
          };
          if (checkIfEnoughResources(forComparing, villageWhichGrow.storage)) {
            let sendOptions = {
              method: 'POST',
              headers: {
                'content-type': 'application/json;charset=UTF-8'
              },
              json: true,
              body: {
                "controller": "trade",
                "action": "sendResources",
                "params": {
                  "destVillageId": villageToGrow.villageId,
                  "recurrences": 1,
                  "resources": forComparing,
                  "sourceVillageId": villageWhichGrow.villageId
                }, "session": token
              },
              serverDomain: serverDomain
            };

            httpRequest(sendOptions).then(async (body) => {
              let data = body.cache[0].data;
              let resources = data.movement.resources;
              console.log("Recources sent:");
              console.log("Wood: " + resources['1'] + ", clay: " + resources['2'] + ", iron: " + resources['3'] + ", crop: " + resources['4']);
              let timeToSleep = (data.movement.timeFinish - data.movement.timeStart) * 1000 + 1000;
              console.log("Wait: " + timeToSleep + " millis");
              await sleep(timeToSleep);
              resolve();
            });
          } else {
            console.log("Not enough resources in village which grows");
            resolve(0);
          }
        }
      } else {
        console.log("There are no merchants in village which grows");
        resolve(0);
      }
    } else {
      console.log("There are too low resources in village which grows");
      resolve(0);
    }
  });
}

function cutFloat(value) {
  return value - (value % 1);
}

function calculateHowMuchToSend(villageToGrow) {
  let need = [
    villageToGrow.storageCapacity['1'] - Math.trunc(villageToGrow.storage['1']) - (villageToGrow.production['1'] * 3),
    villageToGrow.storageCapacity['2'] - Math.trunc(villageToGrow.storage['2']) - (villageToGrow.production['2'] * 3),
    villageToGrow.storageCapacity['3'] - Math.trunc(villageToGrow.storage['3']) - (villageToGrow.production['3'] * 3),
    villageToGrow.storageCapacity['4'] - Math.trunc(villageToGrow.storage['4']) - (villageToGrow.production['4'] * 3)
  ];
  for (let i = 0; i < need.length; i++)
    if (need[i] < 0)
      need[i] = 0;
  return need;
}

function checkIfEnoughResources(required, exist) {
  return required['1'] <= exist['1'] &&
    required['2'] <= exist['2'] &&
    required['3'] <= exist['3'] &&
    required['4'] <= exist['4'];
}


/**
 * Шейр скан
 * @param payloadData
 * @returns {Promise<void>}
 */
async function shareScans(payloadData) {
  let reportsToShare = [];
  let isLastPage = false;
  let reportsCounter = 0;
  let sharedReports = [];
  do {
    let options = {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=UTF-8'
      },
      serverDomain: payloadData.serverDomain,
      json: true,
      body: {
        "controller": "reports",
        "action": "getLastReports",
        "params": {
          alsoGetTotalNumber: true,
          collection: "own",
          count: 50,
          filters: [15],
          start: reportsCounter
        },
        "session": payloadData.session
      }
    };
    reportsCounter += 50;
    await httpRequest(options).then((body) => {
      let time = Math.trunc(body.time / 1000);
      let reports = body.response.reports;
      for (let i = 0; i < reports.length; i++) {
        if (time - reports[i].time <= payloadData.minutes * 60 && !sharedReports.includes(reports[i]._id.$id)) {
          reportsToShare.push(reports[i]);
        } else {
          isLastPage = true;
          break;
        }
      }
    });
  } while (!isLastPage);
  console.log("Reports to share without check of troops and capacity: " + reportsToShare.length);
  for (let i = 0; i < reportsToShare.length; i++) {
    let currentReport = reportsToShare[i];
    let options = {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=UTF-8'
      },
      serverDomain: payloadData.serverDomain,
      json: true,
      body: {
        "controller": "reports",
        "action": "getFullReport",
        "params": {
          collection: "own",
          id: currentReport._id.$id,
          securityCode: ""
        },
        "session": payloadData.session
      }
    };

    await httpRequest(options).then(async (body) => {
      let enemyTroops = body.response.body.modules.find((x) => x.name == "troops/tribeSum").body.originalTroops;
      let countOfTroops = 0;
      for (let property in enemyTroops) {
        if (enemyTroops.hasOwnProperty(property)) {
          countOfTroops += enemyTroops[property];
        }
      }
      if (countOfTroops == 0) {
        let needCapacity = 0;
        let spyBody = body.response.body.modules.find((x) => x.name == "spy").body;
        let woodClear = spyBody.resources['1'] - spyBody.hiddenByAllCrannies;
        woodClear = woodClear > 0 ? woodClear : 0;
        let clayClear = spyBody.resources['2'] - spyBody.hiddenByAllCrannies;
        clayClear = clayClear > 0 ? clayClear : 0;
        let ironClear = spyBody.resources['3'] - spyBody.hiddenByAllCrannies;
        ironClear = ironClear > 0 ? ironClear : 0;
        let cropClear = spyBody.resources['4'] - spyBody.hiddenByAllCrannies;
        cropClear = cropClear > 0 ? cropClear : 0;
        needCapacity += woodClear + clayClear + ironClear + cropClear;
        if (spyBody.tributes) {
          let woodTributes = spyBody.tributes['1'] - spyBody.hiddenByTreasury;
          woodTributes = woodTributes > 0 ? woodTributes : 0;
          let clayTributes = spyBody.tributes['2'] - spyBody.hiddenByTreasury;
          clayTributes = clayTributes > 0 ? clayTributes : 0;
          let ironTributes = spyBody.tributes['3'] - spyBody.hiddenByTreasury;
          ironTributes = ironTributes > 0 ? ironTributes : 0;
          needCapacity += woodTributes + clayTributes + ironTributes;
        }
        if (needCapacity >= payloadData.minimumResources && payloadData.shareParam) {
          let str = "";

          str += "Need " + needCapacity + " capacity. ";
          str += "Imperians: " + (Math.trunc(needCapacity / 50) + 1) + ". ";
          str += "EIs: " + (Math.trunc(needCapacity / 100) + 1) + ". ";
          str += "Clubs: " + (Math.trunc(needCapacity / 60) + 1) + ". ";
          str += "Paladins: " + (Math.trunc(needCapacity / 110) + 1) + ". ";
          str += "TKs: " + (Math.trunc(needCapacity / 80) + 1) + ". ";
          str += "Swords: " + (Math.trunc(needCapacity / 45) + 1) + ". ";
          str += "TTs: " + (Math.trunc(needCapacity / 75) + 1) + ". ";
          let options = {
            method: 'POST',
            headers: {
              'content-type': 'application/json;charset=UTF-8'
            },
            serverDomain: payloadData.serverDomain,
            json: true,
            body: {
              "controller": "reports",
              "action": "shareReport",
              "params": {
                collection: "own",
                id: currentReport._id.$id,
                shareMessage: str,
                shareParam: payloadData.shareParam,
                shareWith: "secretSociety"
              },
              "session": payloadData.session
            }
          };

          await httpRequest(options).then((body) => {
            // console.log(JSON.stringify(body));
            sharedReports.push(currentReport._id.$id);
          });
          await sleep(2 * 1000);
        }
      }
    });
  }
  console.log("Sleep for 3 min.");
  await sleep(3 * 60 * 1000);
  shareScans(payloadData);
}

/**
 * Скан для шара скан
 * @param payloadData
 * @returns {Promise<void>}
 */
async function shareLogScans(payloadData, options) {
  let reportsToShare = [];
  let isLastPage = false;
  let reportsCounter = 0;
  let sharedReports = [];
  do {
    let httpOptions = {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=UTF-8'
      },
      serverDomain: payloadData.serverDomain,
      json: true,
      body: {
        "controller": "reports",
        "action": "getLastReports",
        "params": {
          alsoGetTotalNumber: true,
          collection: "own",
          count: 50,
          filters: [15],
          start: reportsCounter
        },
        "session": payloadData.session
      }
    };
    reportsCounter += 50;
    await httpRequest(httpOptions).then((body) => {
      let time = Math.trunc(body.time / 1000);
      let reports = body.response.reports;
      for (let i = 0; i < reports.length; i++) {
        if (time - reports[i].time <= payloadData.minutes * 60 && !sharedReports.includes(reports[i]._id.$id)) {
          reportsToShare.push(reports[i]);
        } else {
          isLastPage = true;
          break;
        }
      }
    });
  } while (!isLastPage);
  // console.log("Reports to share without check of troops and capacity: " + reportsToShare.length);
  let massiveLogs = [];
  for (let i = 0; i < reportsToShare.length; i++) {
    let currentReport = reportsToShare[i];
    if (currentReport.destKingdomId === options.destKingdomId){
massiveLogs.push(`[report:${currentReport._id.$id}00${currentReport.notificationType}${currentReport.securityCode}]
`);
    }
  }
  console.log("");
  console.log(massiveLogs.join(''))
  await sleep(10 * 60 * 1000);
  shareLogScans(payloadData, options);
}


/**
 *
 * @param fn
 * @param time
 */
function repeatDelay(fn,  time, disp = 0) {

  if (Math.random() > disp) {
    fn();
  }

  let randTime = fixedTimeGenerator(3600) + randomTimeGenerator(800);
  setInterval(() => {
    if (Math.random() > disp) {
      fn();
    }
  }, time || randTime);
}

/**
 *
 * @param ms
 */


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let users = {
  wahlberg: {"session":"55d8d325a246dfe532e9"},
  ars: {"session":"4d9105fa92838f92a7bf"},
  rin: {"session":"bbe7b62de5c893d28cc7"},
  ruslan: {"session":"5029ed251b86766c9a49"},
  desertir: {"session":"b2cf755adf5c6f4e0d70"},
  quasi: {"session": "ca73b64392c2e87ea4e9"},
  hysteria: {"session": "cfadf678a179523b612b"},
  morpeh: {"session": "28121b2640e7c8966636"},
};

let sharePayload = {
  wahlberg: {
    "session":users.wahlberg.session,
    "serverDomain": "ru2x3",
    "minutes": 60,
    "shareParam": 82,//SS id
    "minimumResources": 3000
  }
};

let listPayload = {
  wahlberg:  {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[1945, 2349, 2350, 2351, 2352],"villageId":536526851},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg2: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[1945, 2349, 2350, 2351, 2352],"villageId":536559616},"session": users.wahlberg.session, "server": "ru2x3"},
  wahlberg3: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535609328},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg4: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535576552},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg5: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":536166355},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg6: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535412748},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg7: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535740417},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg8: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535216111},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg9: {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535412762},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg10:{"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535379975},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg11:{"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535609365},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg12:{"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535478251},"session": users.wahlberg.session, "server": "ru1x3"},
  wahlberg13:{"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2480,2481,2482,2483,2484],"villageId":535281698},"session": users.wahlberg.session, "server": "ru1x3"},
  ruslan:    {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[],"villageId":536625112},"session": users.ruslan.session, "server": "ru1x3"},
  ars:       {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[1900, 1901],"villageId":535478272},"session": users.ars.session, "server": "ru1x3"},
  desertir:  {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[1902, 1903],"villageId":536166362},"session": users.desertir.session, "server": "ru1x3"},
  rin:       {"controller":"troops","action":"startFarmListRaid","params":{"listIds":[2075, 2076, 2077],"villageId":535216107},"session": users.rin.session, "server": "ru1x3"},
};


let cookie = userDate.cookie;
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
let token = userDate.token;
let serverDomain = userDate.serverDomain;
// node ./bin/wwwY
//different = {less, equal, more}
//value = value
//TODO: вынести фильтры
/**
 * Примеры фильров
 * @type {{players: {active: {different: string, value: string}}, villages: {population: {different: string, value: string}}}}
 */
let deathsFilterFrom60To150 = {
  players: {
    hasNoobProtection: {
      different: "equal",
      value: false,
    },
    kingdomId: {
      different: "equal",
      value: "0"
    },
    active: {
      different: "equal",
      value: "0"
    },
    population: {
      different: "between",
      valueTop: "149",
      valueBottom: "40",
    }
  },
  villages: {
    population: {
      different: "between",
      valueTop: "149",
      valueBottom: "60",
    }
  }
};
let deathsFilterFrom150 = {
  players: {
    active: {
      different: "equal",
      value: "0"
    },
    hasNoobProtection: {
      different: "equal",
      value: false,
    },
    kingdomId: {
      different: "equal",
      value: "0"
    },
  },
  villages: {
    population: {
      different: "more",
      value: "150"
    }
  }
};
let deathsFilter = {
  players: {
    active: {
      different: "equal",
      value: "0"
    }
  },
  villages: {
    population: {
      different: "more",
      value: "1"
    }
  }
};
let lowVillage = {
  players: {
    active: {
      different: "equal",
      value: "1"
    },
    hasNoobProtection: {
      different: "equal",
      value: false,
    },
    tribeId: {
      different: "equal",
      value: "2"
    },
  },
  villages: {
    population: {
      different: "less",
      value: "200"
    }
  },

};
let withoutKingdomsFilter = {
  players: {
    hasNoobProtection: {
      different: "equal",
      value: false,
    },
    kingdomId: {
      different: "equal",
      value: "0"
    },
    active: {
      different: "equal",
      value: "1"
    },
    population: {
      different: "between",
      valueTop: "199",
      valueBottom: "40",
    }
  },
  villages: {
    population: {
      different: "between",
      valueTop: "199",
      valueBottom: "40",
    }
  }
};

let withoutKingdomsFilter2 = {
  players: {
    hasNoobProtection: {
      different: "equal",
      value: false,
    },
    kingdomId: {
      different: "equal",
      value: "111"
    },
    active: {
      different: "equal",
      value: "1"
    },
  },
  villages: {
    population: {
      different: "less",
      value: "1200",
    }
  }
};

let checkAll = {
  players: {
    hasNoobProtection: {
      different: "equal",
      value: false,
    },
    kingdomId: {
      different: "notEqual",
      value: "141"
    },
    active: {
      different: "equal",
      value: "1"
    },
  },
  villages: {
    population: {
      different: "less",
      value: "400",
    }
  }
};

//8 - нублэнд
//3 - ermak

let kingdomsFilters = {
  players: {
    kingdomId: {
      different: "equal",
      value: "3"
    },
    active: {
      different: "equal",
      value: "1"
    }
  },
  villages: {
    population: {
      different: "more",
      value: "1"
    }
  }
};
let kingdomsFilters2 = {
  players: {
    kingdomId: {
      different: "equal",
      value: "8"
    },
    active: {
      different: "equal",
      value: "1"
    }
  },
  villages: {
    population: {
      different: "more",
      value: "1"
    }
  }
};
let kingdomsFilters3 = {
  players: {
    kingdomId: {
      different: "equal",
      value: "105"
    },
    active: {
      different: "equal",
      value: "1"
    }
  },
  villages: {
    population: {
      different: "more",
      value: "1"
    }
  }
};

let kingdomsFilters4 = {
  players: {
    kingdomId: {
      different: "equal",
      value: "142"
    },
    active: {
      different: "equal",
      value: "1"
    }
  },
  villages: {
    population: {
      different: "more",
      value: "1"
    }
  }
};

let kingdomsFilters5 = {
  players: {
    kingdomId: {
      different: "equal",
      value: "142"
    },
    active: {
      different: "equal",
      value: "1"
    }
  },
  villages: {
    population: {
      different: "more",
      value: "1"
    }
  }
};

let kingdomsFilters6 = {
  players: {
    kingdomId: {
      different: "equal",
      value: "144"
    },
    active: {
      different: "equal",
      value: "1"
    }
  },
  villages: {
    population: {
      different: "more",
      value: "1"
    }
  }
};

let neutrals = {
  players: {
    kingdomId: {
      different: "equal",
      value: "0"
    },
    active: {
      different: "equal",
      value: "1"
    }
  },
  villages: {
    population: {
      different: "more",
      value: "1"
    }
  }
};

//TODO: переписать на класс, добавить es6 , ts


// let repeatFn = function(fn){
//   getMapInfo('crop', token, serverDomain, timeForGame);
//   setTimeout(fn, 600000);
// };
// let troops = {
//     "controller": "troops",
//     "action": "send",
//     "params": {
//         "catapultTargets": [99],
//         "destVillageId": "537247789",
//         "villageId": 537346086,
//         "movementType": 3,
//         "redeployHero": false,
//         "units": {
//             "1": 340,
//             "2": 0,
//             "3": 0,
//             "4": 0,
//             "5": 0,
//             "6": 0,
//             "7": 0,
//             "8": 10,
//             "9": 0,
//             "10": 0,
//             "11": 0l
//         },
//         "spyMission": "resources"
//     },
//     "session": token
// };

/**
 *
 */


let optionsFL = {
  method: 'POST',
  json: true,
  body: {
    "controller":"troops",
    "action":"send",
    "params":{
      "destVillageId":"536920047",
      "villageId":537444336,
      "movementType":5,
      "redeployHero":false,
      "units":{"1":0,"2":735,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":1},"spyMission":"resources"
    },
    "session":"490dd9471747ac65e1d8"
  },
  serverDomain: 'test'
};

// setTimeout(() => {
//   httpRequest(optionsFL).then((data) => (console.log('успешно отправлено')))
// }, 1000 * 38 * 60 );

//{"controller":"troops","action":"send","params":{"destVillageId":"536854525","villageId":537018360,"movementType":6,"redeployHero":false,"units":{"1":0,"2":0,"3":0,"4":1,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":0},"spyMission":"resources"},"session":"a375cc48a46501224190"}
/**
 * Скан по условию
 */

//68 - хроникс
//105 - овощи
//142 - раскал
// setTimeout(() => {
//   attackList(kingdomsFilters3, -17, 13, {villageId: 536330192, session: "5329e84be6a22baac5b2", units: {
//       "1": 0,
//       "2": 0,
//       "3": 0,
//       "4": 2,
//       "5": 0,
//       "6": 0,
//       "7": 0,
//       "8": 0,
//       "9": 0,
//       "10": 0,
//       "11": 0
//     }});
// }, 1000 * 180);
// attackList(kingdomsFilters6, -17, 13, {villageId: 535674862, session: users.wahlberg.session, units: {
//       "1": 0,
//       "2": 0,
//       "3": 2,
//       "4": 0,
//       "5": 0,
//       "6": 0,
//       "7": 0,
//       "8": 0,
//       "9": 0,
//       "10": 0,
//       "11": 0
//   }});
// attackList(kingdomsFilters3, -17, -37, {villageId: 535674862, session: users.wahlberg.session, units: {
//       "1": 0,
//       "2": 0,
//       "3": 4,
//       "4": 0,
//       "5": 0,
//       "6": 0,
//       "7": 0,
//       "8": 0,
//       "9": 0,
//       "10": 0,
//       "11": 0
//   }});

/**
 * Билд войнов
 */
// autoUnitsBuild('537051121', {3: 14}, {5: 12}, 3600, 200, 'd8efc425263d11d0f4a3');
// autoUnitsBuild('536756212', {3: 14}, {5: 12}, 3600, 200, 'd8efc425263d11d0f4a3');
// autoUnitsBuild('536821756', {3: 14}, {5: 12}, 3600, 200, 'ef403b0afd590accf790');

/**
 * Торговцы
 */

let merchantPlayers = {
  wahlberg1: {
    params: {percent: 95, villageId: 536559616, playerId: '140'},
    cred: {session: users.wahlberg.session, serverDomain: 'ru2x3'}
  },
};
/**
 * Копирование списков
 */
//
// setTimeout(() => {
//  copyListsToAll(
//    listPayload.wahlberg,
//     [
//      // listPayload.rin,
//      // listPayload.caca,
//      // listPayload.ars,
//      // listPayload.desertir,
//      listPayload.ruslan,
//     ],
//     "03mar_");
// }, 100 * 1000)


/**
 * Добавления юнитов по улсовиям
 */

farmListCreator('60-149/', '0', '-10', deathsFilterFrom60To150);
setTimeout(() => {
  farmListCreator('150/', '0', '-10', deathsFilterFrom150);
}, 100 * 1000);
// setTimeout(() => {
//   farmListCreator('neutrals/', '0', '-10', neutrals);
// //   farmListCreator('dx/', '-18', '-37', kingdomsFilters3);
// // //   farmListCreator('kaba/', '-18', '-37', kingdomsFilters2);
// }, 200 * 1000);
// }, 2400 * 1000)

/**
 * Фармлисты
 */
// autoFarmList(1200, 300, listPayload.ars ,   'ru1x3', true);

/**
 * Моё
 */
// autoUnitsBuild('536559616', {3: 8}, {6: 9}, 1200, 0, users.wahlberg.session);
//
// repeatDelay(attackList.bind(this, kingdomsFilters, 0, 0, {villageId: 536526851, session: users.wahlberg.session, units: {
//     "1": 0,
//     "2": 0,
//     "3": 0,
//     "4": 1,
//     "5": 0,
//     "6": 0,
//     "7": 0,
//     "8": 0,
//     "9": 0,
//     "10": 0,
//     "11": 0
//   }}));
//
// repeatDelay(attackList.bind(this, kingdomsFilters2, 0, 0, {villageId: 536526851, session: users.wahlberg.session, units: {
//     "1": 0,
//     "2": 0,
//     "3": 0,
//     "4": 1,
//     "5": 0,
//     "6": 0,
//     "7": 0,
//     "8": 0,
//     "9": 0,
//     "10": 0,
//     "11": 0
//   }}));
//
// // setTimeout(()=>{
// autoFarmList(900, 500, listPayload.wahlberg2,   'ru2x3', true, {checkList: true});
// setTimeout(() => {autoFarmList(900, 500, listPayload.wahlberg,   'ru2x3', true, {checkList: true});}, 1000 * 410);
// // }, 2 * 3600 * 1000);
// // autoFarmList(1500, 700, listPayload.wahlberg ,    'ru1x3', true, {checkList: true});
// // autoFarmList(700, 500, listPayload.wahlberg2 ,   'ru2x3', true, {checkList: true});
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg3 ,   'ru1x3', true, {checkList: false});}, 1000 * 410);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg4 ,   'ru1x3', true, {checkList: false});}, 1000 * 420);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg5 ,   'ru1x3', true, {checkList: false});}, 1000 * 430);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg6 ,   'ru1x3', true, {checkList: false});}, 1000 * 440);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg7 ,   'ru1x3', true, {checkList: false});}, 1000 * 450);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg8 ,   'ru1x3', true, {checkList: false});}, 1000 * 460);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg9 ,   'ru1x3', true, {checkList: false});}, 1000 * 470);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg10,   'ru1x3', true, {checkList: false});}, 1000 * 480);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg11,   'ru1x3', true, {checkList: false});}, 1000 * 490);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg12,   'ru1x3', true, {checkList: false});}, 1000 * 500);
// // setTimeout(() => {autoFarmList(1500, 700, listPayload.wahlberg13,   'ru1x3', true, {checkList: false});}, 1000 * 500);
// // shareScans(sharePayload.wahlberg );
// // shareLogScans(sharePayload.wahlberg, {destKingdomId: '8'});
// // shareLogScans(sharePayload.wahlberg, {destKingdomId: '111'});
// // shareLogScans(sharePayload.wahlberg, {destKingdomId: '283'});
// // merchants(merchantPlayers);
//
// repeatDelay(attackList.bind(this, neutrals, 0, 0, {villageId: 536526851, session: users.wahlberg.session, units: {
//     "1": 0,
//     "2": 0,
//     "3": 0,
//     "4": 1,
//     "5": 0,
//     "6": 0,
//     "7": 0,
//     "8": 0,
//     "9": 0,
//     "10": 0,
//     "11": 0
//   }}), fixedTimeGenerator(12000) + randomTimeGenerator(7200), 0.00001);
// repeatDelay(attackList.bind(this, kingdomsFilters2, -17, -40, {villageId: 535674862, session: users.wahlberg.session, units: {
//     "1": 0,
//     "2": 0,
//     "3": 1,
//     "4": 0,
//     "5": 0,
//     "6": 0,
//     "7": 0,
//     "8": 0,
//     "9": 0,
//     "10": 0,
//     "11": 0
// }}));
// repeatDelay(attackList.bind(this, kingdomsFilters3, -17, -40, {villageId: 536330192, session: "4230689e704131fd6589", units: {
//     "1": 0,
//     "2": 0,
//     "3": 1,
//     "4": 0,
//     "5": 0,
//     "6": 0,
//     "7": 0,
//     "8": 0,
//     "9": 0,
//     "10": 0,
//     "11": 0
// }}));

/**
  Hero check
 */

async function operationChecker(opt){
  function timeBetweenVillage(xd, yd, xt, yt, movement, arenalvl) {
    let distance = getDistance(xd, yd, xt, yt);
    console.log(xd, yd, xt, yt, distance, arenalvl)
    if (distance > 20) {
      return (20/movement + (distance-20)/(movement*(10+arenalvl)/10))
    } else {
      return (distance/movement)
    }
  }

  function getDistance(xd, yd, xt, yt){
    return Math.sqrt((xd-xt)*(xd-xt)+(yd-yt)*(yd-yt))
  }

  async function getVillages(opt){

    let villages = [];
    opt.villagesAttacks.forEach((item) => {
      villages.push("Village:" + item.villageId);
    });

    opt.villagesHasAttacked.forEach((item) => {
      villages.push("Village:" + item);
    });

    let body = {
      "controller":"cache",
      "action":"get",
      "params": {
        "names": villages
      },
      "session": opt.villageChecker.session
    };


    let payload = {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=UTF-8'
      },
      serverDomain: opt.villageChecker.serverDomain,
      json: true,
      body: body
    };

    console.log(body.params)

    return httpRequestAsync(payload)
  }

  let villages = await getVillages(opt);

  console.log(`diff time: ${Date.now() - villages.time}`);


  opt.villagesAttacks.forEach((villageAttacks) => {
    for (let i = 0; i < opt.villagesHasAttacked.length; i++) {
      let villageHasAttacked = opt.villagesHasAttacked[i];
      let villageAttacksObj = villages.cache.find((village) => {
        return village.name === `Village:${villageAttacks.villageId}`
      });
      let villageHasAttackedObj = villages.cache.find((village) => {
        return village.name === `Village:${villageHasAttacked}`
      });


      let time = timeBetweenVillage(
        villageAttacksObj.data.coordinates.x,
        villageAttacksObj.data.coordinates.y,
        villageHasAttackedObj.data.coordinates.x,
        villageHasAttackedObj.data.coordinates.y,
        8,
        villageAttacks.arenaLvl
      )  * 3600 * 1000;
      let timeFormat = moment(time).utc(0).format('HH:mm:ss');
      //ОСТАНОВИЛСЯ ТУТ
      // let diffTime = timeFormat.diff(timeFormat.diff(moment(villageAttacks.arrivalTime, "HH:mm:ss")));
      // console.log(diffTime);
    }
  });

}

// operationChecker({
//   villagesAttacks: [{
//     villageId: '536821734',
//     arenaLvl: 10,
//     arrivalTime: '2:05:25'
//   },
//   {
//     villageId: '536756217',
//     arenaLvl: 10,
//     arrivalTime: '2:05:25'
//   },
//   {
//     villageId: '537051116',
//     arenaLvl: 10,
//     arrivalTime: '2:05:25'
//   },
//   {
//     villageId: '536657907',
//     arenaLvl: 15,
//     arrivalTime: '2:05:25'
//   }
//   ],
//   villagesHasAttacked: [
//     '535674862', '535281653', '535871444', '536166362', '536264653', '536625112', '536887254', '536887243', '536461267'
//   ],
//   villageChecker: {
//     villageId: '536166393',
//     serverDomain: 'ru1x3',
//     session: users.wahlberg.session,
//   }
// });
// playerFarmList, filter, fixedTime, randomTime, server
// heroChecker([536526845], 30, "1dded33126f1d99c4a64", 536985583,
//   {
//     "1": 0,
//     "2": 0,
//     "3": 1,
//     "4": 0,
//     "5": 0,
//     "6": 0,
//     "7": 0,
//     "8": 0,
//     "9": 0,
//     "10": 0,
//     "11": 0
//   });
// heroChecker([536166423], 35, users.wahlberg.session, 536166393,{
//   "1": 0,
//   "2": 0,
//   "3": 1,
//   "4": 0,
//   "5": 0,
//   "6": 0,
//   "7": 0,
//   "8": 0,
//   "9": 0,
//   "10": 0,
//   "11": 0
// });
// heroChecker([535412748], 200, users.wahlberg.session, 535674862, {
//   "1": 0,
//   "2": 0,
//   "3": 1,
//   "4": 0,
//   "5": 0,
//   "6": 0,
//   "7": 0,
//   "8": 0,
//   "9": 0,
//   "10": 0,
//   "11": 0
// });
// heroChecker([535838712], 100, "f192292c4346c1fead7a", 537247743);

/**
 * autobuild
 * @type {{villageWhichGrowId: number, villageToGrowId: number, percentWarehouse: number, slotsLvlCap: number, warehouse: number, granary: number, token: string, playerId: number, serverDomain: string}}
 */

let payloadData = {
  villageWhichGrowId: 537018358, // деревня, откуда шлём ресы (если надо, чтобы деревня росла на своём чвр - указать деревню, которую растим)
  villageToGrowId: 537018356, // деревня, которую растим
  percentWarehouse: 0, // процент содержания склада, если хоть один рес меньше процента - торгаши не шлются
  slotsLvlCap: 7, // уровень полей
  warehouse: 6, // уровень склада
  granary: 6, // уровень амбара
  token: '08110e8754131516abc8',
  playerId: 333,
  serverDomain: 'test'
};

// growNewVillage(payloadData);


/**
 * Автобот
 */

// new Autobot();

/**
 * Крокодилы
 */
// setInterval(function() {
//   getMapInfo('animal', token, serverDomain, timeForGame);
// }, 600000);
// getMapInfo('animal', token, serverDomain, timeForGame);

/**
 * Кроп
 */
// getMapInfo('crop', token, serverDomain, timeForGame, 156);

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
