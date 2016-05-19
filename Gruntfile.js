
module.exports = function(grunt) {
    "use strict";

    var path = require('path');

    // UTC date time of build
    var date = new Date();
    var prettyDate = function() {
        return date.getUTCDate() + "." + (date.getUTCMonth() + 1) + "." + date.getUTCFullYear() + " " +
               date.getUTCHours() + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds() + " UTC";
    };

    var copyright = [
        "/*",
        " * realXtend WebTundra v${version-tag}",
        " * http://realxtend.org",
        " *",
        " * Commit   ${version-full}",
        " * Date     " + prettyDate(),
        " * Meta     @preserve",

        " * Copyright realXtend project - http://realxtend.org/\n",
        " *  Licensed under the Apache License, Version 2.0 (the \"License\");",
        " *  you may not use this file except in compliance with the License.",
        " *  You may obtain a copy of the License at\n",
        " *      http://www.apache.org/licenses/LICENSE-2.0\n",
        " *  Unless required by applicable law or agreed to in writing, software",
        " *  distributed under the License is distributed on an \"AS IS\" BASIS,",
        " *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.",
        " *  See the License for the specific language governing permissions and",
        " *  limitations under the License.",
        " */\n"
    ].join("\n");

    var setupCopyright = function(info)
    {
        copyright = copyright.replace("${version-tag}", info.tag);
        copyright = copyright.replace("${version-full}", info);

        // Update grunt tasks that need copyright or version information
        var config = grunt.config.get("uglify");
        config.build.options.banner = copyright;
        // config.web_workers.options.banner = copyright;
        grunt.config.set("uglify", config);

        config = grunt.config.get("compress");
        config.build.options.archive = "build/realxtend-webtundra-" + (grunt.option("stable") ? info.tag : "nightly") + ".zip";
        config.build.files[0].dest = "realxtend-webtundra-" + (grunt.option("stable") ? info.tag : "nightly") + "/";
        grunt.config.set("compress", config);
    };

    var platform = function()
    {
        if (process.platform === "win32")
            return "windows";
        else if (process.platform === "darwin")
            return "mac";
        return "linux";
    };
    var sdkPlatform = (grunt.option("sdkplatform") || platform());
    var sdkArch = (grunt.option("sdkarch") || "amd64");
    var sdkIndentifier = (sdkPlatform + (sdkArch ? "-" + sdkArch : ""));

    var processEC_Script = function(scriptPath)
    {
        grunt.log.writeln("Processing " + scriptPath);

        var contents = grunt.file.read(scriptPath);
        contents = grunt.config.get("requirejs").compile.options.onBuildCleanStart(contents);
        contents = addEC_ScriptInstantiation(contents);
        grunt.file.write(scriptPath, copyright + contents);
    };

    var addEC_ScriptInstantiation = function(contents)
    {
        var i = contents.lastIndexOf("return");
        if (i !== -1)
        {
            var contentStart = contents.substring(0, i);
            var contentEnd = contents.substring(i);
            contentEnd = contentEnd.substring(0, contentEnd.indexOf(";"));
            contentEnd = contentEnd.replace("return", "new");
            contentEnd += "();\n";
            contents = contentStart + contentEnd;
        }
        return contents;
    };

    var globalBuildDependencies = [];

    grunt.initConfig({
        pkg : grunt.file.readJSON("package.json"),

        "git-describe" : {
            repo : {
                options : {
                }
            }
        },

        clean : {
            dest        : [ "build" ],
            src         : [ "build-temp" ],
            doc         : [ "build/doc" ],
            build       : [ "build/bower", "build-temp" ],
            sdkprecompress : [ "sdk-temp/realxtend-webtundra-*" ]
        },

        copy : {
            sources : {
                files : [
                    { expand: true, cwd: "src/",
                      src : [ "lib/**",
                              "core/**",
                              "entity-components/**",
                              "view/**",
                              "plugins/**" ],
                      dest : "build-temp/" },

                    { expand: true, cwd: "src/",
                      src : [ "application/**" ],
                      dest : "build/" },

                    { expand: true, cwd: "html/",
                      src : [ "img/**", "examples/**", "media/**" ],
                      dest : "build/" }
                ]
            },
            docassets : {
                files : [
                    { expand: true, cwd: "html/img/",
                      src : [ "realxtend_logo-doc-header.png" ],
                      dest : "build/doc/assets/img/" },
                ]
            }
        },

        concat : {
            deps : {
                src  : [], // Populated during build
                dest : "build/lib/realxtend-webtundra-deps.js"
            }
        },

        compress : {
            build : {
                options : {
                    archive : "build/realxtend-webtundra.zip",
                    pretty  : true,
                    level   : 9
                },
                files: [
                    { expand : true, cwd: "build/",
                      src    : [ "**", "!realxtend-webtundra-*.zip" ],
                      dest   : "realxtend-webtundra/" }
                ]
            }
        },

        requirejs : {
            compile : {
                options : {
                    baseUrl     : "build-temp/",
                    optimize    : "none",

                    name : "core/framework/TundraClient",

                    paths :
                    {
                        "jquery"            : "lib/jquery"
                    },

                    include : [
                        // Default renderer
                        "view/threejs/ThreeJsRenderer",
                        // Input plugins
                        "core/input/InputTouchPlugin",
                        // Plugins
                        "plugins/login-screen/LoginScreenPlugin",
                        "plugins/ogre-plugin/OgrePlugin",
                        "plugins/script-plugin/ScriptPlugin",
                        "plugins/physics/AmmoPhysics",
                        "plugins/particle-engine/ParticleEnginePlugin"
                    ],

                    skipProcessingModules : [
                        "lib/jquery.contextmenu",
                        "lib/three",
                        "lib/three/DDSLoader",
                        "lib/three/CSS3DRenderer",
                        "lib/three/OBJLoader",
                        "lib/three/MTLLoader",
                        "lib/loglevel",
                        "lib/signals",
                        "lib/hammer",
                        "lib/ammo"
                    ],

                    excludeGlobalModules : [
                        "jquery",
                        "lib/jquery-ui",
                        "lib/jquery.mousewheel",
                        "lib/jquery.titlealert",
                        "lib/jquery.contextmenu",
                        "lib/three",
                        "lib/three/DDSLoader",
                        "lib/three/CSS3DRenderer",
                        "lib/three/OBJLoader",
                        "lib/three/three-TransformControls",
                        "lib/Tween",
                        "lib/loglevel",
                        "lib/signals",
                        "lib/hammer",
                        "lib/ammo"
                    ],

                    shouldSkipProcessing : function(moduleName)
                    {
                        for (var i = 0; i < this.skipProcessingModules.length; i++)
                        {
                            var name = this.skipProcessingModules[i];
                            if (moduleName.indexOf(name) === 0 && moduleName.length === name.length)
                                return true;
                        }
                        return false;
                    },

                    shouldExcludeFromBuild : function(moduleName)
                    {
                        for (var i = 0; i < this.excludeGlobalModules.length; i++)
                        {
                            var name = this.excludeGlobalModules[i];
                            if (moduleName.indexOf(name) === 0 && moduleName.length === name.length)
                                return true;
                        }
                        return false;
                    },

                    onBuildWrite : function(moduleName, path, contents)
                    {
                        var skipProcessing = this.shouldSkipProcessing(moduleName);
                        var excludeFromBuild = this.shouldExcludeFromBuild(moduleName);

                        if (excludeFromBuild)
                            grunt.log.writeln("-", moduleName, "     [excluding from single file optimization]");
                        if (skipProcessing)
                            grunt.log.writeln("-", moduleName, "     [skipping requirejs processing]");

                        if (excludeFromBuild && skipProcessing)
                            return this.onBuildWriteDependency(moduleName, contents);
                        else if (skipProcessing)
                            return contents;

                        if (!excludeFromBuild)
                            grunt.log.writeln(moduleName);

                        // requierjs processing
                        var logging = false;
                        if (logging) grunt.log.writeln("=============================================", moduleName);
                        contents = this.onBuildCleanStart(contents, logging);
                        if (logging) grunt.log.writeln("-----------------------------------------");
                        contents = this.onBuildCleanEnd(contents, logging);
                        if (logging) grunt.log.writeln(" ");

                        if (excludeFromBuild)
                            return this.onBuildWriteDependency(moduleName, contents);
                        return contents;
                    },

                    onBuildWriteDependency : function(moduleName, contents)
                    {
                        if (moduleName.indexOf("plugins/") === 0)
                            moduleName = "lib/" + moduleName;
                        if (moduleName.indexOf("lib/") !== 0)
                            moduleName = "lib/" + moduleName;

                        grunt.file.write("build/" + moduleName + ".js", contents);
                        globalBuildDependencies.push(moduleName + ".js");
                        return "";
                    },

                    onBuildCleanStart : function(contents, logging)
                    {
                        var i = contents.indexOf("{");
                        if (i !== -1) {
                            if (logging === true) grunt.log.writeln(contents.substring(0, i+1));
                            contents = contents.substring(i+1);
                        }
                        return contents;
                    },

                    onBuildCleanEnd : function(contents, logging)
                    {
                        var i = contents.lastIndexOf("return");
                        if (i !== -1) {
                            if (logging === true) grunt.log.writeln(contents.substring(i));
                            contents = contents.substring(0, i);
                        }
                        return contents;
                    },

                    removeInvalidRequireJsDefined : function(contents)
                    {
                        if (contents === undefined || contents === undefined)
                            return;

                        var first = true;
                        var regexp = /\r\n|\n\r|\n|\r/g;
                        var lines = contents.replace(regexp,"\n").split("\n");
                        var outlines = [];
                        for (var i = 0; i < lines.length; i++)
                        {
                            var line = lines[i];
                            var defineIndex = line.indexOf("define(");
                            if (defineIndex === 0 && line.substring(line.length-1) === ";")
                            {
                                // Must have one of our exluded paths
                                var reject = false;
                                for (var gbi = 0; gbi < this.excludeGlobalModules.length; gbi++)
                                {
                                    if (line.indexOf(this.excludeGlobalModules[gbi]) > 0)
                                    {
                                        if (first)
                                        {
                                            grunt.log.writeln("");
                                            first = false;
                                        }
                                        grunt.log.writeln("Rejecting invalid '" + line + "' line from final build.");
                                        reject = true;
                                        break;
                                    }
                                }
                                if (reject)
                                    continue;
                            }
                            outlines.push(line);
                        }
                        return outlines.join("\n");
                    },

                    isEditorInApps : function()
                    {
                        return grunt.file.exists("build/application/editor/WebTundraEditor.webtundrajs")
                    },

                    processDependencies : function()
                    {
                        grunt.log.ok("Processing dependencies");

                        var configConcat = grunt.config.get("concat");
                        for (var i = 0; i < globalBuildDependencies.length; i++)
                        {
                            grunt.log.writeln("build/" + globalBuildDependencies[i]);
                            configConcat.deps.src.push("build/" + globalBuildDependencies[i]);
                        }

                        // Store dependency paths for concatenation
                        grunt.config.set("concat", configConcat);
                    },

                    processApplications : function()
                    {
                        grunt.log.ok("Processing applications");

                        var apps = [ "build/application/*.webtundrajs" ];
                        if (this.isEditorInApps())
                            apps.push("build/application/editor/*.webtundrajs");

                        // Pre process app scripts for uglifying
                        var scripts = grunt.file.expand(apps);
                        for (var i = 0; i < scripts.length; i++)
                            processEC_Script(scripts[i]);

                        /* Uglify app scripts if '-no-uglify' is not passed.
                           Also uglify the build main script. */
                        if (grunt.option('no-uglify') === false)
                        {
                            var appFiles = grunt.file.expand("build/application/*.webtundrajs");
                            grunt.log.subhead("Running uglify on " + appFiles.length + " applications");

                            var configUglify = grunt.config.get("uglify");
                            configUglify.build.files["build/realxtend-webtundra.js"] = ["build/realxtend-webtundra.js"];

                            for (i = 0; i < appFiles.length; i++) {
                                var relativePath = appFiles[i];
                                configUglify.build.files[relativePath] = [relativePath];
                            }

                            grunt.config.set("uglify", configUglify);
                            grunt.task.run(["uglifybuild"]);
                        }
                    },

                    processExamples : function()
                    {
                        grunt.log.ok("Processing examples");

                        var injectExampleItems = function(contents, exampleItems)
                        {
                            if (contents.indexOf("<!-- @inject-examples -->") === -1)
                                grunt.fail.fatal('Failed to find "<!-- @inject-examples -->" from examples page template');

                            return contents.replace("<!-- @inject-examples -->", exampleItems.join("\n"));
                        }.bind(this);

                        var examples = ["build/examples/*/*.webtundrajs"];
                        var exampleConfigs = ["build/examples/*/example.json"];

                        var scripts = grunt.file.expand(examples);
                        for (var i = 0; i < scripts.length; ++i)
                            processEC_Script(scripts[i]);

                        var configs = grunt.file.expand(exampleConfigs);
                        var htmlItems = [];
                        for (var i = 0; i < configs.length; ++i)
                        {
                            var exampleFolder = configs[i];
                            exampleFolder = exampleFolder.substring(0, exampleFolder.indexOf("/example.json"));
                            exampleFolder = exampleFolder.substring(exampleFolder.lastIndexOf("/") + 1);

                            var exampleConfig = JSON.parse(grunt.file.read(configs[i]));
                            var htmlItem = '        <a class="exampleitems" data-tooltip="tooltip" title="' + exampleConfig.name + '"'
                                + 'alt="' + exampleConfig.description + '"'
                                + 'href="client.html?example=' + exampleFolder + '"'
                                + 'style="background-image: url(./examples/' + exampleFolder + '/screenshot.png); background-size: cover;">'
                                + '</a>'
                            htmlItems.push(htmlItem);
                        }

                        grunt.file.write("build/examples.html", injectExampleItems(grunt.file.read("html/examples.html"), htmlItems));
                    },

                    createClientHTML : function()
                    {
                        grunt.log.ok("Creating client pages");

                        var injectScriptTags = function(contents)
                        {
                            if (contents.indexOf("<!-- @inject-tags -->") === -1)
                                grunt.fail.fatal('Failed to find "<!-- @inject-tags -->" from client page template');

                            var scriptTags = [
                                '<script src="lib/realxtend-webtundra-deps.js"></script>',
                                '<script src="realxtend-webtundra.js"></script>',
                            ];

                            if (this.isEditorInApps())
                                scriptTags.push('<script src="application/editor/InterfaceDesigner-main.js"></script>');

                            return contents.replace("<!-- @inject-tags -->", scriptTags.join("\n    "));
                        }.bind(this);

                        var replaceBody = function(contents, polymer)
                        {
                            if (contents.indexOf("<body>") === -1)
                                grunt.fail.fatal('Failed to find "<body>" from client page template');

                            var bodyStart = contents.indexOf("<body>");
                            var head = contents.substring(0, bodyStart);

                            var body = [
                                '<body>',
                                '',
                                '<div id="webtundra-container-custom"></div>',
                                '',
                                '<script>',
                            ];
                            if (polymer)
                                body.push('var startWebTundra = function() {');
                            var editor = this.isEditorInApps();
                            body = body.concat([
                                '    new TundraClient({',
                                '        Tundra : {',
                                '            polymer   : (typeof Polymer === "function"),',
                                '            deprecatedWarnings : true',
                                '        },',
                                '        TundraClient : {',
                                '            renderer  : ThreeJsRenderer,',
                                '            container : "#webtundra-container-custom",',
                                '            loglevel  : "debug",',
                                '            applications: {',
                                '                "Freecamera" : "webtundra-applications://freecamera.webtundrajs",',
                                editor ? '                "Editor" : "webtundra-applications://editor/WebTundraEditor.webtundrajs"' : "",
                                '            }',
                                '        },',
                                '        AssetAPI : {',
                                '            storages : {',
                                '                "webtundra-applications://" : "./application",',
                                '                "webtundra-examples://"     : "./examples"',
                                '            }',
                                '        },',
                                '        plugins : {',
                                '            LoginScreenPlugin : {',
                                '                loginControlsEnabled : true,',
                                '                loadingScreenEnabled : true,',
                                '                headerText     : "realXtend WebTundra",',
                                '                headerLinkUrl  : "http://meshmoon.com",',
                                '                connectingText : "Loading 3D Space"',
                                '            }',
                                '        }',
                                '    });',
                                '',
                                '    var example = CoreStringUtils.queryValue("example");',
                                '    if (example != "")',
                                '    {',
                                '        jQuery.ajax({',
                                '            type: "GET",',
                                '            url: "examples/" + example + "/scene.txml",',
                                '            dataType: "xml",',
                                '            success: function(txmlDoc) {',
                                '                Tundra.scene.deserializeFromXml(txmlDoc);',
                                '                Tundra.client.fakeConnectionState();',
                                '            }',
                                '        });',
                                '    }',
                            ]);

                            body = body.concat([
                                '</script>',
                                '',
                                '</body>',
                                '</html>'
                            ]);
                            return head + body.join("\n");
                        }.bind(this);

                        grunt.file.write("build/client.html", replaceBody(injectScriptTags(grunt.file.read("html/client.html")), false));
                    },

                    createAdditionalFiles : function()
                    {
                        grunt.file.write("build/LICENCE", copyright);
                    },

                    out : function (compiledCode)
                    {
                        compiledCode = this.removeInvalidRequireJsDefined(compiledCode);
                        grunt.file.write("build/realxtend-webtundra.js", compiledCode);
                    },

                    done : function(done, output)
                    {
                        grunt.log.subhead("Running post-build operations");

                        var that = grunt.config.get("requirejs").compile.options;

                        that.processDependencies();
                        that.processApplications();
                        that.processExamples();
                        that.createClientHTML();
                        that.createAdditionalFiles();

                        done();
                    }
                }
            }
        },

        uglify : {
            options : {
                sourceMaps : false,
                beautify   : false,
                mangle     : true,
                compress   : {
                    properties    : true,
                    conditionals  : true,
                    dead_code     : true,
                    drop_debugger : true,
                    join_vars     : true
                },
                screwIE8 : false // make true once resolved https://github.com/gruntjs/grunt-contrib-uglify/issues/303
            },
            deps_concat : {
                options : {
                    preserveComments : false
                },
                files : {
                    "build/lib/realxtend-webtundra-deps.js" : [ "build/lib/realxtend-webtundra-deps.js" ],
                }
            },
            deps : {
                options : {
                    preserveComments : "all"
                },
                files : {
                    "build/lib/three.js"                  : [ "build/lib/three.js" ],
                    "build/lib/three/DDSLoader.js"        : [ "build/lib/three/DDSLoader.js" ],
                    "build/lib/three/CSS3DRenderer.js"    : [ "build/lib/three/CSS3DRenderer.js" ],
                    "build/lib/three/OBJLoader.js"        : [ "build/lib/three/OBJLoader.js" ],
                    "build/lib/three/three-TransformControls.js"  : [ "build/lib/three/three-TransformControls.js" ],
                    "build/lib/Tween.js"                  : [ "build/lib/Tween.js" ],
                    "build/lib/jquery.js"                 : [ "build/lib/jquery.js" ],
                    "build/lib/jquery.mousewheel.js"      : [ "build/lib/jquery.mousewheel.js" ],
                    "build/lib/jquery.contextmenu.js"     : [ "build/lib/jquery.contextmenu.js" ],
                    "build/lib/jquery-ui.js"              : [ "build/lib/jquery-ui.js" ],
                    //
                    "build/lib/classy.js"                 : [ "build/lib/classy.js" ],
                    "build/lib/loglevel.js"               : [ "build/lib/loglevel.js" ],
                    "build/lib/signals.js"                : [ "build/lib/signals.js" ],
                    "build/lib/hammer.js"                 : [ "build/lib/hammer.js" ]
                }
            },
            build : {
                options : {
                    banner : copyright,
                    preserveComments : false
                },
                files : {} // Update during runtime if -no-uglify not passed
            }
        },

        jsdoc : {
            compile : {
                options: {
                    destination : "build/doc",
                    configure   : "tools/jsdoc/conf.build.json"
                }
            }
        },

        connect : {
            webtundra : {
                options: {
                    hostname : "0.0.0.0",
                    port : 8082,
                    keepalive : true,
                    base : "./",
                    open : (grunt.option("no-browser") ? false : "http://localhost:8082/html/client.html"),

                    middleware : function(connect, options, middlewares) {
                        // Inject a custom middleware into the array of default middlewares
                        middlewares.unshift(function(req, res, next) {
                            res.setHeader("Access-Control-Allow-Origin", "*");
                            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                            return next();
                        });
                        return middlewares;
                    },
                }
            }
        },

        watch : {
            webtundra : {
                files : [
                    "src/**/*.js",
                    "src/core/**/*.js",
                    "!src/lib/**",
                    "!src/application/**",
                ],
                tasks : [ "build_fast" ],
                options : { spawn: false }
            }
        },

        parallel : {
            dev : {
                tasks :
                [
                    {
                        grunt : true,
                        args  : [ "connect:webtundra" ]
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-contrib-requirejs");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-git-describe");
    grunt.loadNpmTasks("grunt-jsdoc");
    grunt.loadNpmTasks("grunt-parallel");

    // Resolve current git versions info
    grunt.registerTask("git-version", function() {
        grunt.event.once("git-describe", function (rev) {
            grunt.option("git-rev", rev);
            setupCopyright(rev);
        });
        grunt.task.run('git-describe');
    });
    grunt.task.run(["git-version"]);

    grunt.registerTask("hack_amd_production", "", function() {
        var src  = "build/lib/realxtend-webtundra-deps.js";
        var contents = grunt.file.read(src);

        var pre  = [ "\n// Hack to disable amd detection/definition from WebRocket deps",
                     "// This is done to ensure WebRocket working on pages that use requirejs",
                     "if (typeof define === 'function' && typeof define.amd === 'object') {",
                     "    var amdWas = define.amd;",
                     "    define.amd = undefined;",
                     "}" ].join("\n") + "\n\n";

        var post = [ "\n\nif (typeof define === 'function' && typeof amdWas === 'object')",
                     "    define.amd = amdWas;" ].join("\n") + "\n";
        grunt.file.write(src, pre + contents + post);
    });

    var uglify = (grunt.option('no-uglify') === false);

    // build
    var tasks = [
        "clean:dest",
        "clean:src",
        "copy:sources",
        "requirejs",
        "concat:deps"
    ];
    if (uglify)
    {
        tasks = tasks.concat([
            "uglify:deps_concat",
            "uglify:deps"
        ]);
    }
    tasks = tasks.concat([
        "hack_amd_production",
        "clean:build",
        "compress:build"
    ]);
    grunt.registerTask("build", "", tasks);

    // build_fast
    tasks = [
        "clean:dest",
        "clean:src",
        "copy:sources",
        "requirejs",
        "concat:deps",
        "hack_amd_production",
        "clean:build"
    ];
    grunt.registerTask("build_fast", "", tasks);

    // uglifybuild
    grunt.registerTask("uglifybuild", "", [
        "uglify:build"
    ]);

    // doc
    grunt.registerTask("doc", "", [
        "clean:doc",
        "doc_pre",
        "jsdoc",
        "doc_post",
        "copy:docassets",
    ]);
    grunt.registerTask("doc_pre", "", function() {
        var src  = "tools/jsdoc/conf.json";
        var dest = "tools/jsdoc/conf.build.json";
        var contents = grunt.file.read(src);

        var info = grunt.option("git-rev");
        var version = (grunt.option("stable") ? info.tag : info.toString());
        if (version.indexOf("-dirty") !== -1)
            version = "nightly";

        contents = contents.replace("${version}", version);
        grunt.file.write(dest, contents);
    });
    grunt.registerTask("doc_post", "", function() {
        var contents = grunt.file.read("build/doc/styles/jaguar.css");
        if (typeof contents === "string" && contents.length > 0)
            grunt.file.write("build/doc/styles/jaguar.css", contents + ".tag-source { display: none !important; }");
        grunt.file.delete("tools/jsdoc/conf.build.json");
    });

    // Development HTTP server
    grunt.registerTask("dev", "", [
        "parallel:dev"
    ]);

    // Set default if no task is defined on cmd line
    grunt.registerTask("all", "", function() {
        grunt.task.run([
            "build",
            "doc"
        ]);
    });

    // Watch files and run a mimimal build if files change
    grunt.registerTask("build_watch", "", [
        "watch:webtundra"
    ]);

    grunt.registerTask("default", ["all"]);
};
