// doT12.js
// 2011-2014, Laura Doktorova
// 2013-2017, modified by spmbt0 ({{@}}-iterator in objects with conditions) https://github.com/spmbt/doT
// Licensed under the MIT license.

(function(dS, _globals, doT){
	"use strict";
	/* global define: false, module: false */
	/*jshint unused:true, eqnull:true, evil:true, laxcomma:true, laxbreak:true */
doT['templateSettings'] = dS;
dS['globalName'] ='doT';
doT ={version:'1.2.1'};

if(typeof module !='undefined'&& module['exports'])
	module['exports'] = doT;
else if(typeof define =='function' && define['amd'])
	define(function(){return doT;});
else
	_globals[dS['globalName']] = doT;

doT.compile = function(tmpl, def){return doT.template(tmpl, null, def)}; //for express
doT.template = function(tmpl, c, def){
	c = c || dS;
	var sid =0
		,toEncHtm
		,str = (c['useDef']? resolveDefs(c, tmpl, def ||{}) : tmpl) ||'' //+5% of time
		,skip = /$^/;
	str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g,' ') //+2% of time
			.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,''): str)
		.replace(/'|\\/g,'\\$&') //escape "'" and "\"
		.replace(c.conditional || skip, function(m, els, code){ // {{?expr}}ifTxt [{{??[expr]}}[if-]elseTxt] {{?}}
			return els ?
				(code ? "'}else if("+ unescape(code) +"){out+='" : "'}else{out+='") :
				(code ? "';if("+ unescape(code) +"){out+='" : "'}out+='");
		})
		.replace(c.iterate || skip, function(m, op, iterate, vname, iname, cond){ //~|@ m, arr|{}, val,indx,[expr]
			if(!(iterate || vname || iname)) return "'} } out+='";
			sid++; iname = iname ||'i'+ sid; iterate = unescape(iterate || c.varname);
			var v1 = 'var '+ (vname = vname ||'arrI'+ sid)
				,iph='=arr'+ sid +'['+ iname +'];if('+ (cond ? unescape(cond):1) +'){';
			return "';var arr"+ sid +'='+ iterate +';'
				+(op=='~'?
					v1 +',' +iname +'=-1,l'+ sid +'=arr'+ sid
					+'.length-1;while('+ iname +'++<l'+ sid +'){'+vname +iph
				:
					'for(var '+ iname+' in arr'+ sid +'){'+ v1 +iph
				)+"out+='";
		})
		.replace(c.valEncEval || skip, function(m, op, code){ // =|! expr -- interpolate or encode
			toEncHtm = toEncHtm || op =='!';
			return cse['('+ op] + unescape(code) + cse[')'+ op];
		})+ "';return out;")
	.replace(/\n/g,'\\n').replace(/\t/g,'\\t').replace(/\r/g,'\\r')
	.replace(/(\s|;|\}|^|\{)out\+='';/g,'$1');
	try{
		return new Function(c.varname, str = (toEncHtm ? doT.encHtm(!dS.selfcontained) :'')+ str);
	}catch(er){
		if(typeof console !='undefined') console.log('Could not create a template function: '+ str);
		throw er}
};
var encHt = '_'+ dS['globalName'] + doT.version.replace(/\./g,''); //temporary global function for encode HTML symbols
doT.encHtm = function(nH){return('var encodeHTML=typeof '+ encHt +'!="undefined"?'+ encHt +':'+(nH ?'function(){'
	:'function(c){return((c||"")+"").replace('+(dS.doNotSkipEncoded ?'/[&<>"\'\\/]/g':'/&(?!#?\\+;)|[<>"\'/]/g')
	+',function(s){return{"&":"&#38;","<":"&#60;",">":"&#62;",\'"\':"&#34;","\'":"&#39;","/":"&#47;"}[s]||s})')+'};')};

var cse = dS.append ?{'(=':"'+(", '(!':"'+encodeHTML(", '(':"';", ')=':")+'",  ')!':")+'",   ')':";out+='"}
	:{'(=':"';out+=(", '(!':';out+=encodeHTML(', '(':"';", ')=':");out+='", ')!':");out+='", ')':";out+='"}
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
		}});
		var v = new Function('def','return '+ code)(def);
		return v ? resolveDefs(c, v, def) : v;
	});
}}
,unescape = function(code){
	return code.replace(/\\('|\\)/g,'$1').replace(/[\n\t\r]/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>'); //Chrome <,>
};
if(!dS.selfcontained)
	_globals[encHt] = new Function(doT.encHtm().replace(/.+?(?!:)fu/,'return fu'))();

/* for Google Closure Compiler Minificator in Advanced mode: open this code for compiling
doT['template']=doT.template;
dS['varname']=dS.varname;
dS['valEncEval']=dS.valEncEval;
dS['useParams']=dS.useParams;
dS['defineParams']=dS.defineParams;
dS['conditional']=dS.conditional;
dS['iterate']=dS.iterate;
dS['strip']=dS.strip;
dS['selfcontained']=dS.selfcontained;
dS['doNotSkipEncoded']=dS.doNotSkipEncoded;/* */

}({
	varname:    'it', // name of the first argument of doT.template()(varname)
	doNotSkipEncoded: false, //Do not show values of encoded characters of the & ...; format
	selfcontained: false, // Self-sufficient, not need global definition of _encodeHTML()
	valEncEval:  /\{\{([=!]?)([\s\S]+?(\}?)+)\}\}/g, //{{=.+}} | {{!.+}} | {{.+}}
	use:         /\{\{#([\s\S]+?)\}\}/g, //{{#.+}}
	useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
	define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
	'useDef':      /\{\{##?([\s\S]+?)\}\}/g, //-1% of time than c.use ||c.define
	defineParams:/^\s*([\w$]+):([\s\S]+)/, // .+:.+
	conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g, //{{? .* }}
	iterate:     /\{\{([~@])\s*(?:\}\}|(\{[\s\S]+?\}|.*?)\s*(?:\:\s*([\w$]*)\s*(?:\:\s*([\w$]*))?\s*\:?((?:[^}]|\}(?!\}))*)\s*)?\}\})/g, //{{~.*:.*:.*:.*}}
	strip:      false, //remove spaces, tabs, newlines
	append:     true //or split of concatenation - style of function
},/* jshint ignore:start */ (function(){return this || (0,eval)('this')})() /* jshint ignore:end */,{}));
