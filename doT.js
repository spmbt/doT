// doT.js
// 2011, Laura Doktorova, https://github.com/olado/doT
// 2013-2017, modified by spmbt0 (iterHash iterator in objects with conditions)
// Licensed under the MIT license.

(function(){
	"use strict";
	/* global define: false, module: false */
	/*jshint unused:true, eqnull:true, evil:true, laxcomma:true, laxbreak:true */
var doT ={version:'1.2.1'
        ,templateSettings: {
            globalName:'doTmin',
            valEncEval:  /\{\{([=!]?)([\s\S]+?(\}?)+)\}\}/g, //{{=.+}} | {{!.+}} | {{.+}}
            use:         /\{\{#([\s\S]+?)\}\}/g, //{{#.+}}
            useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
            define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
            defineParams:/^\s*([\w$]+):([\s\S]+)/, // .+:.+
            conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g, //{{? .* }}
            iterate:     /\{\{~\s*(?:\}\}|(\{[\s\S]+?\}|.*?)\s*(?:\:\s*([\w$]*)\s*(?:\:\s*([\w$]*))?\s*)?\}\})/g, //{{~.*:.*:.*}}
            iterHash:    /\{\{@\s*(?:\}\}|(\{[\s\S]+?\}|.*?)\s*(?:\:\s*([\w$]*)\s*(?:\:\s*([\w$]*))?\s*\:?((?:[^}]|\}(?!\}))*)\s*)?\}\})/g, //{{@.*:.*:.*:.*}}
            varname:	'it',
            strip:		!true, //remove spaces, tabs, newlines
            append:		true //or split of concatenation - style of function
            ,useGlobalEncode: true
            ,selfcontained: false
            ,doNotSkipEncoded: false
        }
}, /* jshint ignore:start */ _globals = (function(){ return this || (0,eval)('this'); }()) /* jshint ignore:end */
,dS = doT.templateSettings;

if(typeof module !='undefined'&& module.exports)
	module.exports = doT;
else if(typeof define =='function' && define.amd)
	define(function(){return doT;});
else
    _globals[dS.globalName] = doT;

var d2={
    compile: function(tmpl, def){ //for express
		return doT.template(tmpl, null, def);
	},
	template: function(tmpl, c, def){
		c = c || dS;
		var needhtmlencode
			,sid =0
			,indv
			,str = (c.use || c.define ? resolveDefs(c, tmpl, def ||{}) : tmpl) ||''
			,skip = /$^/;
		str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g,' ')
					.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,''): str)
				.replace(/'|\\/g,'\\$&') //escape "'" and "\"
				.replace(c.conditional || skip, function(m, elsecase, code){ // {{?expr}}if-text{{?}} | {{?expr}}if-text1{{??}}else-text2{{?}}
					return elsecase ?
						(code ? "'}else if("+ unescape(code) +"){out+='" : "'}else{out+='") :
						(code ? "';if("+ unescape(code) +"){out+='" : "'}out+='");
				})
				.replace(c.iterate || skip, function(m, iterate, vname, iname){ // ~
					if(!(iterate || vname || iname)) return "';} } out+='";
                    iterate = iterate || c.varname;
					sid++; indv = iname ||'i'+ sid; iterate = unescape(iterate);
					return "';var arr"+ sid +'='+ iterate +';if(arr'+ sid +'){var '+ (vname = vname ||'arrI'+ sid) +','
						+indv +'=-1,l'+ sid +'=arr'+ sid +'.length-1;while('+ indv +'<l'+ sid +'){'+ vname +'=arr'+ sid
						+'[++'+ indv +"];out+='";
				})
				.replace(c.iterHash || skip, function(m, iterHash, vname, iname, cond){ // @ m, hash, value, index, [value] part of expression (== condition)
					if(!(iterHash || vname || iname)) return "';} } out+='";
					iterHash = iterHash || c.varname;
					sid++; indv = iname ||'i'+ sid; iterHash = unescape(iterHash);
					return "';var arr"+ sid +'='+ iterHash +';if(arr'+ sid +')for(var '+ indv +' in arr'+ sid +'){var '
						+(vname = vname ||'arrI'+ sid) +'=arr'+ sid +'['+ indv +'];if('+ (cond ? vname :1)
						+unescape(cond||'') +"){out+='";
				})
				.replace(c.valEncEval || skip, function(m, op, code){ // =|! expr -- interpolate or encode
					needhtmlencode = op =='!';
					return cse['('+ op] + unescape(code) + cse[')'+ op];
				})+ "';return out;")
			.replace(/([\n\t\r])/g,'\\$1')
			.replace(/\+''|(\s|;|\}|^|\{)(out\+='';|(out\+=)''\+)/g,'$1$3');
            //.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+='); TODO в 1.1.1 это отменили, что входит выше
		try{
			return new Function(c.varname, str = (needhtmlencode ? doT.encHtmlStr :'')+ str );
		}catch(er){
			if(typeof console !='undefined') console.log('Could not create a template function: '+ str);
			throw er;
		}
	} //fn, compile template
	,encHtmlStr:'var encodeHTML=(function(encRules, r){return function(a){return a.replace(r, function(m){return encRules[m]})} })({"&":"&#38;","<":"&#60;",">":"&#62;","\\"":"&#34;","\'":"&#39;","/":"&#47;"},'+ (dS.doNotSkipEncoded ?'/[&<>"\'\\/]/g':'/&(?!#?\\w+;)|[<>"\'/]/g);')
};
for(var i in d2) doT[i] = d2[i];

