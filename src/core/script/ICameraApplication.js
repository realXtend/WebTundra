
define([
        "lib/three",
        "lib/classy",
        "core/framework/Tundra",
        "core/math/EasingCurve",
        "core/script/IApplication"
    ], function(THREE, Class, Tundra, EasingCurve, IApplication) {

var ICameraApplication = IApplication.$extend(
/** @lends ICameraApplication.prototype */
{
    /**
        Interface for creating JavaScript camera logic applications.

        @constructs
        @extends IApplication
        @param {String} name Name of the application.
        @param {Boolean} initIApplication If initializing the camera logic should be done.
        If set to true, calls the IApplication constructor, which in all applications you might not
        want to do at this stage.
    */
    __init__ : function(name, initIApplication)
    {
        if (initIApplication === undefined)
            initIApplication = true;
        if (initIApplication === true)
            this.$super(name);

        this.cameraEntity = null;
        this.cameraApplicationState = {
            applicationName         : "",
            animateActivation       : false,
            animationT              : 0.0,
            animationDuration       : 2.0,
            animationStartTransform : null,
            animationEndTransform   : null,
            previousCameraEntity    : null,
            onUpdateSub             : null,
            animationStart : null,
            animationStop  : null,
            easing : new EasingCurve()
        };
    },

    __classvars__ :
    {
        CollisionsEnabled   : false,
        CollisionDistance   : 1.5,
        CollisionDistanceY  : 1.5,
        CollisionTargets    : [],

        DirectionRays :
        [
            new THREE.Vector3( 0,  0,  1),   // forward
            new THREE.Vector3( 1,  0,  0),   // left
            new THREE.Vector3( 0,  0, -1),   // back
            new THREE.Vector3(-1,  0,  0),   // right
            new THREE.Vector3( 0, -1,  0)    // down

            //new THREE.Vector3( 1, 0,  1),
            //new THREE.Vector3( 1, 0, -1),
            //new THREE.Vector3(-1, 0, -1),
            //new THREE.Vector3(-1, 0,  1)
            //new THREE.Vector3( 0, 1,  0), // up
        ],

        CollisionLastHitDirection : new THREE.Vector3(0,0,0),
        CollisionLastHitPosition  : new THREE.Vector3(0,0,0),
        CollisionLastHitDistance  : -1.0,

        detectCollision : function(checkPosition)
        {
            if (ICameraApplication.CollisionsEnabled !== true || ICameraApplication.CollisionTargets.length === 0)
                return false;
            if (checkPosition == null)
                return false;

            for (var ri=0, rilen=ICameraApplication.DirectionRays.length; ri<rilen; ++ri)
            {
                var dir = ICameraApplication.DirectionRays[ri];
                var result = Tundra.renderer.raycastFrom(checkPosition, dir,
                    { targets: ICameraApplication.CollisionTargets, ignoreECModel: true, recursive: true }
                );
                var minDist = (dir.y === 0 ? ICameraApplication.CollisionDistance : ICameraApplication.CollisionDistanceY);
                if (result.distance > -0.1 && result.distance < minDist)
                {
                    ICameraApplication.CollisionLastHitDirection.copy(dir);
                    ICameraApplication.CollisionLastHitPosition.copy(result.pos);
                    ICameraApplication.CollisionLastHitDistance = result.distance;
                    return true;
                }
            }
            return false;
        },

        collision : function(checkPosition, dir)
        {
            if (ICameraApplication.CollisionTargets.length === 0)
                return -1;
            if (checkPosition == null)
                return -1;

            var result = Tundra.renderer.raycastFrom(checkPosition, dir, 
                { targets: ICameraApplication.CollisionTargets, ignoreECModel: true, recursive: true }
            );
            return result;
        },

        cameraApplicationTooltip : null,

        showCameraApplicationInfoTooltipEnabled : true,

        showCameraApplicationInfoTooltip : function(text, timeoutMsec)
        {
            var loginScreenPlugin = Tundra.plugin("LoginScreenPlugin");
            if (loginScreenPlugin != null && loginScreenPlugin.isLoadingScreenVisible())
                return;
            if (!ICameraApplication.showCameraApplicationInfoTooltipEnabled)
                return;

            if (timeoutMsec === undefined)
                timeoutMsec = 2000;

            if (ICameraApplication.cameraApplicationTooltip == null)
            {
                ICameraApplication.cameraApplicationTooltip = $("<div/>", { id : "webtundra-camera-application-tooltip" });
                ICameraApplication.cameraApplicationTooltip.css(ICameraApplication.cameraTooltipCSS);
                ICameraApplication.cameraApplicationTooltip.position({
                    my: "center top",
                    at: "center-100 top+10",
                    of: Tundra.client.container
                });
                ICameraApplication.cameraApplicationTooltip.hide();

                Tundra.ui.addWidgetToScene(ICameraApplication.cameraApplicationTooltip);
                ICameraApplication.cameraApplicationTooltip.fadeIn();
            }
            // Applications have a way to override this
            var tooltipText = text + " Camera";
            if (ICameraApplication.overrideCameraApplicationInfoTooltipText)
                tooltipText = ICameraApplication.overrideCameraApplicationInfoTooltipText(tooltipText);
            ICameraApplication.cameraApplicationTooltip.text(tooltipText);

            // Cancel existing timeout
            if (ICameraApplication.cameraApplicationTooltip.tooltipTimeoutId !== undefined)
                clearTimeout(ICameraApplication.cameraApplicationTooltip.tooltipTimeoutId);

            // Start new timeout
            ICameraApplication.cameraApplicationTooltip.tooltipTimeoutId = setTimeout(function() {
                if (ICameraApplication.cameraApplicationTooltip != null)
                {
                    ICameraApplication.cameraApplicationTooltip.fadeOut(function() {
                        $(this).remove();
                    });
                    ICameraApplication.cameraApplicationTooltip.tooltipTimeoutId = undefined;
                    ICameraApplication.cameraApplicationTooltip = null;
                }
            }, timeoutMsec);
        },

        overrideCameraApplicationInfoTooltipText : function(text)
        {
            return text;
        },

        cameraTooltipCSS :
        {
            "border"           : "1px solid grey",
            "text-align"       : "center",
            "min-width"        : 200,
            "border-radius"    : 4,
            "padding"          : 3,
            "padding-left"     : 5,
            "padding-right"    : 5,
            "position"         : "absolute",
            "width"            : "auto",
            "font-family"      : "Arial",
            "font-size"        : "14pt",
            "font-weight"      : "bold",
            "color"            : "color: rgb(56,56,56)",
            "background-color" : "rgba(248, 248, 248, 0.85)"
        }
    },

    _onScriptDestroyed : function()
    {
        this.$super();

        this.resetCameraApplication();
    },

    /**
        Starts the camera application. Creating a local camera entity if not created yet.

        @param {String} applicationName
        @param {String} entityName
        @param {Number} verticalFov
        @param {Boolean} [addToUserInterfaceSwitcher=false]
        @return {Entity} Camera entity.
    */
    startCameraApplication : function(applicationName, entityName, verticalFov, addToUserInterfaceSwitcher)
    {
        if (applicationName === undefined)
        {
            console.error("[ICameraApplication]: createCameraEntity must pass applicationName e.g. 'Avatar' and entity name e.g. 'AvatarCamera'!")
            return;
        }
        if (addToUserInterfaceSwitcher === undefined)
            addToUserInterfaceSwitcher = true;

        if (this.cameraEntity == null)
            this.cameraEntity = Tundra.scene.createLocalEntity(["Name", "Placeable", "Camera", "SoundListener"]);
        else
        {
            this.cameraEntity.replicated = false;
            this.cameraEntity.local = true;

            // Entity already set, this is unusual but acceptable.
            // Make sure the needed components are there as local.
            this.cameraEntity.getOrCreateLocalComponent("Placeable");
            this.cameraEntity.getOrCreateLocalComponent("Camera");
            this.cameraEntity.getOrCreateLocalComponent("SoundListener");
        }

        this.cameraApplicationState.applicationName = applicationName;
        this.cameraEntity.name = entityName;

        if (verticalFov !== undefined && typeof verticalFov === "number")
            this.cameraEntity.camera.verticalFov = verticalFov;

        this.subscribeEvent(Tundra.renderer.onActiveCameraChanged(this, this._onActiveCameraChanged));

        if (addToUserInterfaceSwitcher === true)
        {
            try
            {
                Tundra.client.registerCameraApplication(applicationName, this);
            }
            catch(e)
            {
                console.error(e.stack || e);
            }
        }

        return this.cameraEntity;
    },

    /**
        Set vertical fov
        @param {Number} verticalFov
    */
    setVerticalFov : function(verticalFov)
    {
        if (this.cameraEntity == null || this.cameraEntity.camera == null)
            return;

        if (verticalFov !== undefined && typeof verticalFov === "number")
            this.cameraEntity.camera.verticalFov = verticalFov;
    },

    resetCameraApplication : function()
    {
        this._subCameraAnimationFrameUpdates(true);
        this.cameraEntity = null;
    },

    /**
        Set if camera should be animated from previous camera when activated
        @param {Boolean} animate
    */
    animateBeforeActivation : function(animate)
    {
        if (typeof animate === "boolean")
            this.cameraApplicationState.animateActivation = animate;
    },

    _subCameraAnimationFrameUpdates : function(unsubOnly)
    {
        if (unsubOnly === undefined)
            unsubOnly = false;

        if (this.cameraApplicationState.onUpdateSub != null)
            Tundra.events.unsubscribe(this.cameraApplicationState.onUpdateSub);

        if (unsubOnly === false)
            this.cameraApplicationState.onUpdateSub = Tundra.frame.onUpdate(this, this._onCameraAnimationUpdate);
        else if (this.cameraEntity != null && this.cameraEntity.camera != null)
            this.cameraEntity.camera._animating = false;
    },

    _onCameraStepAnimation : function(t)
    {
        var state = this.cameraApplicationState;

        var pos = state.animationStart.pos.clone();
        pos.lerp(state.animationStop.pos.clone(), t);

        var quat = state.animationStart.rot.clone();
        quat.slerp(state.animationStop.rot.clone(), t);
        quat.normalize();

        this.cameraEntity.placeable.setWorldPosition(pos);
        this.cameraEntity.placeable.setWorldOrientation(quat);
    },

    _onCameraAnimationUpdate : function(frametime)
    {
        var state = this.cameraApplicationState;

        if (state.animationT < state.animationDuration)
        {
            var t = state.easing.getTime(state.animationT / state.animationDuration);
            this._onCameraStepAnimation(t);

            state.animationT += frametime;
        }
        else
        {
            this._onCameraStepAnimation(1.0);
            this._subCameraAnimationFrameUpdates(true);

            this.onCameraActivated(this.cameraEntity, state.previousCameraEntity);

            state.animationT = 0.0;
            state.previousCameraEntity = null;
            state.animationStart = null;
            state.animationStop = null;
            return;
        }
    },

    _activateCameraApplication : function()
    {
        if (this.cameraEntity != null && this.cameraEntity.camera != null)
            this.cameraEntity.camera.setActive();
    },

    _onActiveCameraChanged : function(activatedCameraComponent, previousCameraComponent)
    {
        if (activatedCameraComponent === undefined || activatedCameraComponent === null)
            return;

        if (activatedCameraComponent === this.cameraEntity.camera)
            this._onCameraActivated(this.cameraEntity, (previousCameraComponent !== undefined ? previousCameraComponent.parentEntity : undefined));
        else if (previousCameraComponent === this.cameraEntity.camera)
        {
            this._subCameraAnimationFrameUpdates(true);
            this.onCameraDeactivated(this.cameraEntity, activatedCameraComponent.parentEntity);
        }
    },

    _onCameraActivated : function(cameraEntity, previousCameraEntity)
    {
        ICameraApplication.showCameraApplicationInfoTooltip(this.cameraApplicationState.applicationName);

        // We can only animate if previous camera entity has a valid placeable
        if (this.cameraApplicationState.animateActivation === false || previousCameraEntity == null ||
            previousCameraEntity.placeable == null || cameraEntity.placeable == null)
            this.onCameraActivated(cameraEntity, previousCameraEntity);
        else
        {
            // Currently auto animating is disabled
            //this.onCameraActivated(cameraEntity, previousCameraEntity);

            this.cameraApplicationState.animationT = 0.0;
            this.cameraApplicationState.previousCameraEntity = previousCameraEntity;

            this.cameraApplicationState.animationStart =
            {
                pos : previousCameraEntity.placeable.worldPosition(),
                rot : previousCameraEntity.placeable.worldOrientation(),
            };
            this.cameraApplicationState.animationStop =
            {
                pos         : cameraEntity.placeable.worldPosition(),
                rot         : cameraEntity.placeable.worldOrientation()
            };

            /*console.log(" ");
            console.log("START", previousCameraEntity.placeable.transform.rot.toString()); //this.cameraApplicationState.animationStart.rot.toString());
            console.log("END  ", cameraEntity.placeable.transform.rot.toString());*/

            // Set start position and rotation
            cameraEntity.placeable.setWorldPosition(this.cameraApplicationState.animationStart.pos);
            cameraEntity.placeable.setWorldOrientation(this.cameraApplicationState.animationStart.rot);
            cameraEntity.camera._animating = true;

            this._subCameraAnimationFrameUpdates(false);
        }
    },

    onCameraActivated : function(cameraEntity, previousCameraEntity)
    {
        /// Implementation overrides.
    },

    onCameraDeactivated : function(cameraEntity, activatedCameraEntity)
    {
        /// Implementation overrides.
    }
});

// Global scope exposure of applications that do not use requirejs
window.ICameraApplication = ICameraApplication;

return ICameraApplication;

}); // require js
