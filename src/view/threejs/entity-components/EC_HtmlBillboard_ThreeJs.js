
define([
        "lib/three",
        "core/framework/Tundra",
        "core/math/MathUtils",
        "entity-components/EC_HtmlBillboard"
    ], function(THREE, Tundra, MathUtils, EC_HtmlBillboard) {

var EC_HtmlBillboard_ThreeJs = EC_HtmlBillboard.$extend(
/** @lends EC_HtmlBillboard_ThreeJs.prototype */
{
    /**
        Renders a HTML element as 3D billboard. Uses CSS scaling and translation for perceived 3D effect.

        @ec_implements EC_HtmlBillboard
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this._element = null;
        Object.defineProperties(this, {
            element : {
                get : function() { return this._element; },
                set : this.setElement.bind(this)
            }
        });

        // Force recalcs
        this._override  = false;
        this._hidden    = true;
        this._rawWidth  = -1;
        this._rawHeight = -1;

        this.hovering = false;
        this.hovertingT = 0.0;

        this.fadeIn = true;
        this.fadeOut = true;
        this.maxDistance = 1000;
        this.minScale = 0;
        this.maxScale = 0;
        this.offset = { x : 0, y : 0 };
        this.scaleAccordingToDistance = 0;
    },

    __classvars__ :
    {
        Implementation : "three.js",

        MinScale    : 0.15,

        UpdateSub : null,

        Update : function(frametime)
        {
            var billboards = Tundra.scene.components(EC_HtmlBillboard.TypeId);
            if (billboards.length === 0)
            {
                // Auto unsub updates as there are no more components
                if (EC_HtmlBillboard_ThreeJs.UpdateSub != null)
                {
                    Tundra.events.unsubscribe(EC_HtmlBillboard_ThreeJs.UpdateSub);
                    EC_HtmlBillboard_ThreeJs.UpdateSub = null;
                }
                return;
            }

            // Preparations
            var activeCameraEnt = Tundra.renderer.activeCameraEntity();
            var activeCamera = (activeCameraEnt != null && activeCameraEnt.camera != null ? activeCameraEnt.camera.camera : null);
            if (activeCamera == null || activeCameraEnt.placeable == null)
                return;

            if (this._sphere === undefined)
                this._sphere = new THREE.Sphere(undefined, 5);
            if (this._projScreenMatrix === undefined)
                this._projScreenMatrix = new THREE.Matrix4();
            if (this._frustum === undefined)
                this._frustum = new THREE.Frustum();

            var containerWidth  = Tundra.client.container.width();
            var containerHeight = Tundra.client.container.height();

            this._projScreenMatrix.multiplyMatrices(activeCamera.projectionMatrix, activeCamera.matrixWorldInverse);
            this._frustum.setFromMatrix(this._projScreenMatrix);

            var cameraWorldPos = activeCameraEnt.placeable.worldPosition();

            var zorder       = [];
            var distance     = 0.0;
            var visible      = false,   currentVisible = false;
            var xScreenSpace = 0.0,     yScreenSpace   = 0.0;
            var top          = 0,       left           = 0;
            var scale        = 0.0;

            // Iterate
            for (var bi = 0; bi < billboards.length; bi++)
            {
                var billboard = billboards[bi];
                if (billboard._element == null)
                    continue;

                currentVisible = (billboard._hidden === false); // billboard._element.is(":visible");
                if (!billboard.worldPosition(this._sphere.center))
                {
                    if (currentVisible)
                        billboard.hide(false);
                    continue;
                }

                /** @todo Translate element pixel size to world units at
                    sphere center and set sphere size accortindly. */
                var visible = this._frustum.intersectsSphere(this._sphere);
                if (visible && billboard.parentEntity.placeable && !billboard.parentEntity.placeable.visible)
                    visible = false;
                if (!visible)
                {
                    if (currentVisible)
                        billboard.hide(false);
                    continue;
                }

                distance = cameraWorldPos.distanceTo(this._sphere.center);
                if (billboard.maxDistance > 0)
                {
                    if (distance > billboard.maxDistance)
                    {
                        if (currentVisible)
                            billboard.hide(false);
                        continue;
                    }
                }

                // z order based on distance
                var zObj = { d : distance, w : billboard._element };
                var zAdded = false;
                for (var zi = 0; zi < zorder.length; zi++)
                {
                    if (distance < zorder[zi].d)
                    {
                        zorder.splice(zi, 0, zObj)
                        zAdded = true;
                        break;
                    }
                }
                if (!zAdded)
                    zorder.push(zObj);

                this._sphere.center.project(activeCamera);
                xScreenSpace = ( this._sphere.center.x + 1) / 2;
                yScreenSpace = (-this._sphere.center.y + 1) / 2;

                if (billboard._cssCache === undefined)
                    billboard._cssCache = { left : -1000, top : -1000, scale : -1000 };

                var raw = billboard._element.get(0);
                var rawWidth = 0, rawHeight = 0;

                // To avoid unnecessary forced recalcs we want to cache these values
                if (billboard._rawWidth < 0)
                    rawWidth = billboard._rawWidth = raw.offsetWidth;
                else
                    rawWidth = billboard._rawWidth;
                if (billboard._rawHeight < 0)
                    rawHeight = billboard._rawHeight = raw.offsetHeight;
                else
                    rawHeight = billboard._rawHeight;

                scale = 1;
                if (distance > 100)
                {
                    if (billboard.scaleAccordingToDistance > 0)
                        scale = 1 - Math.round((distance * billboard.scaleAccordingToDistance) * 10000) / 10000;
                    else
                        scale = Math.round((100 / distance) * 10000) / 10000;

                    if (billboard.minScale > 0 && scale < billboard.minScale)
                        scale = billboard.minScale;
                    else if (billboard.maxScale > 0 && scale > billboard.maxScale)
                        scale = billboard.maxScale;

                    if (scale <= EC_HtmlBillboard_ThreeJs.MinScale)
                    {
                        if (currentVisible)
                            billboard.hide(false);
                        continue;
                    }
                    else if (billboard.attributes.hoverMagnify.value === true)
                    {
                        if (billboard.hovering)
                        {
                            scale = billboard.hoveringScaleIn(frametime, scale);
                            zObj.hovering = true;
                        }
                        else if (billboard.hovertingT >= 0.0)
                        {
                            var scaleOut = billboard.hoveringScaleOut(frametime, scale);
                            if (scaleOut !== undefined)
                            {
                                scale = scaleOut;
                                zObj.hovering = true;
                            }
                        }
                    }
                }
                var scaleDiff = Math.abs(billboard._cssCache.scale - scale);
                if (scaleDiff >= 0.001)
                {
                    //billboard._element.css("transform", "scale(" + scale + "," + scale + ")");
                    raw.style.transform = "scale(" + scale + "," + scale + ")";
                    billboard._cssCache.scale = scale;
                }

                //var widthOffset  = (billboard._element.outerWidth(true)  / 2) + (billboard.offset.x * scale);
                //var heightOffset = (billboard._element.outerHeight(true) / 2) + (billboard.offset.y * scale);
                var widthOffset  = (rawWidth  / 2) + (billboard.offset.x * scale);
                var heightOffset = (rawHeight / 2) + (billboard.offset.y * scale);

                left = Math.round((xScreenSpace * containerWidth  - widthOffset)  * 100) / 100;
                top  = Math.round((yScreenSpace * containerHeight - heightOffset) * 100) / 100;

                var leftDiff = Math.abs(billboard._cssCache.left - left);
                if (leftDiff >= 0.75)
                {
                    //billboard._element.css("left", left);
                    raw.style.left = left + "px";
                    billboard._cssCache.left = left;
                }
                var topDiff = Math.abs(billboard._cssCache.top - top);
                if (topDiff >= 0.75)
                {
                    //billboard._element.css("top",  top);
                    raw.style.top = top + "px";
                    billboard._cssCache.top = top;
                }

                if (!currentVisible)
                    billboard.show(false);
            }
            // @note This range is problematic as they get drawn over other screen elements.
            var zIndex = 100 + zorder.length;
            for (var zi = 0; zi < zorder.length; zi++)
            {
                if (zorder[zi].hovering === true)
                {
                    //zorder[zi].w.css("z-index", 101 + zorder.length);
                    zorder[zi].w.get(0).style.zIndex = (101 + zorder.length).toString();
                }
                else
                {
                    //zorder[zi].w.css("z-index", zIndex);
                    zorder[zi].w.get(0).style.zIndex = zIndex.toString();
                    zIndex--;
                }
            }
        }
    },

    setElement : function(element)
    {
        if (this._element != null)
        {
            this._updateHover(false);
            if (typeof this._element.remove === "function")
                this._element.remove();
        }
        this._element = null;

        if (element == null)
            return;

        // Force recalcs
        this._override  = false;
        this._hidden    = true;
        this._rawWidth  = -1;
        this._rawHeight = -1;

        this._element = $(element);
        this._updateSize();

        // Force parent to Tundra viewport
        this._element.remove();
        Tundra.client.container.append(this._element);

        // Hover has to be connected after added to parent
        this._updateHover();

        // Hide until first update
        this._element.hide();
        this._element.css("position", "absolute");
        this._element.attr("ec-html-billboard", true);

        if (EC_HtmlBillboard_ThreeJs.UpdateSub == null)
            EC_HtmlBillboard_ThreeJs.UpdateSub = Tundra.frame.onUpdate(EC_HtmlBillboard_ThreeJs, EC_HtmlBillboard_ThreeJs.Update);
    },

    setUnselectable : function(enabled)
    {
        if (this._element == null)
            return;

        enabled = (typeof enabled === "boolean" ? enabled : true);
        this._element.css({
            "cursor"         : (enabled ? "pointer" : "auto"),
            "user-select"    : (enabled ? "none" : "text")
        });
    },

    setPointerEvents : function(enabled)
    {
        if (this._element == null)
            return;

        enabled = (typeof enabled === "boolean" ? enabled : true);
        this._element.css("pointer-events", (!enabled ? "none" : ""));
    },

    _updateHover : function(connect)
    {
        if (this._element == null)
            return;

        connect = connect || this.hoverMagnify;
        var connected = this._element.data("HtmlBillboardHoverConnected");
        if (!connect && connected === true)
        {
            this._element.off("mouseenter mouseleave");
            this.hovering = false;
            this._element.data("HtmlBillboardHoverConnected", false);
        }
        else if (connect && (connected === undefined || connected === false))
        {
            this._element.hover(this._onHoverIn.bind(this), this._onHoverOut.bind(this));
            this.hovering = false;
            this._element.data("HtmlBillboardHoverConnected", true);
        }
    },

    _onHoverIn : function()
    {
        this.hovering = true;
        if (this.hovertingT < 0.0)
            this.hovertingT = 0.0;
    },

    _onHoverOut : function()
    {
        this.hovering = false;
        if (this.hovertingT > 1.0)
            this.hovertingT = 1.0;
    },

    hoveringScaleIn : function(frametime, scale)
    {
        if (!this.hovering)
            return scale;
        if (this.hovertingT >= 1.0)
            return 1.0;

        this.hovertingT += frametime * 2;
        if (this.hovertingT > 1.0)
            this.hovertingT = 1.0;
        scale += this.hovertingT;
        this.hovertingScale = MathUtils.lerp(scale, 1.0, this.hovertingT);
        return this.hovertingScale;
    },

    hoveringScaleOut : function(frametime, scale)
    {
        if (this.hovertingT <= 0.0)
            return undefined;
        this.hovertingT -= frametime * 4;
        return MathUtils.lerp(scale, this.hovertingScale, this.hovertingT);
    },

    _updateSize : function()
    {
        if (this._element == null)
            return;
        if (this.size.x >= 0)
            this._element.css("width", this.size.x);
        if (this.size.y >= 0)
            this._element.css("height", this.size.y);
    },

    reset : function()
    {
        this.setElement(null);
    },

    update : function()
    {
    },

    attributeChanged : function(index, name, value)
    {
        if (index === 1)
            this._updateSize()
        else if (index === 2)
            this._updateHover();
    },

    worldPosition : function(dest)
    {
        if (this.parentEntity == null || this.parentScene == null)
            return false;
        if (this.parentEntity.placeable != null)
            this.parentEntity.placeable.worldPosition(dest).add(this.attributes.position.value);
        else
            dest.copy(this.position);
        return true;
    },

    /**
        The update look is optimized to not calculate the size of embedded element on each update.
        This means you cannot change the element text content/size/margins/padding etc. or you might experience
        invalid rendering.

        You know when you modify the embedded element, you should call this function to force style recalculation.
    */
    forceRecalc : function()
    {
        this._rawWidth  = -1;
        this._rawHeight = -1;
    },

    show : function(override)
    {
        if (!this._element)
            return;

        // Override means the distance based show/hide cannot override this show
        if (typeof override !== "boolean")
            override = true;
        if (!override && this._override)
            return;

        // Force recalc of size on hide/show
        this._override  = override;
        this._hidden    = false;
        this._rawWidth  = -1;
        this._rawHeight = -1;

        if (this.fadeIn)
            this._element.fadeIn(500);
        else
            this._element.show();
    },

    hide : function(override)
    {
        if (!this._element)
            return;

        // Override means the distance based show/hide cannot override this hide
        if (typeof override !== "boolean")
            override = true;
        if (!override && this._override)
            return;

        // Force recalc of size on hide/show
        this._override  = override;
        this._hidden    = true;
        this._rawWidth  = -1;
        this._rawHeight = -1;

        if (this.fadeOut)
            this._element.fadeOut(500);
        else
            this._element.hide();
    },

    clearVisibilityOverride : function()
    {
        this._override = false;
    }
});

return EC_HtmlBillboard_ThreeJs;

}); // require js
