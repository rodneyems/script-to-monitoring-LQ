require('dotenv').config()
const fetch = require('node-fetch')
const request = require('request')
const path = require('path')
const fs = require('fs')
const IP_ADDRESS_SP = process.env.IP_ADDRESS_SP
const IP_ADDRESS_JB = process.env.IP_ADDRESS_JB
const BOT_ID = process.env.BOT_ID
const CHAT_ID = process.env.CHAT_ID
const msgDefault = `https://api.telegram.org/${BOT_ID}/sendMessage?chat_id=${CHAT_ID}&parse_mode=Markdown&text=`
let changeCon = 0
let change = 0

// DATE
const time = ()=>{
    const time = new Date()
    const date = time.getUTCDate()+'/'+ parseInt(time.getMonth() + 1) +'/'+time.getFullYear()
    const timeStamp = time.getHours()+':'+time.getMinutes()+':'+time.getSeconds()
    const timeStampToFile = time.getHours()+';'+time.getMinutes()+';'+time.getSeconds()
    return {date, timeStamp, timeStampToFile}
}

// INIT A SNAP
function initSnap(){
    return new Promise((resolve)=>{
        request.post(`http://${IP_ADDRESS_SP}/api/1/devices/0/snapshot`)
        var teste = setInterval(()=>{
            fetch(`http://${IP_ADDRESS_SP}/api/1/devices/0/snapshotinfo`)    
            .then(response => response.json())
            .then(json =>{
                console.log(json.percentComplete)
                if(json.percentComplete == 100){
                    resolve()
                    clearInterval(teste)
                }
            })
        },30000)
    }) 
}

// DOWNLOAD SNAPSHOT
const urlToSnapSP = `http://${IP_ADDRESS_SP}/api/1/devices/0/snapshot`
const urlToSnapJB = `http://${IP_ADDRESS_JB}/api/1/devices/0/snapshot`

function downloadSnap (url, callback, deviceName){
    const pathToDown = `./snapshots/${deviceName}-snapshot-${time().timeStampToFile}.tar`
    request.head(url, (err, res, body) => {
      request(url)
        .pipe(fs.createWriteStream(pathToDown))
        .on('close', callback)
    })
}

// EXECUTE A SNAPSHOT
function executeSnap(urlToSnap, deviceName){
    try {
        initSnap().then(()=>{
            downloadSnap(urlToSnap,()=>{
                saveLog(deviceName," --- ","DOWNLOAD SNAP")
                console.log("DONWLOAD REALIZADO")
            }, deviceName)
        })
    } catch (error) {
        sendMessage(deviceName + 'SEM CONEXAO PARA SNAP')
        saveLog(deviceName,"---",error)
    }

}


// SEND A TELEGRAM MESSAGE 
function sendMessage(deviceAndStatus, ){
    var msg = msgDefault + deviceAndStatus + time().date +' - ' + time().timeStamp
    request.get(msg)
}

// SAVE LOCAL LOG 
function saveLog(deviceAndStatus){
    var msg = deviceAndStatus + time().date +' - ' + time().timeStamp + '\n'
    fs.appendFileSync(path.join(__dirname,'logLQ.txt'),msg)
}

// MONITORING
function lqAPI(){
    fetch(`http://${IP_ADDRESS_SP}/api/1/devices/1/liveStatus`)
    .then(response => response.json())
    .then(json => {
        if(changeCon == 1){
            changeCon = 0
            sendMessage('LQ B COM CONEXAO')
            saveLog('LQ B COM CONEXÃO')
        }
        if(!json.label && change == 0){
            change = 1
            sendMessage('LQ B DESCONECTADO')
            saveLog('LQ B DESCONECTADO')
            executeSnap(urlToSnapSP, 'LQ SP SNAP ')
            executeSnap(urlToSnapJB, 'LQ JB SNAP ')
        }
        if(json.label && change == 1){
            change = 0
            sendMessage('LQ B CONECTADO')
            saveLog('LQ B CONECTADO')
        }
    }).catch(()=>{
            if(changeCon == 0){
                changeCon = 1
                sendMessage('LQ B SEM CONEXAO')
                saveLog('LQ B SEM CONEXÃO')
            }
    })
}

console.log('Script Running ✔')
setInterval(()=>{
    lqAPI()
},5000)
