var md5 = require('md5');

var outarr = new Array();

const http2 = require('http2');
var h1req = require('request');

function dedupe(array){
 return Array.from(new Set(array));
}

function getword(words,idx,servobj,strmd5){
    var word = words[idx];
    h1req.post({url:'http://dmfy.emindsoft.com.cn/query/queryByWord.do', form:{dict:'ThToCn',keyWord:word}}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var bd1 = JSON.parse(body);
            //console.log(bd1);
            xx = bd1.data[0];
            if(!xx){
            }else{
                //console.log(bd1.data);
                //console.log(bd1.data[0].word);
                //console.log(bd1.data[0].explain);
                //console.log("\n\r\n\r");

                outarr[strmd5] = outarr[strmd5] + bd1.data[0].word + ' ' + bd1.data[0].explain + '<br>';
            }
            idx++;
            if(idx<words.length){
                getword(words,idx,servobj,strmd5);
            }else{
                servobj.writeHead('200',{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'x-requested-with,content-type','Content-Type': 'text/html;charset=utf-8'});
                servobj.end(outarr[strmd5]);
                delete outarr[strmd5];
                console.log(outarr);
            }
        }
    })
}


function getxx(str,servobj){
    var strmd5 = md5(str);
    outarr[strmd5] = '';
    var request = {
        ':method' : 'POST',  
        ':scheme' : 'https',  
        ':path' : '/ajax/processquery',
        ':authority': 'www.thai2english.com',
        'content-type' : 'application/x-www-form-urlencoded; charset=UTF-8',
    };

    const client = http2.connect('https://www.thai2english.com', {});
    client.on('error', (err) => console.error(err));
    client.on('socketError', (err) => console.error(err));

    var req = client.request(request);

    req.on('response', (headers, flags) => {
        for (const name in headers) {
            if(name === ':status') {
                //node.send({payload:`${name}: ${headers[name]}`});
            }
        }
    });

    req.setEncoding('utf8');

    let rdata = 'unspacedText='+str;
    let data = '';
    req.write(rdata);
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      //console.log(`\n${data}`);
        var result = JSON.parse(data).SpacedQuery;
        //console.log(result);
        outarr[strmd5] = outarr[strmd5] + result + '<br>';
        //console.log("\n\r\n\r");

        var words = result.split(' ');
        words = dedupe(words);
        //console.log(words);
        client.destroy();

        //words.forEach(function(word,idx){
        getword(words,0,servobj,strmd5);
        //});
    });
    req.end();

}



















//express_demo.js 文件
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var fs = require('fs');
var http = require('http');

// 创建 application/x-www-form-urlencoded 编码解析
var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.post('/thcn.do', urlencodedParser, function (req, res) {
	var str = req.body.wordstr;
    
    getxx(str,res);

});


app.use(express.static('public',{setHeaders: setCustomHeader}));
function setCustomHeader(res,path){
        res.append("Content-Type", express.static.mime.lookup(path)+";charset=utf-8");
}

var httpServer = http.createServer(app);
var PORT = 4000;
httpServer.listen(PORT, function() {
    console.log('HTTP Server is running on: http://localhost:%s', PORT);
});

