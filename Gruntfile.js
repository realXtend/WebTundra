
module.exports = function(grunt) {

    var copyright = [
        "/** Copyright realXtend project - http://realxtend.org/\n",
        "    Licensed under the Apache License, Version 2.0 (the \"License\");",
        "    you may not use this file except in compliance with the License.",
        "    You may obtain a copy of the License at\n",
        "        http://www.apache.org/licenses/LICENSE-2.0\n",
        "    Unless required by applicable law or agreed to in writing, software",
        "    distributed under the License is distributed on an \"AS IS\" BASIS,",
        "    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.",
        "    See the License for the specific language governing permissions and",
        "    limitations under the License.",
        "*/\n"
    ].join("\n");

    var processEC_Script = function(scriptPath) {
        grunt.log.writeln("Processing " + scriptPath);

        var contents = grunt.file.read(scriptPath)
        if (contents.indexOf("define(") !== -1)
        {
            contents = grunt.config.get("requirejs").compile.options.onBuildCleanStart(contents);
            contents = addEC_ScriptInstantiation(contents);
        }
        grunt.file.write(scriptPath, copyright + contents);
    };

    var addEC_ScriptInstantiation = function(contents) {
        var i = contents.lastIndexOf("return");
        if (i !== -1) {
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

        clean : {
            dest        : { src : [ "build" ] },
            src         : { src : [ "build-temp" ] },
            unwanted    : { src : [ "build-temp/lib/polymer" ] },
            doc         : { src : [ "build/doc" ] },
            build       : { src : [ "build/build.txt", "build-temp" ] },
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
                      src : [ "application/**" ], dest : "build/" },
                    { expand: true, cwd: "html/",
                      src : [ "img/**" ], dest : "build/" }
                ]
            },
            docassets : {
                files : [
                    { expand: true, cwd: "html/img/",
                      src : [ "realxtend_logo-doc-header.png" ], dest : "build/doc/assets/img/" },
                ]
            }
        },

        compress : {
            build : {
                options : {
                    archive : "build/realxtend-webtundra-<%= pkg.version %>.zip",
                    pretty  : true,
                    level   : 9
                },
                files: [
                    { expand : true, cwd: "build/",
                      src    : [ "**" ],
                      dest   : "realxtend-webtundra-<%= pkg.version %>/" }
                ]
            }
        },

        requirejs : {
            compile : {
                options : {

                    baseUrl     : "build-temp/",
                    optimize    : "uglify",

                    name : "core/framework/TundraClient",

                    include : [
                        // Renderer
                        "view/threejs/ThreeJsRenderer"
                    ],

                    skipProcessingModules : [
                        "lib/jquery.contextmenu",
                        "lib/three",
                        "lib/three/CSS3DRenderer",
                        "lib/three/OBJLoader",
                        "lib/loglevel",
                        "lib/signals",
                        "lib/polymer.min"
                    ],

                    excludeGlobalModules : [
                        "lib/jquery",
                        "lib/jquery-ui",
                        "lib/jquery.mousewheel",
                        "lib/jquery.titlealert",
                        "lib/jquery.contextmenu",
                        "lib/three",
                        "lib/three/CSS3DRenderer",
                        "lib/three/OBJLoader",
                        "lib/loglevel",
                        "lib/signals",
                        "lib/polymer.min"
                    ],

                    onBuildWrite : function(moduleName, path, contents) {
                        // Check if this module should not be bundled
                        var excludeFromBuild = false;
                        for (var i = 0; i < this.excludeGlobalModules.length; i++) {
                            if (moduleName.indexOf(this.excludeGlobalModules[i]) === 0) {
                                excludeFromBuild = true;
                                break;
                            }
                        }
                        // Skip processing for modules that do not use requirejs
                        for (var i = 0; i < this.skipProcessingModules.length; i++) {
                            if (moduleName.indexOf(this.skipProcessingModules[i]) === 0) {
                                grunt.log.writeln("    Skipping  " + moduleName + " requirejs processing");
                                if (excludeFromBuild)
                                {
                                    grunt.log.writeln("    Excluding " + moduleName + " from single file optimization");
                                    return this.onBuildWriteDependency(moduleName, contents);
                                }
                                else
                                    return contents;
                            }
                        }

                        var logging = false;
                        if (logging) grunt.log.writeln("=============================================", moduleName);
                        contents = this.onBuildCleanStart(contents, logging);
                        if (logging) grunt.log.writeln("-----------------------------------------");
                        contents = this.onBuildCleanEnd(contents, logging);
                        if (logging) grunt.log.writeln(" ");

                        if (excludeFromBuild)
                        {
                            grunt.log.writeln("    Excluding " + moduleName + " from single file optimization");
                            return this.onBuildWriteDependency(moduleName, contents);
                        }
                        else
                            return contents;
                    },

                    onBuildWriteDependency : function(moduleName, contents)
                    {
                        grunt.file.write("build/" + moduleName + ".js", contents);
                        globalBuildDependencies.push(moduleName + ".js");
                        return "";
                    },

                    onBuildCleanStart : function(contents, logging) {
                        var i = contents.indexOf("{");
                        if (i !== -1) {
                            if (logging === true) grunt.log.writeln(contents.substring(0, i+1));
                            contents = contents.substring(i+1);
                        }
                        return contents;
                    },

                    onBuildCleanEnd : function(contents, logging) {
                        var i = contents.lastIndexOf("return");
                        if (i !== -1) {
                            if (logging === true) grunt.log.writeln(contents.substring(i));
                            contents = contents.substring(0, i);
                        }
                        return contents;
                    },

                    out : function (compiledCode) {
                        grunt.file.write("build/realxtend-webtundra.js",
                            copyright +
                            grunt.file.read("tools/snippets/SDK.pre.inject.js") +
                            compiledCode +
                            grunt.file.read("tools/snippets/SDK.post.inject.js")
                        );
                    },

                    done : function(done, output) {
                        grunt.log.subhead("Running post-build operations");

                        grunt.log.writeln("Creating client.html");
                        var dependencyScriptTags = "";
                        for (var i = 0; i < globalBuildDependencies.length; i++)
                            dependencyScriptTags += '<script src="' + globalBuildDependencies[i] + '"></script>' + (i != globalBuildDependencies.length-1 ? '\n' : '');
                        grunt.log.writeln(dependencyScriptTags);
                        var contents = grunt.file.read("tools/snippets/SDK.client.html");

                        contents = contents.replace('<body>', '<body>\n\n' + dependencyScriptTags);
                        grunt.file.write("build/client.html", contents);

                        grunt.log.writeln("Creating LICENCE");
                        grunt.file.write("build/LICENCE", copyright);

                        grunt.log.writeln("Creating VERSION");
                        var pkgConfig = grunt.config.get("pkg");
                        grunt.file.write("build/VERSION", [
                            "Name         realXtend WebTundra SDK",
                            "Description  " + pkgConfig.description,
                            "Version      " + pkgConfig.version,
                            "Homepage     " + pkgConfig.homepage
                        ].join("\n"));

                        done();

                        // Pre process scripts for uglifying
                        grunt.log.subhead("Running pre-build processing on applications");
                        var scripts = grunt.file.expand([ "build/application/*.webtundrajs", "build/application/*.js"]);
                        for (var i = 0; i < scripts.length; i++) {
                            processEC_Script(scripts[i]);
                        }
                    }
                }
            }
        },

        uglify : {
            options : {
                sourceMaps : false,
                mangle     : false,
                beautify   : false,
                compress   : true,
                preserveComments : "some"
            },
            deps : {
                files : {
                    "build/lib/three.js"                  : [ "build/lib/three.js" ],
                    "build/lib/three/CSS3DRenderer.js"    : [ "build/lib/three/CSS3DRenderer.js" ],
                    "build/lib/three/OBJLoader.js"        : [ "build/lib/three/OBJLoader.js" ],
                    "build/lib/jquery.js"                 : [ "build/lib/jquery.js" ],
                    "build/lib/jquery.mousewheel.js"      : [ "build/lib/jquery.mousewheel.js" ],
                    "build/lib/jquery.contextmenu.js"     : [ "build/lib/jquery.contextmenu.js" ],
                    "build/lib/jquery-ui.js"              : [ "build/lib/jquery-ui.js" ],
                    "build/lib/loglevel.js"               : [ "build/lib/loglevel.js" ],
                    "build/lib/signals.js"                : [ "build/lib/signals.js" ]
                }
            }
        },

        yuidoc : {
            compile : {
                name        : "realXtend WebTundra SDK",
                description : "<%= pkg.description %>",
                version     : "<%= pkg.version %>",
                url         : "<%= pkg.homepage %>",
                logo        : "assets/img/realxtend_logo-doc-header.png",
                options     : {
                    paths           : "src/",
                    exclude         : "src/application/",
                    outdir          : "build/doc",
                    nocode          : true,
                    linkNatives     : true,
                    attributesEmit  : false,
                    selleck         : false,
                    tabtospace      : 4
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-contrib-yuidoc");
    grunt.loadNpmTasks("grunt-contrib-requirejs");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-closure-tools");

    grunt.registerTask("doc", "", [
        "clean:doc",
        "yuidoc",
        "copy:docassets"
    ]);
    grunt.registerTask("build", "", [
        "clean:dest",
        "clean:src",
        "copy:sources",
        "clean:unwanted",
        "requirejs",
        "clean:build",
        "uglify:deps"
    ]);
    grunt.registerTask("all", "", function() {
        grunt.task.run([
            "build",
            "doc",
            "compress:build"
        ]);
    });
    grunt.registerTask("default", ["all"]);
};

