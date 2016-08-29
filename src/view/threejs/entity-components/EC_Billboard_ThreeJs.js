
define([
        "lib/three",
        "core/framework/Tundra",
        "core/scene/AttributeChange",
        "core/math/MathUtils",
        "core/math/PlaceableUtils",
        "core/math/Color",
        "core/frame/FrameLimiter",
        "entity-components/EC_Billboard"
    ], function(THREE, Tundra, AttributeChange, MathUtils, PlaceableUtils, Color, FrameLimiter, EC_Billboard) {

var EC_Billboard_ThreeJs = EC_Billboard.$extend(
/** @lends EC_Billboard.prototype */
{
    /**
        Renders a billboard aka sprite from a material or texture reference.

        @constructs
        @private
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.material = null;
        this.sprite = null;

        var that = this;
        this._text = undefined;

        Object.defineProperties(this, {
            text : {
                get : function ()      { return this._text; },
                set : function (value) {
                    this._text = value;
                    that.loadTextSprite();
                },
            },
            /**
                When camera world position is further than this value from camera focus position,
                billboard is automatically hidden. Shows back when camera is again in range.

                Evaluated before any other distance checking.

                @property autoHideDistanceFurtherThanCameraToFocus
                @type Number
                @default -1 (disabled)
            */
            autoHideDistanceFurtherThanCameraToFocus : {
                get : function() { return this._autoHideDistanceFurtherThanCameraToFocus; },
                set : function (value) {
                    this._autoHideDistanceFurtherThanCameraToFocus = (typeof value === "number" && value > 0 ? value * value : -1);
                },
                _autoHideDistanceFurtherThanCameraToFocus : -1
            },
            /**
                When billboard is further than this value from the active camera,
                it will automatically hide. Shows back when camera is again in range.

                Calculated from world focus pos.

                @property autoHideDistanceFurtherThan
                @type Number
                @default -1 (disabled)
            */
            autoHideDistanceFurtherThan : {
                get : function() { return this._autoHideDistanceFurtherThan; },
                set : function (value) {
                    this._autoHideDistanceFurtherThan = (typeof value === "number" && value > 0 ? value * value : -1);
                },
                _autoHideDistanceFurtherThan : -1
            },
            /**
                When billboard is further than this value from the active camera,
                it will automatically hide. Shows back when camera is again in range.

                Calculated from camera world pos.

                @property autoHideDistanceFurtherThan
                @type Number
                @default -1 (disabled)
            */
            autoHideDistanceFurtherThanFromCamera : {
                get : function() { return this._autoHideDistanceFurtherThanFromCamera; },
                set : function (value) {
                    this._autoHideDistanceFurtherThanFromCamera = (typeof value === "number" && value > 0 ? value * value : -1);
                },
                _autoHideDistanceFurtherThanFromCamera : -1
            },
            autoScaleDistanceCloserThan : {
                get : function() { return this._autoScaleDistanceCloserThan; },
                set : function (value) {
                    this._autoScaleDistanceCloserThan = (typeof value === "number" && value > 0 ? value * value : -1);
                },
                _autoScaleDistanceCloserThan : -1
            },
            autoScaleDistanceFurtherThan : {
                get : function() { return this._autoScaleDistanceFurtherThan; },
                set : function (value) {
                    this._autoScaleDistanceFurtherThan = (typeof value === "number" && value > 0 ? value * value : -1);
                },
                _autoScaleDistanceFurtherThan : -1
            },
            /**
                Whether raycast should ignore this billboard.

                @property ignoreWhenRaycasting
                @type Boolean
                @default false
            */
            ignoreWhenRaycasting: {
                get: function(){ return this._ignoreWhenRaycasting; },
                set: function (value){
                    this._ignoreWhenRaycasting = (typeof value === "boolean" ? value : false);
                }
            }
        })

        this.style =
        {
            background  : undefined, // new Color(1,1,1) or "white", "rgb(255,255,255)"

            font        : "black",   // new Color(1,1,1) or "white", "rgb(255,255,255)"
            fontSize    : 48,

            border      : undefined, // new Color(1,0,0) or "red", "rgb(255,0,0)"
            borderWidth : 1, // Not used if border color not defined

            padding     : undefined, // number

            isDefined : function()
            {
                return (this.background || this.border);
            },

            key : function()
            {
                var str = "";

                if (this.background instanceof Color)
                    str += "_background=" + this.background.toString(true);
                else if (typeof this.background === "string")
                    str += "_background=" + this.background;

                if (this.border instanceof Color)
                    str += "_border=" + this.border.toString(true);
                else if (typeof this.border === "string")
                    str += "_border=" + this.border;

                if (this.font instanceof Color)
                    str += "_font=" + this.font.toString(true);
                else if (typeof this.font === "string")
                    str += "_font=" + this.font;

                return str;
            },

            css : function(key)
            {
                if (key === "borderWidth")
                    return (typeof this.borderWidth === "number" ? this.borderWidth.toString() : "0");

                var color = undefined;
                if (key === "background")
                    color = this.background;
                if (key === "border")
                    color = this.border;
                if (key === "font")
                    color = this.font;

                if (!color)
                    return "transparent";

                if (color instanceof Color)
                    return color.toString(true);
                return color;
            }
        };

        this.color = new THREE.Color(1,1,1);
        this.depthTest = true;
        this.depthWrite = true;

        this.autoScaleLimits = new THREE.Vector2(1, 1);
        this.autoOffset = new THREE.Vector3(0,0,0);
        this._autoScalingFactor = 1.0;

        this.onHoverIn = null;
        this.onHoverOut = null;

        // Impl detail for Placeable scaling the sprite
        this._overrideScale = new THREE.Vector2(1,1);
        this._ignoreWhenRaycasting = false;

        this._scaleAccordingToDistance = -1;
    },

    __classvars__ :
    {
        Implementation : "three.js",

        MaterialCache : {},
        ImgCache      : {},
        Canvas        : undefined,

        Animator : new PlaceableUtils.Animator(AttributeChange.LocalOnly),

        GetOrCreateMaterial : function(ec_billboard, textureRef)
        {
            var depthTest  = (typeof ec_billboard.depthTest === "boolean" ? ec_billboard.depthTest : true);
            var depthWrite = (typeof ec_billboard.depthWrite === "boolean" ? ec_billboard.depthWrite : true);

            var key = textureRef + "_" + depthTest + "_" + depthWrite;
            var material = this.MaterialCache[key];
            if (material === undefined)
            {
                material = new THREE.SpriteMaterial({ color: ec_billboard.color });
                material.depthTest = ec_billboard.depthTest;
                material.depthWrite = ec_billboard.depthWrite;

                // Non DDS and have extra style
                if (textureRef.indexOf(".dds") === -1 && ec_billboard.style.isDefined())
                {
                    var key = textureRef + ec_billboard.style.key();

                    var img = EC_Billboard_ThreeJs.ImgCache[key];
                    if (!img)
                    {
                        img = new Image();

                        img.onload = function()
                        {
                            var materials = $(img).data("materials")
                            for (var i = 0; i < materials.length; i++)
                            {
                                materials[i].map = EC_Billboard_ThreeJs.StylizeImage(this.ec_billboard, this.ec_billboard.style, img);
                                materials[i].needsUpdate = true;
                            }
                        }.bind({ ec_billboard : ec_billboard });

                        img.crossOrigin = "anonymous";
                        img.src = textureRef;

                        EC_Billboard_ThreeJs.ImgCache[key] = img;

                        var pending = $(img).data("materials");
                        if (!Array.isArray(pending))
                            pending = [ material ];
                        else
                            pending.push(material);
                        $(img).data("materials", pending);
                    }
                    else
                    {
                        if (img.complete)
                        {
                            material.map = EC_Billboard_ThreeJs.StylizeImage(ec_billboard, ec_billboard.style, img);
                            material.needsUpdate = true;
                        }
                        else
                        {
                            var pending = $(img).data("materials");
                            if (!Array.isArray(pending))
                                pending = [ material ];
                            else
                                pending.push(material);
                            $(img).data("materials", pending);
                        }
                    }
                }
                // DDS cannot be decorated with a canvas
                else
                {
                    var transfer = Tundra.asset.requestAsset(textureRef);
                    transfer.onCompleted(material, function(asset) {
                        this.map = asset.texture;

                        // As we are not modifying the texture, we should clone
                        // it. If the texture is now used in normal geometry it
                        // will be mirrored there.
                        this.map.repeat.set(-1, 1);
                        this.map.offset.set( 1, 0);
                        this.needsUpdate = true;
                    });
                }

                this.MaterialCache[key] = material;
            }
            return material;
        },

        GetOrCreateTextMaterial : function(ec_billboard, text)
        {
            var depthTest  = (typeof ec_billboard.depthTest === "boolean" ? ec_billboard.depthTest : true);
            var depthWrite = (typeof ec_billboard.depthWrite === "boolean" ? ec_billboard.depthWrite : true);

            var key = text + "_" + depthTest + "_" + depthWrite + "_";
            var material = this.MaterialCache[key];
            if (material === undefined)
            {
                material = new THREE.SpriteMaterial({ color: ec_billboard.color });
                material.depthTest = ec_billboard.depthTest;
                material.depthWrite = ec_billboard.depthWrite;

                material.map = EC_Billboard_ThreeJs.StylizeImage(ec_billboard, ec_billboard.style, undefined, text);

                this.MaterialCache[key] = material;
            }
            else
                ec_billboard.width = ec_billboard.width * material.map._tundraRatio;
            return material;
        },

        StylizeImage : function(ec_billboard, style, img, text)
        {
            if (!img || img.width === 0 || img.height === 0)
            {
                if (typeof text !== "string")
                {
                    console.error("EC_Billboard_ThreeJs.StylizeImage: null image", img);
                    return null;
                }
            }

            if (EC_Billboard_ThreeJs.Canvas === undefined)
                EC_Billboard_ThreeJs.Canvas = document.createElement("canvas");

            var padding = (typeof style.padding === "number" ? style.padding : 0);
            var w = (padding * 2);
            var h = (padding * 2);

            var ctx = EC_Billboard_ThreeJs.Canvas.getContext("2d");

            if (img)
            {
                w += img.width;
                h += img.height;

                // @todo Allow non rect sizes
                EC_Billboard_ThreeJs.Canvas.width  = 128;
                EC_Billboard_ThreeJs.Canvas.height = 128;
            }
            else
            {
                ctx.font = style.fontSize +  "px serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // Apply font settings
                var metrics = ctx.measureText(text);
                w += metrics.width;
                h += style.fontSize;

                var nearest_pow = function(num)
                {
                    var n = num > 0 ? num - 1 : 0;

                    n |= n >> 1;
                    n |= n >> 2;
                    n |= n >> 4;
                    n |= n >> 8;
                    n |= n >> 16;
                    n++;

                    var other = Math.pow(2,Math.floor(Math.log(num)/Math.log(2)));
                    if ((num - other) < (n - num))
                        return other;
                    return n;
                };

                EC_Billboard_ThreeJs.Canvas.width  = nearest_pow(w);
                EC_Billboard_ThreeJs.Canvas.height = nearest_pow(h);
            }

            ctx.scale(EC_Billboard_ThreeJs.Canvas.width / w, EC_Billboard_ThreeJs.Canvas.height / h);

            ctx.clearRect(0,0, w, h);

            ctx.fillStyle = style.css("background");
            ctx.strokeStyle = style.css("border");
            ctx.lineWidth = style.css("borderWidth");
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            // Background
            ctx.fillRect(0,0, w, h);

            // Border
            ctx.rect(0, 0, w, h);
            ctx.stroke();

            // Image / text
            if (img)
                ctx.drawImage(img, padding, padding);
            else
            {
                ctx.fillStyle = style.css("font");
                ctx.font = style.fontSize +  "px 'Open Sans', sans-serif";
                ctx.textBaseline = "hanging";

                ctx.fillText(text, padding, padding, w - (padding * 2));
            }

            var rendered = new Image();

            var texture = new THREE.Texture(rendered);
            texture.flipY = false;

            try
            {
                rendered.onload = function()
                {
                    texture.repeat.set(-1, 1);
                    texture.offset.set( 1, 0);
                    texture.needsUpdate = true;
                };
                rendered.src = EC_Billboard_ThreeJs.Canvas.toDataURL("image/png");
            }
            catch (e)
            {
                console.error("Failed to draw billboard from '" + img.src + "': " + e.toString());
                return null;
            }

            texture._tundraRatio = w / h;
            if (text)
                ec_billboard.width = ec_billboard.width * texture._tundraRatio;

            return texture;
        },

        LastHovered  : null,
        UpdateSub    : null,

        // ES 2015 feature but supported on all platforms that matter for us: http://caniuse.com/#search=map
        // @todo Update karma or something to get Map into unit tests!
        InstancesMap : (navigator.userAgent.indexOf("PhantomJS") === -1 ? new Map() : {}),

        AddInstance : function(comp)
        {
            var key = comp.parentEntity.id + "." + comp.id;
            this.InstancesMap.set(key, comp);
        },

        RemoveInstance : function(comp)
        {
            var key = comp.parentEntity.id + "." + comp.id;
            this.InstancesMap.delete(key);
        },

        _Limiter : (Tundra.browser.isMobile() ? new FrameLimiter(1/30) : undefined),

        Raycast : function()
        {
            this.Update(1.0);
            return Tundra.renderer.raycast({ targets: this._VisibleSprites, ignoreECModel: true });
        },

        Update : function(frametime)
        {
            if (this._Limiter && !this._Limiter.shouldUpdate(frametime))
                return;

            if (this.InstancesMap.size === 0)
            {
                // Auto unsub updates as there are no more components
                if (this.UpdateSub)
                {
                    Tundra.events.unsubscribe(this.UpdateSub);
                    this.UpdateSub = null;
                }
                return;
            }

            // Preparations
            var activeCameraEnt = Tundra.renderer.activeCameraEntity();
            var activeCamera = (activeCameraEnt != null && activeCameraEnt.camera != null ? activeCameraEnt.camera.camera : null);
            if (activeCamera == null || activeCameraEnt.placeable == null)
                return;

            this._VisibleSprites = [];
            activeCameraEnt.placeable.worldPosition(this._CameraWorldPos);
            activeCameraEnt.camera.getWorldFocusPosition(this._CameraFocusPos);
            this._DistanceFromCameraToFocus = this._CameraWorldPos.distanceToSquared(this._CameraFocusPos);

            // Iterate
            this.InstancesMap.forEach(this._UpdateOne, this);

            // Raycast and execute callbacks
            if (this._VisibleSprites.length > 0)
            {
                var result = Tundra.renderer.raycast({ targets: this._VisibleSprites, ignoreECModel: true });
                if (result.object != null && result.object.tundraBillboard != null)
                {
                    var keyHit = result.object.tundraBillboard.parentEntity.id + "." + result.object.tundraBillboard.id;
                    var keyLastHit = (this.LastHovered && this.LastHovered.parentEntity ?
                        this.LastHovered.parentEntity.id + "." + this.LastHovered.id : "");

                    if (keyLastHit !== keyHit)
                    {
                        // Hover out
                        if (this.LastHovered != null && this.LastHovered.onHoverOut != null)
                        {
                            this.LastHovered.hovered = false;
                            this.LastHovered.onHoverOut(this.LastHovered, result);
                        }

                        this.LastHovered = result.object.tundraBillboard;
                        this.LastHovered.hovered = true;

                        // Hover in
                        if (this.LastHovered.onHoverIn != null)
                            this.LastHovered.onHoverIn(this.LastHovered, result);
                    }
                    return;
                }
            }
            // Hover out
            // No visible ones or raycast did not hit any billboard
            if (this.LastHovered != null)
            {
                if (this.LastHovered.onHoverOut != null)
                {
                    this.LastHovered.hovered = false;
                    this.LastHovered.onHoverOut(this.LastHovered);
                }
                this.LastHovered = null;
            }
        },

        _DistanceFromCameraToFocus : 0.0,
        _VisibleSprites : [],
        _CameraWorldPos : new THREE.Vector3(0,0,0),
        _CameraFocusPos : new THREE.Vector3(0,0,0),
        _TempVector     : new THREE.Vector3(0,0,0),

        _UpdateOne : function(billboard)
        {
            if (!billboard || !billboard.sprite || billboard.visibleOverride === false ||
                (billboard._autoScaleDistanceCloserThan  < 0 &&
                 billboard._autoScaleDistanceFurtherThan < 0 &&
                 billboard._autoHideDistanceFurtherThan  < 0))
            {
                return;
            }
            if (!billboard.worldPosition(this._TempVector))
            {
                billboard.hide(false);
                return;
            }

            // Distance from camera pos to camera focus pos
            if (billboard._autoHideDistanceFurtherThanCameraToFocus > 0 && this._DistanceFromCameraToFocus >= billboard._autoHideDistanceFurtherThanCameraToFocus)
            {
                billboard.hide(false);
                return;
            }

            // Distance from focus pos to bb pos
            var distance = this._CameraFocusPos.distanceToSquared(this._TempVector);
            if (billboard._autoHideDistanceFurtherThan > 0 && distance >= billboard._autoHideDistanceFurtherThan)
            {
                billboard.hide(false);
                return;
            }

            // Distance from focus camera
            distance = this._CameraWorldPos.distanceToSquared(this._TempVector);
            if (billboard._autoHideDistanceFurtherThanFromCamera > 0 && distance >= billboard._autoHideDistanceFurtherThanFromCamera)
            {
                billboard.hide(false);
                return;
            }

            billboard.show(true);

            // Quick non-copy access to attributes, dont modify.
            var attrPos = billboard.attributes.position.value;

            var factor = 1;
            if (billboard._scaleAccordingToDistance < 0)
            {
                if (billboard._autoScaleDistanceCloserThan > 0 && distance < billboard._autoScaleDistanceCloserThan)
                {
                    factor = distance / billboard._autoScaleDistanceCloserThan;
                    if (factor < billboard.autoScaleLimits.x)
                        factor = billboard.autoScaleLimits.x;
                }
                else if (billboard._autoScaleDistanceFurtherThan > 0 && distance > billboard._autoScaleDistanceFurtherThan)
                {
                    factor = distance / billboard._autoScaleDistanceFurtherThan;
                    if (factor > billboard.autoScaleLimits.y)
                        factor = billboard.autoScaleLimits.y;
                }
            }
            else
                factor = Math.sqrt(distance * billboard._scaleAccordingToDistance);

            billboard._autoScalingFactor = factor;

            if (attrPos.y != 0)
                billboard.sprite.position.set(attrPos.x, attrPos.y + (attrPos.y * factor), attrPos.z);
            else
                billboard.sprite.position.set(0,0,0);

            if (factor > 1.0 && !billboard.autoOffset.isZero())
                billboard.sprite.position.add(billboard.autoOffset.clone().multiplyScalar(factor - 1.0));

            billboard._updateSize();

            this._VisibleSprites.push(billboard.sprite);
        }
    },

    isVisible : function()
    {
        return (this.sprite && this.sprite.parent && this.parentEntity && this.parentEntity.placeable ? this.parentEntity.placeable.attributes.visible.value : false);
    },

    clearVisibilityOverride : function()
    {
        this.visibleOverride = true;
    },

    setVisible : function(visible, override)
    {
        if (visible === true || visible === undefined)
            this.show(override);
        else
            this.hide(override);
    },

    show : function(override)
    {
        if (!this.parentEntity.placeable || this.parentEntity.placeable.attributes.visible.value ||
            (this.parentEntity.placeable._animatingVisibility && this.parentEntity.placeable._animatingVisibilityTo === true))
        {
            if (typeof override === "boolean" && override)
                this.visibleOverride = true;
            return;
        }

        // Always when shown the force override is disabled.
        // It is only used when app code wants to permanently hide this billboard.
        this.visibleOverride = true;

        if (this.animation)
            this.animation.stop();
        this.animation = EC_Billboard_ThreeJs.Animator.setVisibilityScaling(this.parentEntity.placeable, true, { skipPlaceableScale : true });
    },

    hide : function(override)
    {
        // PlaceableUtils will invoke hide again while placeable is still hidden
        if (!this.parentEntity.placeable || !this.parentEntity.placeable.attributes.visible.value ||
            (this.parentEntity.placeable._animatingVisibility && this.parentEntity.placeable._animatingVisibilityTo === false))
        {
            if (typeof override === "boolean" && override)
                this.visibleOverride = false;
            return;
        }

        // When override is enabled the automated scaling and show/hide is disabled.
        // When automated logic hides the billboard, override will be false so it can show it back in when in range.
        var prevOverride = this.visibleOverride;
        override = (typeof override === "boolean" ? override : true);
        if (override)
            this.visibleOverride = false;

        if (this.animation)
            this.animation.stop();

        // Only animate if show() has been called previously. Otherwise this is a first hide which should not animate.
        if (this.animation || prevOverride === true)
            this.animation = EC_Billboard_ThreeJs.Animator.setVisibilityScaling(this.parentEntity.placeable, false, { skipPlaceableScale : true });
        else
            this.parentEntity.placeable.attributes.visible.value = false;
    },

    getMaterial : function()
    {
        return (this.sprite != null && this.sprite.material != null ? this.sprite.material : null);
    },

    loadTextSprite : function()
    {
        if (typeof this._text !== "string" || this._text === "")
            return;

        if (this.sprite != null)
        {
            // Up to date
            if (typeof this.sprite.tundraReference === "string" && this.sprite.tundraReference === this._text)
                return;
            // Re-create with new material
            this.reset();
        }
        if (this.sprite == null)
        {
            this.sprite = new THREE.Sprite(EC_Billboard_ThreeJs.GetOrCreateTextMaterial(this, this._text));
            this.sprite.matrixAutoUpdate = false;
            this.sprite.tundraReference = this._text;
            this.sprite.tundraBillboard = this;

            if (this.parentEntity.placeable != null)
                this.parentEntity.placeable.addChild(this.sprite);
            else if (this.subPlaceableCreated === undefined)
                this.subPlaceableCreated = this.parentEntity.onComponentCreated(this, this.onComponentCreated);

            Tundra.renderer.onSceneMeshCreated(this.parentEntity, this, this.sprite);
        }

        this._updatePosition();
        this._updateSize();
        this._updateRotation();

        if (!EC_Billboard_ThreeJs.UpdateSub)
            EC_Billboard_ThreeJs.UpdateSub = Tundra.frame.onUpdate(EC_Billboard_ThreeJs, EC_Billboard_ThreeJs.Update);

        if (this.sprite)
            EC_Billboard_ThreeJs.AddInstance(this);
    },

    loadSprite : function()
    {
        if (this.materialRef === "")
            return;

        /** @todo Implement requesting 'materialRef' and poting it to THREE.SpriteMaterial
            Atm. this component is used from code to set material into a texture reference. */
        var refType = Tundra.asset.resourceTypeForAssetRef(this.materialRef);
        if (refType !== "Texture")
        {
            this.log.warn("Currently only 'Texture' type references are supported for 'materialRef' attribute:", this.materialRef);
            return;
        }
        if (this.sprite != null)
        {
            // Up to date
            if (typeof this.sprite.tundraReference === "string" && this.sprite.tundraReference === this.materialRef)
                return;
            // Re-create with new material
            this.reset();
        }
        if (this.sprite == null)
        {
            this.sprite = new THREE.Sprite(EC_Billboard_ThreeJs.GetOrCreateMaterial(this, this.materialRef));
            this.sprite.matrixAutoUpdate = false;
            this.sprite.tundraReference = this.materialRef;
            this.sprite.tundraBillboard = this;

            if (this.parentEntity.placeable != null)
                this.parentEntity.placeable.addChild(this.sprite);
            else if (this.subPlaceableCreated === undefined)
                this.subPlaceableCreated = this.parentEntity.onComponentCreated(this, this.onComponentCreated);

            Tundra.renderer.onSceneMeshCreated(this.parentEntity, this, this.sprite);
        }

        this._updatePosition();
        this._updateSize();
        this._updateRotation();

        if (!EC_Billboard_ThreeJs.UpdateSub)
            EC_Billboard_ThreeJs.UpdateSub = Tundra.frame.onUpdate(EC_Billboard_ThreeJs, EC_Billboard_ThreeJs.Update);

        if (this.sprite)
            EC_Billboard_ThreeJs.AddInstance(this);
    },

    onComponentCreated : function(ent, comp)
    {
        if (comp.typeId === 20 /*Placeable*/)
        {
            if (this.sprite != null)
                comp.addChild(this.sprite);
            if (this.subPlaceableCreated !== undefined)
            {
                Tundra.events.unsubscribe(this.subPlaceableCreated);
                this.subPlaceableCreated = undefined;
            }
        }
    },

    reset : function()
    {
        // @todo This will break other sprites with the same material. Figure out how to know last usage
        //if (this.getMaterial() != null)
        //    this.getMaterial().dispose();

        // @todo Dispose canvas generated texture

        // Don't dispose the geometry, it is shader among all three sprites.
        if (this.sprite)
            this.sprite.visible = false;
        if (this.sprite && this.sprite.parent)
            this.sprite.parent.remove(this.sprite);
        this.sprite = null;

        EC_Billboard_ThreeJs.RemoveInstance(this);
    },

    update : function()
    {
        this.loadSprite();
    },

    setOverrideScale : function(width, height)
    {
        this._overrideScale.set(width, height);

        if ((this._overrideScale.isZero()) ||
            (this.parentEntity && this.parentEntity.placeable && this.parentEntity.placeable._animatingVisibility) ||
            (this._autoScaleDistanceCloserThan  < 0 &&
             this._autoScaleDistanceFurtherThan < 0 &&
             this._autoHideDistanceFurtherThan  < 0))
        {
            this._updateSize();
        }
    },

    _updatePosition : function()
    {
        if (this.sprite != null)
        {
            this.sprite.position.copy(this.position);

            this.sprite.updateMatrix();
            this.sprite.updateMatrixWorld(true);
        }
    },

    _updateSize : function()
    {
        if (this.sprite != null)
        {
            this.sprite.scale.set(this.attributes.width.value  * this._autoScalingFactor * this._overrideScale.x,
                                  this.attributes.height.value * this._autoScalingFactor * this._overrideScale.y, 1); // flip x-axis to render correctly

            this.sprite.updateMatrix();
            this.sprite.updateMatrixWorld(true);
        }
    },

    _updateRotation : function()
    {
        var material = this.getMaterial();
        if (material != null)
        {
            // @note 180 is the normal upright rotation!
            material.rotation = MathUtils.degToRad(180 + this.rotation);
            material.needsUpdate = true;
        }
    },

    attributeChanged : function(index/*, name, value*/)
    {
        if (index === 0)
            this.loadSprite();
        else if (index === 1)
            this._updatePosition();
        else if (index === 2 || index === 3)
            this._updateSize();
        else if (index === 4)
            this._updateRotation();
        else if (index === 5 && this.sprite)
            this.setVisible(this.attributes.show.value, true);
    },

    worldPosition : function(dest)
    {
        if (this.parentEntity == null || this.parentScene == null)
            return false;
        if (this.parentEntity.placeable != null)
            this.parentEntity.placeable.worldPosition(dest).add(this.attributes.position.value);
        else
            dest.copy(this.attributes.position.value);
        return true;
    }
});

return EC_Billboard_ThreeJs;

}); // require js
