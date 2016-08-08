import fs from 'fs';
import path from 'path';

import gulp from 'gulp';

// Load all gulp plugins automatically
// and attach them to the `plugins` object
import plugins from 'gulp-load-plugins';

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
import runSequence from 'run-sequence';

import archiver from 'archiver';
import glob from 'glob';
import del from 'del';

import pkg from './package.json';

const dirs = pkg['h5bp-configs'].directories;

var isDev = true;
// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('archive:create_archive_dir', () => {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', (done) => {

    const archiveName = path.resolve(dirs.archive, `${pkg.name}_v${pkg.version}.zip`);
    const zip = archiver('zip');
    const files = glob.sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    const output = fs.createWriteStream(archiveName);

    zip.on('error', (error) => {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach((file) => {

        const filePath = path.resolve(dirs.dist, file);

        // `zip.bulk` does not maintain the file
        // permissions, so we need to add files individually
        zip.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath).mode
        });

    });

    zip.pipe(output);
    zip.finalize();

});

gulp.task('clean', (done) => {
    del([
        dirs.archive,
        dirs.dist
    ]).then(() => {
        done();
    });
});
//int:js
gulp.task('lint:js', () =>
    gulp.src([
        'gulpfile.js',
        `${dirs.src}/js/*.js`,
        `${dirs.test}/*.js`
    ]).pipe(plugins().jscs())
        .pipe(plugins().jshint())
        .pipe(plugins().jshint.reporter('jshint-stylish'))
        .pipe(plugins().jshint.reporter('fail'))
);
//copy
gulp.task('copy', [
    'copy:.htaccess',
    // 'copy:jquery',
    'copy:license',
    'copy:misc',
    // 'copy:normalize'
]);
//copy:.htaccess
gulp.task('copy:.htaccess', () =>
    gulp.src('node_modules/apache-server-configs/dist/.htaccess')
        .pipe(plugins().replace(/# ErrorDocument/g, 'ErrorDocument'))
        .pipe(gulp.dest(dirs.dist))
);

// gulp.task('copy:jquery', () =>
//     gulp.src(['node_modules/jquery/dist/jquery.min.js'])
//         .pipe(plugins().rename(`jquery-${pkg.devDependencies.jquery}.min.js`))
//         .pipe(gulp.dest(`${dirs.src}/js/vendor`))
// );

// gulp.task('copy:normalize', () =>
//     gulp.src('node_modules/normalize.css/normalize.css')
//         .pipe(gulp.src(`${dirs.src}/css`))
// );

//copy:license
gulp.task('copy:license', () =>
    gulp.src('LICENSE.txt')
        .pipe(gulp.dest(dirs.dist))
);

//copy:misc
gulp.task('copy:misc', () =>
    gulp.src([

        // Copy all files
        `${dirs.src}/**/*`,

        // Exclude the following files
        // (other tasks will handle the copying of these files)
        `!${dirs.src}/img/**/*`,
        `!${dirs.src}/css/**/*`,
        `!${dirs.src}/js/**/*`,
        `!${dirs.src}/**/*.html`

    ], {

            // Include hidden files by default
            dot: true

        }).pipe(gulp.dest(dirs.dist))
);


//js:copy
gulp.task('js:copy', () =>
    gulp.src(`${dirs.src}/js/**`)
        .pipe(gulp.dest(`${dirs.dist}/js`))
);
//js:rev
gulp.task('js:rev', () =>
    gulp.src(`${dirs.dist}/js/**`)
        .pipe(plugins().rev())
        .pipe(plugins().rev.manifest())
        .pipe(gulp.dest(`${dirs.dist}/js`))
);


//compile:less
gulp.task('compile:less', () =>
    gulp.src(`${dirs.src}/css/less/*.less`)
        .pipe(plugins().less())
        .pipe(gulp.dest(`${dirs.src}/css`))
);
//compile:sass
gulp.task('compile:sass', () =>
    gulp.src(`${dirs.src}/css/sass/*.scss`)
        .pipe(plugins().sass())
        .pipe(gulp.dest(`${dirs.src}/css`))
);

//css:copy
gulp.task('css:copy', () => {
    const cssFilter = plugins().filter(`${dirs.src}/css/**/*.css`);
    return gulp.src(`${dirs.src}/css/**`)
        .pipe(cssFilter)
        .pipe(gulp.dest(`${dirs.dist}/css`))
}
);

//css:autoprefixer
gulp.task('css:autoprefixer', () =>
    gulp.src(`${dirs.dist}/css/**`)
        .pipe(plugins().autoprefixer({
            browsers: ['last 2 versions', 'ie >= 8', '> 1%'],
            cascade: false
        }))
        .pipe(gulp.dest(`${dirs.dist}/css`))
);

//css:rev
gulp.task('css:rev', () =>
    gulp.src(`${dirs.dist}/css/**`)
        .pipe(plugins().rev())
        .pipe(plugins().rev.manifest())
        .pipe(gulp.dest(`${dirs.dist}/css`))
);


//font:copy
gulp.task('font:copy', () =>
    gulp.src(`${dirs.src}/fonts/*`)
        .pipe(gulp.dest(`${dirs.dist}/fonts`))

);

//font:rev//Fonts & Images 根据MD5获取版本号
gulp.task('font:rev', () =>
    gulp.src(`${dirs.dist}/fonts/**`)
        .pipe(plugins().rev())
        .pipe(plugins().rev.manifest())
        .pipe(gulp.dest(`${dirs.dist}/fonts`)));

//html:copy
gulp.task('html:copy', () => {
    return gulp.src(`${dirs.src}/**/*.html`)
        .pipe(gulp.dest(`${dirs.dist}`))
}
);


//img:sprites
gulp.task('img:sprites', (done) =>
    gulp.src(`${dirs.src}/img/sprite-img/*.png`)
        .pipe(plugins().spritesmith({
            imgName: 'sprite.png',
            styleName: 'sprite.css',
            imgPath: '../img/sprite.png'
        }))
        .pipe(plugins().if('*.png', gulp.dest(`${dirs.src}/img`)))
        .pipe(plugins().if('*.css', gulp.dest(`${dirs.src}/css`)))
);

//img:copy
gulp.task('img:copy', () =>
    gulp.src(`${dirs.src}/img/**`)
        .pipe(gulp.dest(`${dirs.dist}/img`))

);



//img:imagemin//图片压缩 压缩图片可能会占用较长时间，使用 gulp-cache 插件可以减少重复压缩
gulp.task('img:imagemin', () =>
    gulp.src(`${dirs.dist}/img/*.+(png|jpg|gif|svg)`)
        .pipe(plugins().cache(plugins().imagemin({
            interlaced: true
        }))).pipe(gulp.dest(`${dirs.dist}/img`)));

//img:rev
gulp.task('img:rev', () =>
    gulp.src(`${dirs.dist}/img/*`)
        .pipe(plugins().rev())
        .pipe(plugins().rev.manifest())
        .pipe(gulp.dest(`${dirs.dist}/img`)));


//css:revCollectorCss CSS里更新引入文件版本号
gulp.task('css:revCollectorCss', () =>
    gulp.src([`${dirs.dist}/img/*.json`, `${dirs.dist}/css/*.css`])
        .pipe(plugins().revCollector())
        .pipe(gulp.dest(`${dirs.dist}/css`))
);


//html:useref
gulp.task('html:useref', () =>
    gulp.src(`${dirs.dist}/**/*.html`)
        // .pipe(plugins().replace(/{{JQUERY_VERSION}}/g, pkg.devDependencies.jquery))
        .pipe(plugins().if(
            !isDev, plugins().useref()
        ))
        .pipe(plugins().if(!isDev && '*.js', plugins().uglify()))
        .pipe(plugins().if(!isDev && '*.css', plugins().cleanCss({
            advanced: false,//类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
            compatibility: 'ie7',//保留ie7及以下兼容写法 类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
            keepBreaks: true,//类型：Boolean 默认：false [是否保留换行]
            keepSpecialComments: '*'
            //保留所有特殊前缀 当你用autoprefixer生成的浏览器前缀，如果不加这个参数，有可能将会删除你的部分前缀
        })))
        .pipe(gulp.dest(dirs.dist))
);

//压缩html
gulp.task('html:minify', () =>
    gulp.src([`${dirs.dist}/**/*.json`, `${dirs.dist}/**/*.html`])
        // .pipe(plugins().replace(/{{JQUERY_VERSION}}/g, pkg.devDependencies.jquery))
        .pipe(plugins().revCollector())
        .pipe(plugins().if(
            !isDev, plugins().minifyHtml()
        ))
        .pipe(gulp.dest(dirs.dist))
);


// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('archive', (done) => {
    runSequence(
        'product',
        'archive:create_archive_dir',
        'archive:zip',
        done)
});
//1.清理dist文件夹文件 2.js css 检查 3.编译 less sass 4.复制普通文件到dist 5.图片合成，生成文件在src 6.js css html img 复制到dist
//7.图片压缩 8.css 增加前缀 9.字体 图片 生成MD5 10.css 图片地址加上md5 11.html 替换 css js， 合成单个css js 12.js css 生成md5 13.js css 加上md5，压缩html。 
gulp.task('build', (done) => {
    isDev = false;
    runSequence(
        ['clean', 'lint:js'],
        ['compile:less', 'compile:sass'],
        ['copy', 'img:sprites'],
        ['js:copy', 'css:copy', 'html:copy', 'img:copy'],
        ['img:imagemin', 'css:autoprefixer'],
        ['font:rev', 'img:rev'],
        'css:revCollectorCss',
        'html:useref',
        ['js:rev', 'css:rev'],
        'html:minify',
        done)
});

gulp.task('dev', (done) => {
    isDev = true;
    runSequence(
        ['clean', 'lint:js'],
        ['compile:less', 'compile:sass'],
        ['copy', 'img:sprites'],
        ['js:copy', 'css:copy', 'html:copy', 'img:copy'],
        ['img:imagemin', 'css:autoprefixer'],
        ['font:rev', 'img:rev'],
        'css:revCollectorCss',
        'html:useref',
        ['js:rev', 'css:rev'],
        'html:minify',
        done)
});

gulp.task('watch', function () {
    // plugins().livereload.listen(); //要在这里调用listen()方法
    gulp.watch(`${dirs.src}`, ['build']);
});

gulp.task('watch-compile', function () {
    // plugins().livereload.listen(); //要在这里调用listen()方法
    gulp.watch(`${dirs.src}/css/less/*.less`, ['compile:less']);
    gulp.watch(`${dirs.src}/css/sass/*.scss`, ['compile:sass']);
});


gulp.task('default', ['dev']);

gulp.task('product', ['build']);




