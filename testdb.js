var md5 = require('md5');

var outarr = new Array();

const http2 = require('http2');
var h1req = require('request');

var mysql      = require('mysql');







function dedupe(array){
 return Array.from(new Set(array));
}


function getword(words,idx,servobj,strmd5){
    word = words[idx];
    //console.log('>>'+word);

    cb_getwordr = function(obj,flag){
        if(flag == 0){
            connection.end();
            cb_next('','');
        }else{

            if(obj[0].id == 28162){ //先跳过这个，原因未知
                connection.end();
                cb_next('','');
            }else{
            
            var  addSql = 'INSERT INTO thaidic(id,word,`explain`,examp,pronu,thesaurus) VALUES(?,?,?,?,?,?)';
            var  addSqlParams = [obj[0].id,obj[0].word,obj[0].explain,JSON.stringify(obj[0].examp),obj[0].pronu,JSON.stringify(obj[0].thesaurus)];
            //console.log(addSqlParams);
            //var  addSqlParams = [obj[0].id,obj[0].word,obj[0].explain,obj[0].examp.toString(),obj[0].pronu,obj[0].thesaurus.toString()];
            connection.query(addSql,addSqlParams,function (err, result) {
                if(err){
                    console.log('[INSERT ERROR] - ',err.message);
                    return;
                }     
                console.log('IN---------------------> [ DB ]',);        
                //console.log('INSERT ID:',result);        
            });


            connection.end();
            //bd1.data[0].word + ' ' + bd1.data[0].explain
            cb_next(obj[0].word,obj[0].explain);
            }
        }
    };

    cb_next = function(word,explain){
        outarr[strmd5] = outarr[strmd5] + word + ' ' + explain + '<br>';
        idx++;
        if(idx<words.length){
            getword(words,idx,servobj,strmd5);
        }else{
            servobj.writeHead('200',{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'x-requested-with,content-type','Content-Type': 'text/html;charset=utf-8'});
            var tmp = outarr[strmd5];
            delete outarr[strmd5];
            console.log('end-----------------');
            return servobj.end(tmp);
        }
    };

    var connection = mysql.createConnection({
      host     : '172.20.3.194',
      user     : 'dev',
      password : 'dev',
      database : 'test_loc',
      charset  : 'utf8mb4'
    });
    connection.connect();
    connection.query("SELECT * from thaidic where word = '"+word+"'", function (error, results, fields) {
        if (error) throw error;
        //console.log('The solution is: ',  results.length );
        //如果没有查询到则调用远程查询
        if(results.length == 0){
            //console.log('remote');
            console.log('R>'+word);
            getwordr(word,cb_getwordr);
        }else{
            console.log('M>'+word);
            connection.end();
            cb_next(word,results[0].explain);
        }
        //connection.end();
    }); 
}

function getwordr(word,callback){
    //console.log(word+'-------------------');
    h1req.post({
		url:'https://dmfy.emindsoft.com.cn/mobile/queryByWord.do',
		headers: {
			'version': '2.8.2',
			'locale': 'zh',
			'platform': 'iOS',
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': 'YMTranslateCloudUser/2.8 (iPhone; iOS 10.3.3; Scale/2.00)'
    	},
	   	form:{dict:'ThToCn',keyWord:word}
	}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var bd1 = JSON.parse(body);
            //console.log(bd1);
            xx = bd1.data[0];
            if(!xx){
                console.log('ER----------> [ ER ]'+word);
                callback(bd1.data,0);
            }else{
                //console.log(bd1.data);

                //outarr[strmd5] = outarr[strmd5] + bd1.data[0].word + ' ' + bd1.data[0].explain + '<br>';
                callback(bd1.data,1);
                //console.log(word+bd1.data[0].explain);
            }

        }
    })
}

var isJSON = function(str) {
    if (typeof str == 'string') {
        try {
            var obj=JSON.parse(str);
            if(typeof obj == 'object' && obj ){
                return true;
            }else{
                return false;
            }

        } catch(e) {
            console.log('error：'+str+'!!!'+e);
            return false;
        }
    }
    console.log('It is not a string!'+str);
}

var excludeSpecial = function(s) {
    // 去掉转义字符
    s = s.replace(/[\'\"\\\/\b\f\n\r\t]/g, '');
    // 去掉特殊字符
    s = s.replace(/[\@\#\$\%\^\&\*\{\}\:\"\L\<\>\?\(\)]/g,'');
    // 去掉英文
    s = s.replace(/[a-zA-Z0-9\,]/g,'');
    // 去掉中文
    s = s.replace(/[\u4e00-\u9fa5]/g,'');
    // 去掉中文标点
    s = s.replace(/[\uff1a\uff1b\uff0c\u3002\u201c\u201d\uff01\u002e\u005b\u005d\uff08\uff09]/g,''); 
    return s;
 };

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
        if(isJSON(data)){
            var result = JSON.parse(data).SpacedQuery;
            var wordmore = JSON.parse(data).Sentences[0].WordObjects;
            //console.log(result);
            outarr[strmd5] = outarr[strmd5] + result + '<br>';
            //console.log("\n\r\n\r");

            var words = result.split(' ');
            words = dedupe(words);
            //console.log(words);
            client.destroy();

            //处理词组
            for(var p in wordmore){//遍历json对象的每个key/value对,p为key
                //console.log(wordmore[p]);
                words.push(wordmore[p].Word);
            }
            words = dedupe(words);

            //words.forEach(function(word,idx){
            getword(words,0,servobj,strmd5);
            //});
        }else{
            return servobj.end();
            //return false;
        }
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
	var str = excludeSpecial(req.body.wordstr);
    console.log(str);
    
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

