const UglifyJS = require("uglify-js");
const path = require('path');
const fs = require('fs/promises');
const pkg = require(path.resolve(process.cwd(), './package.json'));
const componentPath = pkg.name;
//const componentPath = "x_component_"+pkg.name.replace(/\./g, '_');
const componentName = componentPath.replace('x_component_', '').split('_').join('.');

function o2ComponentCompilerPlugin(options) {}

function includeMain(fileList, filter, extname){
    let list = fileList.filter((v)=>{
        return v.startsWith(filter) && path.extname(v)===extname;
    });
    if (list && list.length){
        list = list.map((css)=>{
            return `../${componentPath}/` + css;
        });
        return '"'+list.join('", "')+'"';
    }
    return '';
}
o2ComponentCompilerPlugin.prototype.apply = function(compiler) {
    compiler.plugin('emit', function(compilation, callback) {
        const fileList = Object.keys(compilation.assets);

        let mainFileContent = `o2.component("${componentName}", {\n`;

        const css = includeMain(fileList, 'static/css', '.css');
        if (css) mainFileContent += `    css: [${css}],\n`;

        const js = includeMain(fileList, 'static/js', '.js');
        if (js) mainFileContent += `    js: [${js}],\n`;

        mainFileContent += `});`;

        compilation.assets['Main.js'] = {
            source: ()=>{ return mainFileContent},
            size: ()=>{ return mainFileContent.length}
        };
        const miniMainFileContent = UglifyJS.minify(mainFileContent).code;
        compilation.assets['Main.min.js'] = {
            source: ()=>{ return miniMainFileContent},
            size: ()=>{ return miniMainFileContent.length}
        };

        const lpPath = path.resolve(process.cwd(), 'public/lp')
        const files = await fs.readdir(lpPath);
        for (const file of files){
            const lpContent = await fs.readFile(path.resolve(lpPath, file), {encoding: 'utf8'});
            const miniLpContent = UglifyJS.minify(lpContent).code;
            const name = path.basename(file, '.js')+'.min.js'
            compilation.assets["lp/"+name] = {
                source: ()=>{ return miniLpContent},
                size: ()=>{ return miniLpContent.length}
            };
        }

        callback();
    });
};
module.exports = o2ComponentCompilerPlugin;
