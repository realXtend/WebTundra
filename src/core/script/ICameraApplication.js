
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/math/EasingCurve",
        "core/script/IApplication"
    ], function(Class, TundraSDK, EasingCurve, IApplication) {

/**
    Inteface for creating JavaScript camera logic applications.

    @class ICameraApplication
    @extends IApplication
    @constructor
    @param {String} name Name of the application.
    @param {Boolean} initIApplication If intiailizing the camera logic should be done.
    If set to true, calls the IApplication constructor, which in all apps you might not
    want to do at this stage.
*/
var ICameraApplication = IApplication.$extend(
{
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
        cameraApplicationTooltip : null,

        showCameraApplicationInfoTooltipEnabled : true,

        showCameraApplicationInfoTooltip : function(text, timeoutMsec)
        {
            var loginScreenPlugin = TundraSDK.plugin("LoginScreenPlugin");
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
                    of: TundraSDK.framework.client.container
                });
                ICameraApplication.cameraApplicationTooltip.hide();

                TundraSDK.framework.ui.addWidgetToScene(ICameraApplication.cameraApplicationTooltip);
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

        cameraTooltipCSS : {
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

    startCameraApplication : function(applicationName, entityName, verticalFov, addToUserInterfaceSwitcher)
    {
        if (applicationName === undefined)
        {
            console.error("[ICameraApplication]: createCameraEntity must pass applicationName eg. 'Avatar' and entity name eg. 'AvatarCamera'!")
            return;
        }
        if (addToUserInterfaceSwitcher === undefined)
            addToUserInterfaceSwitcher = true;

        if (this.cameraEntity == null)
        {
            this.cameraApplicationState.applicationName = applicationName;

            this.cameraEntity = TundraSDK.framework.scene.createLocalEntity(["Name", "Placeable", "Camera"]);
            this.cameraEntity.name = entityName;

            if (verticalFov !== undefined && typeof verticalFov === "number")
                this.cameraEntity.camera.verticalFov = verticalFov;

            this.subscribeEvent(TundraSDK.framework.renderer.onActiveCameraChanged(this, this._onActiveCameraChanged));

            if (addToUserInterfaceSwitcher === true)
                TundraSDK.framework.client.registerCameraApplication(applicationName, this);
        }
        return this.cameraEntity;
    },

    resetCameraApplication : function()
    {
        this._subCameraAnimationFrameUpdates(true);
        this.cameraEntity = null;
    },

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
            TundraSDK.framework.events.unsubscribe(this.cameraApplicationState.onUpdateSub);

        if (unsubOnly === false)
            this.cameraApplicationState.onUpdateSub = TundraSDK.framework.frame.onUpdate(this, this._onCameraAnimationUpdate);
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

        this.cameraEntity.placeable.setPosition(pos);
        this.cameraEntity.placeable.setRotation(quat);

        /** This is a hack to set the same degree angle vector to transform that
            was set before we started  animating. Using the final quat to do this
            breaks rotation (sometimes flips -180/180 to z-axis). */
        if (t >= 1)
            this.cameraEntity.placeable.setRotation(state.animationStop.rotDegrees);
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

            this.onCameraActived(this.cameraEntity, state.previousCameraEntity);

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
            this._onCameraActived(this.cameraEntity, (previousCameraComponent !== undefined ? previousCameraComponent.parentEntity : undefined));
        else if (previousCameraComponent === this.cameraEntity.camera)
        {
            this._subCameraAnimationFrameUpdates(true);
            this.onCameraDeactived(this.cameraEntity, activatedCameraComponent.parentEntity);
        }
    },

    _onCameraActived : function(cameraEntity, previousCameraEntity)
    {
        ICameraApplication.showCameraApplicationInfoTooltip(this.cameraApplicationState.applicationName);

        // We can only animate if previous camera entity has a valid placeable
        if (this.cameraApplicationState.animateActivation === false || previousCameraEntity == null || 
            previousCameraEntity.placeable == null || cameraEntity.placeable == null)
            this.onCameraActived(cameraEntity, previousCameraEntity);
        else
        {
            // Animations not implemented if one of the cameras are parented!
            if (typeof cameraEntity.placeable.parentRef !== "string" || typeof previousCameraEntity.placeable.parentRef !== "string" ||
                cameraEntity.placeable.parentRef !== "" || previousCameraEntity.placeable.parentRef !== "")
            {
                this.onCameraActived(cameraEntity, previousCameraEntity);
                return;
            }

            // Currently auto animating is disabled
            //this.onCameraActived(cameraEntity, previousCameraEntity);

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
                rot         : cameraEntity.placeable.worldOrientation(),
                rotDegrees  : cameraEntity.placeable.transform.rot.clone()
            };

            /*console.log(" ");
            console.log("START", previousCameraEntity.placeable.transform.rot.toString()); //this.cameraApplicationState.animationStart.rot.toString());
            console.log("END  ", cameraEntity.placeable.transform.rot.toString());*/

            // Set start position and rotation
            cameraEntity.placeable.setPosition(this.cameraApplicationState.animationStart.pos);
            cameraEntity.placeable.setRotation(this.cameraApplicationState.animationStart.rot);
            cameraEntity.camera._animating = true;

            this._subCameraAnimationFrameUpdates(false);
        }
    },

    onCameraActived : function(cameraEntity, previousCameraEntity)
    {
        /// Implementation overrides.
    },

    onCameraDeactived : function(cameraEntity, activatedCameraEntity)
    {
        /// Implementation overrides.
    }
});

// Global scope exposure of applications that do not use requirejs
window.ICameraApplication = ICameraApplication;

return ICameraApplication;

}); // require js
