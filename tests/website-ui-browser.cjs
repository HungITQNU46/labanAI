'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const before = process.argv.includes('--before');
const origin = 'http://127.0.0.1:3000';
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync);
class Cdp {
    constructor(url) {
        this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
        this.ready = new Promise((resolve,reject) => { this.socket.addEventListener('open',resolve,{once:true}); this.socket.addEventListener('error',reject,{once:true}); });
        this.socket.addEventListener('message',({data}) => {
            const message = JSON.parse(data), pending = this.pending.get(message.id);
            if (message.method === 'Runtime.exceptionThrown') this.errors.push('JavaScript exception');
            if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') this.errors.push('console.error');
            if (!pending) return;
            this.pending.delete(message.id); clearTimeout(pending.timer);
            message.error ? pending.reject(Error(message.error.message)) : pending.resolve(message.result || {});
        });
    }
    async call(method, params = {}) {
        await this.ready; const id = ++this.id;
        return new Promise((resolve,reject) => {
            const timer = setTimeout(() => {this.pending.delete(id);reject(Error('CDP timeout'));},20000);
            this.pending.set(id,{resolve,reject,timer});this.socket.send(JSON.stringify({id,method,params}));
        });
    }
}
async function main() {
    assert.ok(chrome, 'Chrome or Edge must be installed');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(),'labanai-ui-audit-'));
    const browser = spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
    let cdp;
    try {
        const active = path.join(profile,'DevToolsActivePort');
        for(let i=0;i<200&&!fs.existsSync(active);i++)await pause(100);
        assert.ok(fs.existsSync(active),'Browser exposes CDP');
        const port = Number(fs.readFileSync(active,'utf8').split(/\r?\n/)[0]);
        const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
        cdp = new Cdp(target.webSocketDebuggerUrl);
        await cdp.call('Page.enable');await cdp.call('Runtime.enable');
        const evaluate = async expression => {const r=await cdp.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
        const wait = async expression => {for(let i=0;i<200;i++){if(await evaluate(expression))return;await pause(100);}throw Error('Page not ready');};
        const pages = [['home','/'],['evaluation','/evaluation'],['news','/news'],['guide','/guide'],['about','/about'],['chatbot','/chatbot']];
        for(const [name,pathname] of pages){
            const response=await fetch(origin+pathname);assert.equal(response.status,200,pathname);
            await cdp.call('Page.navigate',{url:origin+pathname});
            await wait("document.readyState==='complete' && Boolean(document.querySelector('#layout-container header'))");
            if(name==='evaluation')await wait("document.querySelectorAll('#questions-list > div').length===27");
            for(const width of before?[1440]:[1440,768,375,320]){
                await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
                await evaluate('window.scrollTo(0,0)');await pause(300);
                if(!before){
                    const visible=await evaluate('document.body.innerText');
                    assert.ok(!/RESEARCH_ONLY|TOP3_NOT_VALIDATED|research_status|BẢN THỬ NGHIỆM NỘI BỘ|Cảnh báo phạm vi nghiên cứu|Hướng B — RIASEC27/i.test(visible),name+' hides internal status');
                    assert.equal(await evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth'),false,`${name} ${width}px overflow`);
                    if(width<1024){
                        await evaluate("document.getElementById('site-menu-toggle').click()");
                        assert.equal(await evaluate("document.getElementById('site-menu-toggle').getAttribute('aria-expanded')"),'true');
                        for(const href of ['/','/evaluation','/news','/guide','/about','/chatbot'])assert.ok(await evaluate(`Boolean(document.querySelector('#site-mobile-menu a[href="${href}"]'))`));
                        await evaluate("document.getElementById('site-menu-toggle').click()");
                    }
                }
                if(width===1440 || (!before && width===375)){
                    const screenshot=await cdp.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
                    const file=path.join(os.tmpdir(),`labanai-ui-${before?'before':'after'}-${name}-${width}-${Date.now()}.png`);
                    fs.writeFileSync(file,Buffer.from(screenshot.data,'base64'));console.log('SCREENSHOT',JSON.stringify({page:name,width,path:file}));
                }
            }
            if(!before && name==='news')assert.ok(await evaluate("Boolean(document.querySelector('[data-news-empty]') || document.getElementById('articles-feed-grid'))"));
            if(!before && name==='evaluation'){
                assert.equal(await evaluate("document.querySelectorAll('main > section').length"),2);
                assert.ok(await evaluate("document.getElementById('result-reference-note').textContent.includes('Kết quả mang tính tham khảo, không thay thế tư vấn hướng nghiệp.')"));
            }
            if(!before && name==='chatbot')assert.ok(await evaluate("document.getElementById('chat-demo-note').textContent.includes('minh họa')"));
            console.log('PASS',pathname,before?'before capture':'desktop/tablet/mobile and navigation');
        }
        assert.deepEqual(cdp.errors, [], 'No JavaScript or console.error on any page');
        console.log(before?'BEFORE_CAPTURE_COMPLETE':'ALL_WEBSITE_UI_BROWSER_TESTS_PASS');
    } finally {
        if(cdp)cdp.socket.close();browser.kill();await Promise.race([once(browser,'exit').catch(()=>{}),pause(3000)]);
        const target=path.resolve(profile),tmp=path.resolve(os.tmpdir());
        if(path.dirname(target)===tmp&&path.basename(target).startsWith('labanai-ui-audit-'))try{fs.rmSync(target,{recursive:true,force:true});}catch{}
    }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
