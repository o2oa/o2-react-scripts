const o2componentProxySetup = require('http-proxy-middleware');
const axios = require('axios');
const path = require('path');
const fs = require('fs/promises');

const p = path.resolve(process.cwd(), './o2.config.js');
const config = require(p);

const pkg = require(path.resolve(process.cwd(), './package.json'));

const componentPath = pkg.name;
const server = config.server;
const host = `${(server.https) ? 'https' : 'http'}://${server.host}/${(!server.httpPort || server.httpPort==='80') ? '' : server.httpPort}`;

const myproxy = o2componentProxySetup.createProxyMiddleware({
    target: host,
    changeOrigin: true,
    ws: true
});

module.exports = function(app) {
    app.use((req, res, next) => {
        if (req.url.startsWith('/x_desktop/res/config/config.json')){
            const configUrl = new URL(req.url, host);
            axios.get(configUrl.toString()).then((json)=>{
                let o2Config = json.data;
                o2Config.sessionStorageEnable = true;
                o2Config.applicationServer = {
                    "host": (config.appServer && config.appServer.host) ? config.appServer.host : server.host
                };
                o2Config.center = [{
                    "port": server.port,
                    "host": server.host
                }];
                o2Config.proxyApplicationEnable = false;
                o2Config.proxyCenterEnable = false;
                res.json(o2Config);
                next();
            }).catch(()=>{next()});

        }else if (req.url.indexOf(componentPath+'/lp')!==-1 && req.url.indexOf('min')!==-1) {

            let toUrl =  path.basename(req._parsedUrl.pathname).replace(/min\./, '')
            toUrl = path.resolve(process.cwd()+'\\public', './lp/'+toUrl);
            fs.readFile(toUrl).then((data)=>{
                res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
                res.send(data);
                next();
            }, ()=>{
                res.send('');
                next();
            });
        }else if(req.url.indexOf('/'+componentPath+'/')!==-1 ){
            req.url = req.url.replace('/'+componentPath+'/', '/');
            next()
        }else{
            next();
        }
    });
    app.use(
        ['^/o2_core', '^/o2_lib', '^/x_desktop', '^/x_component_*', '!^/'+componentPath],
        myproxy
    );
};
