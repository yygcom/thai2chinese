process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var md5 = require('md5');

var outarr = new Array();

var fmtarr = new Array();

const http2 = require('http2');
var h1req = require('request');

var mysql = require('mysql');

var dbconfig = {
    host     : 'localhost',
    user     : 'test',
    password : 'test',
    database : 'test',
    charset  : 'utf8mb4'
};
var versioninfo = '程序版本: 1.0.3.2 [20180720.1]<br>';
//connection.connect();
//var connection = mysql.createConnection(dbconfig);

function handleError (err) {
    if (err) {
        // 如果是连接断开，自动重新连接
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            connect();
        } else {
            console.error(err.stack || err);
        }
    }
}

var connection;

// 连接数据库
function connect () {
    connection = mysql.createConnection(dbconfig);
    connection.connect(handleError);
    connection.on('error', handleError);
}

//var connection = connect();
connect();






function dedupe(array){
    return Array.from(new Set(array));
}


function getword(words,idx,servobj,strmd5){
    word = words[idx];
    //console.log('>>'+word);

    cb_getwordr = function(obj,flag){
        if(flag == 0){
            //connection.end();
            if(fmtarr[strmd5] === 3){
                cb_next('【'+obj+'】 未查询到结果',"\n");
            }else{
                cb_next('<span style="color:red;">【'+obj+'】 未查询到结果</span>','');
            }
        }else{

            if(obj[0].id == 28162){ //先跳过这个，原因未知
                //connection.end();

                cb_next('','');
            }else{
                var wordexplain = '';
                obj.map(function(value, index, array) {

                    var pronu = obj[index].pronu != '' ? '【'+obj[index].pronu+'】' : '';
                    wordexplain = wordexplain+pronu+obj[index].explain+'&nbsp;';

                    var  addSql = 'INSERT INTO thaidic(id,word,`explain`,examp,pronu,thesaurus) VALUES(?,?,?,?,?,?)';
                    var  addSqlParams = [obj[index].id,obj[index].word,obj[index].explain,JSON.stringify(obj[index].examp),obj[index].pronu,JSON.stringify(obj[index].thesaurus)];
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


                });
                

                //connection.end();
                //bd1.data[0].word + ' ' + bd1.data[0].explain
                //cb_next(obj[0].word,obj[0].explain);
                cb_next(obj[0].word,wordexplain);
            }
        }
    };

    cb_next = function(word,explain){
        if(fmtarr[strmd5] === 1){
            outarr[strmd5] = outarr[strmd5] + '<span style="font-size:1.2em;color:#139313;">' + word + '</span> ' + explain + '<br>';
        }
        if(fmtarr[strmd5] === 2){
            outarr[strmd5] = outarr[strmd5] + word + '####' + explain + '<br>';
        }
        if(fmtarr[strmd5] === 3){
            outarr[strmd5] = outarr[strmd5] + word + ' ' + explain + "\n";
        }
        idx++;
        if(idx<words.length){
            getword(words,idx,servobj,strmd5);
        }else{
            //servobj.writeHead('200',{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'x-requested-with,content-type','Content-Type': 'text/html;charset=utf-8'});
            var tmp = outarr[strmd5];
            delete outarr[strmd5];
            delete fmtarr[strmd5];
            console.log('end-----------------');
            //servobj.header("Access-Control-Allow-Origin", "*");
            try{
            	return servobj.header("Access-Control-Allow-Origin", "*").end(tmp);
            }
            catch(err){
                console.log(err);
            }
            //return servobj.end(tmp);
        }
    };

    connection.query("SELECT * from thaidic where word = '"+word+"'", function (error, results, fields) {
        console.log(error);
        if (error) throw error;
        //console.log('The solution is: ',  results.length );
        //如果没有查询到则调用远程查询
        if(results.length == 0){
            if(word == '&middot;'){
                console.log('...');
                cb_next('','');   
            }else{
                //console.log('remote');
                console.log('R>'+word);
                getwordr(word,cb_getwordr);
                //cb_next(word,'<span style="color:red">远端服务器故障，暂无结果</span>');
            }
        }else{
            console.log('M>'+word);
	    //console.log(results);
            //connection.end();
            if(word == ''){
                cb_next('[]','查无结果');
            }else{
                var wordexplain = '';
                results.map(function(value, index, array) {
                    console.log(strmd5);
                    if(fmtarr[strmd5] === 1){
                        var pronu = results[index].pronu != '' && results[index].pronu != null ? '【'+results[index].pronu+'】' : '';
                        wordexplain = wordexplain+pronu+results[index].explain+'&nbsp;';


			//console.log(results[index].examp.length);
                        if(results[index].examp != '[]' && results[index].examp.length >2){
				var tox = JSON.parse(results[index].examp);
				var toxo = '';
                                wordexplain += "<br><span style='color:#e66303'>[例句]</span><br>";
				for(var toxi = 0;toxi < tox.length;toxi++){
					wordexplain += tox[toxi] + "<br>";
				}
                        }





                    }
                    if(fmtarr[strmd5] === 2){
                        wordexplain = wordexplain+results[index].explain+'&nbsp;';
                    }
                    if(fmtarr[strmd5] === 3){
                        wordexplain = wordexplain+results[index].explain+' ';
                    }
                });

                //cb_next(word,results[0].explain);
                cb_next(word,wordexplain);
            }
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
            'Content-Type': 'application/x-for-mpurlencoded',
            'User-Agent': 'YMTranslateCloudUser/2.8 (iPhone; iOS 10.3.3; Scale/2.00)'
        },
        form:{dict:'ThToCn',keyWord:word}
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var bd1 = JSON.parse(body);
            //console.log(bd1.data.length);
            xx = bd1.data[0];
            if(!xx){
                console.log('ER----------> [ ER ]'+word);
                callback(word,0);
            }else{
                //console.log(bd1.data);

                //outarr[strmd5] = outarr[strmd5] + bd1.data[0].word + ' ' + bd1.data[0].explain + '<br>';
                callback(bd1.data,1);
                //console.log(word+bd1.data[0].explain);
            }

        }else{
		console.log(error);
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

function getxx(str,servobj,fmtx){
    var strmd5 = md5(str);
    outarr[strmd5] = versioninfo;
    fmtarr[strmd5] = fmtx;
    var request = {
        ':method' : 'POST',  
        ':scheme' : 'https',  
        ':path' : '/ajax/processquery',
        ':authority': 'old.thai2english.com',
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
            // 处理少于10 字符的词
            if( str.length <= 10) words.push(str.trim());
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








function getxxxn(str,servobj){
    var strmd5 = md5(str)+Math.floor(Math.random()*100+1);
    outarr[strmd5] = versioninfo;
    fmtarr[strmd5] = 2;

    words = str.split(/\n/);

    getword(words,0,servobj,strmd5);
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

    getxx(str,res,1);

});

app.post('/thcnfmx3.do', urlencodedParser, function (req, res) {
    var str = excludeSpecial(req.body.wordstr);
    console.log(str);
    versioninfo = '';
    getxx(str,res,3);

});

app.post('/thcnxn.do', urlencodedParser, function (req, res) {
    var str = req.body.wordstr;
    console.log(str);

    getxxxn(str,res);

});

app.get('/getnum.do',function(req,res){
    connection.query("SELECT SQL_CALC_FOUND_ROWS id FROM `thaidic` LIMIT 1;", function (error, results, fields) {
        console.log(error);
        if (error) throw error;
        //console.log('The solution is: ',  results.length );
        //如果没有查询到则调用远程查询
        connection.query("SELECT FOUND_ROWS() AS rowcount;", function (error, results, fields) {
            console.log(error);
            if (error) throw error;
            //console.log('The solution is: ',  results.length );
            //如果没有查询到则调用远程查询
            if(results.length == 0){
            }else{
                //console.log(results);
                return res.header("Access-Control-Allow-Origin", "*").end(results[0]['rowcount'].toString());
            }
        });

    });

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