var glob = (dS.useGlobalEncode ? dS.globalName +'.':'')+ 'encodeHTML('
,startend = {
	append: {'(=':"'+(",      '(!':"'+"+ glob,     '(':"';", ')=':")+'",      ')!':")+'",      ')':";out+='"}
	,split: {'(=':"';out+=(", '(!':";out+="+ glob, '(':"';", ')=':");out+='", ')!':");out+='", ')':";out+='"}
}
,cse = dS.append ? startend.append : startend.split
,resolveDefs = function(c, block, def){ if(block !=null){
	return (block +'').replace(c.define || skip, function(m, code, assign, value){
		if(!code.indexOf('def.')) // jshint ignore:line
			code = code.substring(4);
		if(!(code in def)){
			if(assign ==':'){
				if(c.defineParams) value.replace(c.defineParams, function(m, param, v){
					def[code] = {arg: param, text: v};
				});
				if(!(code in def)) def[code] = value;
			}else
				new Function('def',"def['"+code+"']="+ value)(def);
		}
		return '';
	})
	.replace(c.use || skip, function(m, code){
		if(c.useParams) code = code.replace(c.useParams, function(m, s, d, param){
			if(def[d] && def[d].arg && param){
				var rw = unescape((d +':'+ param).replace(/'|\\/g,'_'));
				def.__exp = def.__exp ||{};
				def.__exp[rw] = def[d].text.replace(RegExp('(^|[^\\w$])'+ def[d].arg +'([^\\w$])','g'),'$1'+ param +'$2');
				return s +"def.__exp['"+ rw +"']";
			}
		});
		var v = new Function('def','return '+ code)(def);
		return v ? resolveDefs(c, v, def) : v;
	});
}}
,unescape = function(code){
	return code.replace(/\\('|\\)/g,'$1').replace(/[\n\t\r]/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>'); //Chrome <,>
};
if(dS.useGlobalEncode){doT.encodeHTML = new Function(doT.encHtmlStr); doT.encHtmlStr =''}

/* for Google Closure Compiler Minificator in Advanced mode
doT['templateSettings']=doT.templateSettings;
doT['compile']=doT.compile;
doT['template']=doT.template;
doT['encodeHTML']=doT.encodeHTML;
doT['version']=doT.version;
dS['globalName']=dS.globalName;
dS['valEncEval']=dS.valEncEval;
dS['use']=dS.use;
dS['useParams']=dS.useParams;
dS['define']=dS.define;
dS['defineParams']=dS.defineParams;
dS['conditional']=dS.conditional;
dS['iterate']=dS.iterate;
dS['iterHash']=dS.iterHash;
dS['varname']=dS.varname;
dS['strip']=dS.strip;
dS['append']=dS.append;
dS['useGlobalEncode']=dS.useGlobalEncode;
dS['selfcontained']=dS.selfcontained;
dS['doNotSkipEncoded']=dS.doNotSkipEncoded;/* */

}());
